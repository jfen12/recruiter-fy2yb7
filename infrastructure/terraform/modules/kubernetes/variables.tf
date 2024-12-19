# Cluster Configuration
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must start with a letter and can only contain alphanumeric characters and hyphens."
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.24"
  validation {
    condition     = can(regex("^1\\.(2[3-4])$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.23 or 1.24"
  }
}

# Node Group Configuration
variable "node_groups" {
  description = "Configuration for EKS node groups"
  type = map(object({
    instance_types = list(string)
    min_size      = number
    max_size      = number
    desired_size  = number
    disk_size     = number
    labels        = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))

  default = {
    web = {
      instance_types = ["t3.medium"]
      min_size      = 2
      max_size      = 10
      desired_size  = 2
      disk_size     = 50
      labels = {
        role = "web"
      }
      taints = []
    }
    api = {
      instance_types = ["t3.large"]
      min_size      = 3
      max_size      = 15
      desired_size  = 3
      disk_size     = 50
      labels = {
        role = "api"
      }
      taints = []
    }
    worker = {
      instance_types = ["t3.medium"]
      min_size      = 2
      max_size      = 8
      desired_size  = 2
      disk_size     = 50
      labels = {
        role = "worker"
      }
      taints = []
    }
  }

  validation {
    condition     = alltrue([for ng in var.node_groups : ng.min_size <= ng.desired_size && ng.desired_size <= ng.max_size])
    error_message = "For each node group, min_size must be <= desired_size <= max_size."
  }
}

# Networking Configuration
variable "vpc_id" {
  description = "ID of the VPC where the EKS cluster will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for EKS node groups"
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least 2 private subnets are required for high availability."
  }
}

# Cluster Features
variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler for node groups"
  type        = bool
  default     = true
}

variable "cluster_logging" {
  description = "EKS control plane logging configuration"
  type = object({
    enabled        = bool
    types          = list(string)
    retention_days = number
  })
  default = {
    enabled        = true
    types          = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
    retention_days = 30
  }

  validation {
    condition     = var.cluster_logging.retention_days >= 1 && var.cluster_logging.retention_days <= 365
    error_message = "Log retention days must be between 1 and 365."
  }
}

variable "cluster_encryption_config" {
  description = "EKS cluster encryption configuration"
  type = object({
    enabled                  = bool
    kms_key_deletion_window = number
  })
  default = {
    enabled                  = true
    kms_key_deletion_window = 7
  }

  validation {
    condition     = var.cluster_encryption_config.kms_key_deletion_window >= 7 && var.cluster_encryption_config.kms_key_deletion_window <= 30
    error_message = "KMS key deletion window must be between 7 and 30 days."
  }
}

# Resource Tags
variable "tags" {
  description = "Tags to be applied to all resources"
  type        = map(string)
  default = {
    Project     = "RefactorTrack"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}

# Add-ons Configuration
variable "cluster_addons" {
  description = "Configuration for EKS cluster add-ons"
  type = object({
    vpc_cni = object({
      enabled = bool
      version = string
    })
    coredns = object({
      enabled = bool
      version = string
    })
    kube_proxy = object({
      enabled = bool
      version = string
    })
  })
  default = {
    vpc_cni = {
      enabled = true
      version = "v1.12.0"
    }
    coredns = {
      enabled = true
      version = "v1.8.7"
    }
    kube_proxy = {
      enabled = true
      version = "v1.24.7"
    }
  }
}

# IRSA Configuration
variable "service_accounts" {
  description = "IAM roles for service accounts configuration"
  type = map(object({
    namespace = string
    name      = string
    policy_arns = list(string)
  }))
  default = {
    cluster_autoscaler = {
      namespace    = "kube-system"
      name         = "cluster-autoscaler"
      policy_arns  = ["arn:aws:iam::aws:policy/AutoScalingFullAccess"]
    }
  }
}

# Security Group Configuration
variable "cluster_security_group_rules" {
  description = "Additional security group rules for the EKS cluster"
  type = list(object({
    description = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    type        = string
  }))
  default = [
    {
      description = "Allow all outbound traffic"
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      type        = "egress"
    }
  ]
}