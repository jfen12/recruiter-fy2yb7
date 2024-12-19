# AWS Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Environment variable with validation
variable "environment" {
  description = "Deployment environment for the database infrastructure"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# Network configuration variables
variable "vpc_id" {
  description = "ID of the VPC where database resources will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for database deployment"
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnets are required for high availability."
  }
}

# PostgreSQL configuration
variable "postgresql_config" {
  description = "PostgreSQL Aurora cluster configuration settings"
  type = object({
    instance_class     = string
    engine_version     = string
    allocated_storage  = number
    replica_count      = number
  })

  validation {
    condition     = can(regex("^db\\.r[5-6]\\.\\w+$", var.postgresql_config.instance_class))
    error_message = "PostgreSQL instance class must be memory-optimized (r5 or r6 family)"
  }

  validation {
    condition     = var.postgresql_config.allocated_storage >= 100
    error_message = "Minimum storage allocation is 100GB"
  }

  validation {
    condition     = var.environment == "production" ? var.postgresql_config.replica_count >= 2 : true
    error_message = "Production environment requires at least 2 replicas"
  }
}

# MongoDB configuration
variable "mongodb_config" {
  description = "MongoDB DocumentDB cluster configuration settings"
  type = object({
    instance_class = string
    engine_version = string
    shard_count    = number
  })

  validation {
    condition     = can(regex("^db\\.r[5-6]\\.\\w+$", var.mongodb_config.instance_class))
    error_message = "MongoDB instance class must be memory-optimized (r5 or r6 family)"
  }

  validation {
    condition     = var.environment == "production" ? var.mongodb_config.shard_count >= 2 : true
    error_message = "Production environment requires at least 2 shards"
  }
}

# Elasticsearch configuration
variable "elasticsearch_config" {
  description = "Elasticsearch domain configuration settings"
  type = object({
    instance_type  = string
    version        = string
    instance_count = number
    volume_size    = number
  })

  validation {
    condition     = can(regex("^[cm][5-6]\\.\\w+\\.elasticsearch$", var.elasticsearch_config.instance_type))
    error_message = "Elasticsearch instance type must be compute or memory-optimized (c5/c6/m5/m6 family)"
  }

  validation {
    condition     = var.environment == "production" ? var.elasticsearch_config.instance_count >= 3 : var.elasticsearch_config.instance_count >= 2
    error_message = "Production requires 3+ instances, other environments require 2+ instances"
  }

  validation {
    condition     = var.elasticsearch_config.volume_size >= 100
    error_message = "Minimum volume size is 100GB"
  }
}

# Redis configuration
variable "redis_config" {
  description = "Redis cluster configuration settings"
  type = object({
    node_type          = string
    version           = string
    num_cache_clusters = number
  })

  validation {
    condition     = can(regex("^cache\\.[tm][4-6]g?\\.\\w+$", var.redis_config.node_type))
    error_message = "Redis node type must be memory-optimized (t4g/m4/m5/m6g family)"
  }

  validation {
    condition     = var.environment == "production" ? var.redis_config.num_cache_clusters >= 2 : true
    error_message = "Production environment requires at least 2 cache clusters"
  }
}

# Backup configuration
variable "backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7
}

# Resource tagging
variable "tags" {
  description = "Resource tags for cost allocation and organization"
  type        = map(string)
  default = {
    Project    = "RefactorTrack"
    ManagedBy  = "Terraform"
  }
}