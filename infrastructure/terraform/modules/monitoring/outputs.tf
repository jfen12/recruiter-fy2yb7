# Output definitions for monitoring infrastructure components
# Version: 1.0
# Provider compatibility: terraform ~> 1.0

# Expose monitoring namespace details
output "monitoring_namespace" {
  description = "The Kubernetes namespace where monitoring components are deployed"
  value = {
    name = kubernetes_namespace.monitoring.metadata[0].name
  }
}

# Expose Prometheus service endpoint details
output "prometheus_endpoint" {
  description = "Prometheus service endpoint information for metric collection"
  value = {
    url  = "http://${helm_release.prometheus.name}-server.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
    port = 9090
  }
  sensitive = false
}

# Expose Grafana service endpoint details
output "grafana_endpoint" {
  description = "Grafana service endpoint information for dashboard access"
  value = {
    url  = "http://${helm_release.grafana.name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
    port = 3000
  }
  sensitive = false
}

# Expose AlertManager service endpoint details
output "alertmanager_endpoint" {
  description = "AlertManager service endpoint information for alert management"
  value = {
    url  = "http://${helm_release.alertmanager.name}.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
    port = 9093
  }
  sensitive = false
}

# Expose version information for all monitoring components
output "monitoring_versions" {
  description = "Version information for deployed monitoring components"
  value = {
    prometheus    = helm_release.prometheus.version
    grafana      = helm_release.grafana.version
    alertmanager = helm_release.alertmanager.version
  }
}

# Expose deployment status of monitoring components
output "monitoring_status" {
  description = "Deployment status of monitoring stack components"
  value = {
    prometheus_status    = helm_release.prometheus.status
    grafana_status      = helm_release.grafana.status
    alertmanager_status = helm_release.alertmanager.status
  }
}

# Expose monitoring stack configuration details
output "monitoring_configuration" {
  description = "Configuration details of the monitoring stack"
  value = {
    service_monitor_enabled = var.enable_service_monitor
    pod_monitor_enabled    = var.enable_pod_monitor
    prometheus_rules_enabled = var.enable_prometheus_rules
    metrics_retention      = var.retention_config.metrics_retention
    storage_size          = var.retention_config.storage_size
  }
  sensitive = false
}

# Expose security configuration status
output "security_status" {
  description = "Security configuration status for monitoring components"
  value = {
    tls_enabled     = var.security_config.tls_config.enabled
    rbac_enabled    = var.security_config.rbac_config.create_role
    network_policy_enabled = var.security_config.network_policy.enabled
  }
  sensitive = false
}

# Expose backup configuration status
output "backup_configuration" {
  description = "Backup configuration status for monitoring data"
  value = {
    enabled         = var.retention_config.backup_config.enabled
    schedule        = var.retention_config.backup_config.schedule
    retention_days  = var.retention_config.backup_config.retention_days
    storage_class   = var.retention_config.backup_config.storage_class
  }
  sensitive = false
}