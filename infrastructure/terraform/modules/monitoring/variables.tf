# Terraform variables definition file for monitoring infrastructure
# Version: 1.0
# Provider compatibility: terraform ~> 1.0

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "prometheus_config" {
  type = object({
    version = string
    scrape_configs = list(object({
      job_name        = string
      scrape_interval = string
      static_configs  = list(map(any))
      metrics_path    = optional(string)
      scheme         = optional(string)
    }))
    resource_limits = object({
      cpu_request     = string
      cpu_limit       = string
      memory_request  = string
      memory_limit    = string
    })
    security_context = object({
      run_as_user     = number
      run_as_group    = number
      fs_group        = number
      read_only_root  = bool
    })
    alert_rules = list(object({
      name         = string
      expr         = string
      for_duration = string
      severity     = string
      labels       = map(string)
      annotations  = map(string)
    }))
  })
  description = "Prometheus server configuration including scraping, resources, security, and alerting rules"
}

variable "grafana_config" {
  type = object({
    version = string
    datasources = list(object({
      name      = string
      type      = string
      url       = string
      access    = string
      is_default = bool
    }))
    dashboards = list(object({
      name         = string
      folder       = string
      json_file    = string
      datasource   = string
      variables    = map(any)
    }))
    auth_config = object({
      auth_type    = string
      oauth_config = optional(map(string))
      ldap_config  = optional(map(string))
      admin_user   = string
      admin_password_secret = string
    })
    plugins = list(string)
  })
  description = "Grafana configuration including datasources, dashboards, authentication, and plugins"
}

variable "alertmanager_config" {
  type = object({
    version = string
    route_config = object({
      group_by       = list(string)
      group_wait     = string
      group_interval = string
      repeat_interval = string
      receiver       = string
    })
    receivers = list(object({
      name          = string
      email_configs = optional(list(map(string)))
      slack_configs = optional(list(map(string)))
      webhook_configs = optional(list(map(string)))
      pagerduty_configs = optional(list(map(string)))
    }))
    inhibit_rules = list(object({
      source_match  = map(string)
      target_match  = map(string)
      equal         = list(string)
    }))
  })
  description = "AlertManager configuration for notification routing and alert management"
}

variable "retention_config" {
  type = object({
    metrics_retention = string
    storage_size     = string
    backup_config = object({
      enabled        = bool
      schedule       = string
      retention_days = number
      storage_class  = string
      bucket_name    = string
    })
  })
  description = "Configuration for metrics retention, storage, and backup policies"
}

variable "security_config" {
  type = object({
    tls_config = object({
      enabled        = bool
      cert_secret    = string
      key_secret     = string
      ca_secret      = optional(string)
      min_tls_version = string
    })
    rbac_config = object({
      create_role     = bool
      create_binding  = bool
      service_account = string
      role_rules     = list(map(any))
    })
    network_policy = object({
      enabled             = bool
      ingress_cidr_blocks = list(string)
      egress_cidr_blocks  = list(string)
      ingress_namespaces  = list(string)
    })
  })
  description = "Security-related configurations including TLS, RBAC, and network policies"

  validation {
    condition     = var.security_config.tls_config.enabled ? can(regex("^TLS[0-9].[0-9]$", var.security_config.tls_config.min_tls_version)) : true
    error_message = "When TLS is enabled, min_tls_version must be in format TLSx.y (e.g., TLS1.2)."
  }
}

variable "monitoring_namespace" {
  type        = string
  description = "Kubernetes namespace for monitoring components"
  default     = "monitoring"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for monitoring infrastructure"
  default     = {}
}

variable "enable_service_monitor" {
  type        = bool
  description = "Enable ServiceMonitor CRD for automatic service discovery"
  default     = true
}

variable "enable_pod_monitor" {
  type        = bool
  description = "Enable PodMonitor CRD for automatic pod discovery"
  default     = true
}

variable "enable_prometheus_rules" {
  type        = bool
  description = "Enable PrometheusRule CRD for custom alerting rules"
  default     = true
}