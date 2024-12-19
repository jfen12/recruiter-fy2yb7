# Network Configuration Outputs
output "network_config" {
  description = "Network configuration for service deployment"
  value = {
    vpc_id             = module.networking.vpc_id
    vpc_cidr           = module.networking.vpc_cidr
    private_subnet_ids = module.networking.private_subnet_ids
    public_subnet_ids  = module.networking.public_subnet_ids
    security_group_ids = module.networking.security_group_ids
    nat_gateway_ips    = module.networking.nat_gateway_ips
    availability_zones = module.networking.availability_zones
    vpc_endpoints      = module.networking.vpc_endpoints
  }

  sensitive = false
}

# Database Endpoints Output
output "database_endpoints" {
  description = "Database endpoints for application configuration"
  value = {
    postgresql_writer = {
      endpoint = module.database.postgresql_writer_endpoint
      port     = 5432
      engine   = "aurora-postgresql"
    }
    postgresql_reader = {
      endpoint = module.database.postgresql_reader_endpoint
      port     = 5432
      engine   = "aurora-postgresql"
    }
    mongodb = {
      endpoint = module.database.mongodb_endpoint
      port     = 27017
      engine   = "docdb"
    }
    elasticsearch = {
      endpoint = module.database.elasticsearch_endpoint
      port     = 443
      engine   = "elasticsearch"
    }
    redis = {
      endpoint = module.database.redis_primary_endpoint
      port     = 6379
      engine   = "redis"
    }
  }

  # Mark as sensitive to prevent exposure in logs
  sensitive = true
}

# Kubernetes Cluster Configuration
output "kubernetes_config" {
  description = "Kubernetes cluster configuration for service deployment"
  value = {
    cluster_id                       = module.kubernetes.cluster_id
    cluster_endpoint                 = module.kubernetes.cluster_endpoint
    cluster_security_group_id        = module.kubernetes.cluster_security_group_id
    cluster_certificate_authority    = module.kubernetes.cluster_certificate_authority_data
    private_subnet_ids              = module.networking.private_subnet_ids
    cluster_security_group_rules    = module.networking.security_group_ids
  }

  # Mark as sensitive due to certificate data
  sensitive = true
}

# Monitoring and Logging Configuration
output "monitoring_config" {
  description = "Monitoring and logging configuration for observability"
  value = {
    vpc_flow_log_group = module.networking.vpc_flow_log_group
    network_acl_ids    = module.networking.network_acl_ids
  }

  sensitive = false
}

# Route Configuration
output "routing_config" {
  description = "Network routing configuration for traffic management"
  value = {
    public_route_table_id  = module.networking.route_table_ids["public"]
    private_route_table_ids = module.networking.route_table_ids["private"]
    internet_gateway_id    = module.networking.internet_gateway_id
  }

  sensitive = false
}

# Resource Tags
output "resource_tags" {
  description = "Common resource tags for cost allocation and resource management"
  value = {
    network_tags = module.networking.network_tags
  }

  sensitive = false
}

# Environment Information
output "environment_info" {
  description = "Environment-specific deployment information"
  value = {
    environment = var.environment
    region      = data.aws_region.current.name
    account_id  = data.aws_caller_identity.current.account_id
  }

  sensitive = false
}

# Data Sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}