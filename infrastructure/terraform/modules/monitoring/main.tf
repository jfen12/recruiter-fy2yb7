# Main Terraform configuration for monitoring infrastructure
# Version: 1.0
# Provider requirements and configuration

terraform {
  required_version = "~> 1.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Create dedicated namespace for monitoring components with resource quotas
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = var.monitoring_namespace
    labels = merge({
      "app.kubernetes.io/name"       = "monitoring"
      "app.kubernetes.io/component"  = "infrastructure"
      "app.kubernetes.io/managed-by" = "terraform"
      "environment"                  = var.environment
    }, var.tags)
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Create namespace resource quotas
resource "kubernetes_resource_quota" "monitoring_quota" {
  metadata {
    name      = "monitoring-quota"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = "8"
      "requests.memory" = "16Gi"
      "limits.cpu"      = "16"
      "limits.memory"   = "32Gi"
      "pods"           = "50"
    }
  }
}

# Deploy Prometheus using Helm
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus"
  version    = var.prometheus_config.version
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    templatefile("${path.module}/templates/prometheus-values.yaml", {
      scrape_configs    = var.prometheus_config.scrape_configs
      resource_limits   = var.prometheus_config.resource_limits
      security_context  = var.prometheus_config.security_context
      alert_rules      = var.prometheus_config.alert_rules
      retention_config = var.retention_config
      security_config  = var.security_config
    })
  ]

  set {
    name  = "serviceMonitor.enabled"
    value = var.enable_service_monitor
  }

  set {
    name  = "podMonitor.enabled"
    value = var.enable_pod_monitor
  }

  depends_on = [kubernetes_namespace.monitoring]
}

# Deploy Grafana using Helm
resource "helm_release" "grafana" {
  name       = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  version    = var.grafana_config.version
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    templatefile("${path.module}/templates/grafana-values.yaml", {
      datasources     = var.grafana_config.datasources
      dashboards      = var.grafana_config.dashboards
      auth_config     = var.grafana_config.auth_config
      plugins         = var.grafana_config.plugins
      security_config = var.security_config
    })
  ]

  set_sensitive {
    name  = "admin.password"
    value = var.grafana_config.auth_config.admin_password_secret
  }

  depends_on = [helm_release.prometheus]
}

# Deploy AlertManager using Helm
resource "helm_release" "alertmanager" {
  name       = "alertmanager"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "alertmanager"
  version    = var.alertmanager_config.version
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    templatefile("${path.module}/templates/alertmanager-values.yaml", {
      route_config   = var.alertmanager_config.route_config
      receivers      = var.alertmanager_config.receivers
      inhibit_rules = var.alertmanager_config.inhibit_rules
      security_config = var.security_config
    })
  ]

  depends_on = [helm_release.prometheus]
}

# Create network policies for monitoring components
resource "kubernetes_network_policy" "monitoring" {
  count = var.security_config.network_policy.enabled ? 1 : 0

  metadata {
    name      = "monitoring-network-policy"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  spec {
    pod_selector {
      match_labels = {
        "app.kubernetes.io/name" = "monitoring"
      }
    }

    ingress {
      from {
        namespace_selector {
          match_labels = {
            for namespace in var.security_config.network_policy.ingress_namespaces : namespace => "true"
          }
        }
      }
      ports {
        port     = "9090"
        protocol = "TCP"
      }
      ports {
        port     = "3000"
        protocol = "TCP"
      }
      ports {
        port     = "9093"
        protocol = "TCP"
      }
    }

    egress {
      to {
        ip_block {
          cidr = each.value
          for_each = toset(var.security_config.network_policy.egress_cidr_blocks)
        }
      }
    }

    policy_types = ["Ingress", "Egress"]
  }
}

# Create RBAC resources if enabled
resource "kubernetes_role" "monitoring" {
  count = var.security_config.rbac_config.create_role ? 1 : 0

  metadata {
    name      = "monitoring-role"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  dynamic "rule" {
    for_each = var.security_config.rbac_config.role_rules
    content {
      api_groups = rule.value.api_groups
      resources  = rule.value.resources
      verbs      = rule.value.verbs
    }
  }
}

resource "kubernetes_role_binding" "monitoring" {
  count = var.security_config.rbac_config.create_binding ? 1 : 0

  metadata {
    name      = "monitoring-role-binding"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.monitoring[0].metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = var.security_config.rbac_config.service_account
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  depends_on = [kubernetes_role.monitoring]
}

# Create persistent volumes for monitoring data if enabled
resource "kubernetes_persistent_volume_claim" "prometheus_data" {
  count = var.retention_config.backup_config.enabled ? 1 : 0

  metadata {
    name      = "prometheus-data"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = var.retention_config.storage_size
      }
    }
    storage_class_name = var.retention_config.backup_config.storage_class
  }
}