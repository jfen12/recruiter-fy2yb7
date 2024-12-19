# Environment configuration
variable "environment" {
  description = "Deployment environment for the infrastructure"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# AWS Region configurations
variable "aws_region" {
  description = "Primary AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "secondary_aws_region" {
  description = "Secondary AWS region for high availability and disaster recovery"
  type        = string
  default     = "us-west-2"
}

# Network configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.vpc_cidr))
    error_message = "VPC CIDR block must be a valid IPv4 CIDR range."
  }
}

# Database configurations
variable "database_config" {
  description = "Configuration for database services"
  type = object({
    postgresql = object({
      instance_class = string
      version       = string
      storage_gb    = number
    })
    mongodb = object({
      instance_class = string
      version       = string
      shard_count   = number
    })
    elasticsearch = object({
      instance_type = string
      version      = string
      domain_name  = string
    })
    redis = object({
      node_type            = string
      version             = string
      cluster_mode_enabled = bool
    })
  })
  default = {
    postgresql = {
      instance_class = "db.r6g.xlarge"
      version       = "15.3"
      storage_gb    = 100
    }
    mongodb = {
      instance_class = "db.r6g.xlarge"
      version       = "6.0"
      shard_count   = 3
    }
    elasticsearch = {
      instance_type = "r6g.xlarge.elasticsearch"
      version      = "8.0"
      domain_name  = "refactortrack-search"
    }
    redis = {
      node_type            = "cache.r6g.large"
      version             = "7.0"
      cluster_mode_enabled = true
    }
  }
}

# Kubernetes (EKS) configuration
variable "kubernetes_config" {
  description = "EKS cluster configuration"
  type = object({
    cluster_version = string
    node_groups = map(object({
      instance_types = list(string)
      scaling_config = object({
        desired_size = number
        max_size     = number
        min_size     = number
      })
      labels = map(string)
    }))
    addons = list(string)
  })
  default = {
    cluster_version = "1.27"
    node_groups = {
      general = {
        instance_types = ["m6g.xlarge"]
        scaling_config = {
          desired_size = 3
          max_size     = 10
          min_size     = 2
        }
        labels = {
          role = "general"
        }
      }
    }
    addons = ["vpc-cni", "coredns", "kube-proxy"]
  }
}

# Monitoring configuration
variable "monitoring_config" {
  description = "Monitoring and observability configuration"
  type = object({
    prometheus = object({
      retention_days = number
      storage_gb    = number
    })
    grafana = object({
      version        = string
      admin_password = string
    })
    alertmanager = object({
      slack_webhook   = string
      pagerduty_key  = string
    })
  })
  sensitive = true
}

# Backup configuration
variable "backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 7
    error_message = "Backup retention must be at least 7 days."
  }
}

# Resource tagging
variable "tags" {
  description = "Resource tags for cost allocation and organization"
  type        = map(string)
  default = {
    Project     = "RefactorTrack"
    ManagedBy   = "Terraform"
    Environment = "var.environment"
  }
}