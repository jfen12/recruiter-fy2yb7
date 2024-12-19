# Provider and backend configuration
# AWS Provider version ~> 4.0
# Kubernetes Provider version ~> 2.0
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "refactortrack-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Common tags for resource tracking and management
locals {
  common_tags = {
    Project      = "RefactorTrack"
    Environment  = var.environment
    ManagedBy    = "Terraform"
    LastUpdated  = timestamp()
  }
}

# Primary region provider configuration
provider "aws" {
  region = var.aws_region
  alias  = "primary"

  default_tags {
    tags = local.common_tags
  }
}

# Secondary region provider configuration for disaster recovery
provider "aws" {
  region = var.secondary_aws_region
  alias  = "secondary"

  default_tags {
    tags = local.common_tags
  }
}

# Primary region networking
module "primary_networking" {
  source = "./modules/networking"
  providers = {
    aws = aws.primary
  }

  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  region      = var.aws_region
}

# Secondary region networking
module "secondary_networking" {
  source = "./modules/networking"
  providers = {
    aws = aws.secondary
  }

  environment = var.environment
  vpc_cidr    = "10.1.0.0/16" # Different CIDR for secondary region
  region      = var.secondary_aws_region
}

# Primary region databases
module "primary_database" {
  source = "./modules/database"
  providers = {
    aws = aws.primary
  }

  environment     = var.environment
  vpc_id         = module.primary_networking.vpc_id
  private_subnets = module.primary_networking.private_subnets
  database_config = var.database_config
  is_primary     = true

  backup_retention_days = var.backup_retention_days
}

# Secondary region databases (replicas)
module "secondary_database" {
  source = "./modules/database"
  providers = {
    aws = aws.secondary
  }

  environment     = var.environment
  vpc_id         = module.secondary_networking.vpc_id
  private_subnets = module.secondary_networking.private_subnets
  database_config = var.database_config
  is_primary     = false

  primary_database_arn = module.primary_database.database_arn
  backup_retention_days = var.backup_retention_days
}

# Primary region Kubernetes (EKS) cluster
module "primary_kubernetes" {
  source = "./modules/kubernetes"
  providers = {
    aws = aws.primary
  }

  environment      = var.environment
  vpc_id          = module.primary_networking.vpc_id
  private_subnets = module.primary_networking.private_subnets
  kubernetes_config = var.kubernetes_config
}

# Secondary region Kubernetes (EKS) cluster
module "secondary_kubernetes" {
  source = "./modules/kubernetes"
  providers = {
    aws = aws.secondary
  }

  environment      = var.environment
  vpc_id          = module.secondary_networking.vpc_id
  private_subnets = module.secondary_networking.private_subnets
  kubernetes_config = var.kubernetes_config
}

# Monitoring and observability setup
module "monitoring" {
  source = "./modules/monitoring"
  providers = {
    aws = aws.primary
  }

  environment       = var.environment
  monitoring_config = var.monitoring_config
  vpc_ids = {
    primary   = module.primary_networking.vpc_id
    secondary = module.secondary_networking.vpc_id
  }
}

# Output configurations
output "vpc_ids" {
  description = "VPC IDs for both regions"
  value = {
    primary   = module.primary_networking.vpc_id
    secondary = module.secondary_networking.vpc_id
  }
}

output "database_endpoints" {
  description = "Database endpoints for application configuration"
  value = {
    postgresql_primary   = module.primary_database.postgresql_endpoint
    postgresql_secondary = module.secondary_database.postgresql_endpoint
    mongodb_primary     = module.primary_database.mongodb_endpoint
    mongodb_secondary   = module.secondary_database.mongodb_endpoint
    elasticsearch       = module.primary_database.elasticsearch_endpoint
    redis              = module.primary_database.redis_endpoint
  }
  sensitive = true
}

output "monitoring_config" {
  description = "Monitoring configuration for observability setup"
  value = {
    log_groups   = module.monitoring.cloudwatch_log_groups
    alarm_topics = module.monitoring.alarm_topics
  }
}

# Route 53 health checks and DNS failover configuration
resource "aws_route53_health_check" "primary" {
  provider = aws.primary

  fqdn              = module.primary_kubernetes.cluster_endpoint
  port              = 443
  type              = "HTTPS"
  resource_path     = "/healthz"
  failure_threshold = "3"
  request_interval  = "30"

  tags = local.common_tags
}

resource "aws_route53_health_check" "secondary" {
  provider = aws.secondary

  fqdn              = module.secondary_kubernetes.cluster_endpoint
  port              = 443
  type              = "HTTPS"
  resource_path     = "/healthz"
  failure_threshold = "3"
  request_interval  = "30"

  tags = local.common_tags
}

# Global accelerator for traffic routing
resource "aws_globalaccelerator_accelerator" "main" {
  provider = aws.primary
  name     = "refactortrack-${var.environment}"
  enabled  = true

  attributes {
    flow_logs_enabled = true
  }

  tags = local.common_tags
}

# DynamoDB global tables for session management
resource "aws_dynamodb_table" "sessions" {
  provider = aws.primary

  name             = "refactortrack-sessions-${var.environment}"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "session_id"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "session_id"
    type = "S"
  }

  replica {
    region_name = var.secondary_aws_region
  }

  tags = local.common_tags
}