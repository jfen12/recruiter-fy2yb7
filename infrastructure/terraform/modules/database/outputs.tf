# PostgreSQL cluster endpoints
output "postgresql_endpoints" {
  description = "PostgreSQL cluster connection endpoints for read/write operations"
  value = {
    writer_endpoint = aws_rds_cluster.postgresql.endpoint
    reader_endpoint = aws_rds_cluster.postgresql.reader_endpoint
    port           = aws_rds_cluster.postgresql.port
    database_name  = aws_rds_cluster.postgresql.database_name
  }
  sensitive = true
}

# MongoDB (DocumentDB) cluster endpoints
output "mongodb_endpoints" {
  description = "MongoDB cluster connection endpoints and configuration"
  value = {
    endpoint = aws_docdb_cluster.mongodb.endpoint
    connection_string = format(
      "mongodb://%s:%s@%s:%d/?replicaSet=rs0&tls=true",
      aws_docdb_cluster.mongodb.master_username,
      nonsensitive(aws_docdb_cluster.mongodb.master_password),
      aws_docdb_cluster.mongodb.endpoint,
      aws_docdb_cluster.mongodb.port
    )
    port = aws_docdb_cluster.mongodb.port
  }
  sensitive = true
}

# Elasticsearch domain endpoints
output "elasticsearch_endpoints" {
  description = "Elasticsearch domain endpoints for search and analytics"
  value = {
    domain_endpoint = "https://${aws_elasticsearch_domain.search.endpoint}"
    kibana_endpoint = "https://${aws_elasticsearch_domain.search.kibana_endpoint}"
    port           = 443
  }
  sensitive = true
}

# Redis cluster endpoints
output "redis_endpoints" {
  description = "Redis cluster endpoints for caching layer"
  value = {
    primary_endpoint = aws_elasticache_replication_group.redis.primary_endpoint_address
    reader_endpoint  = aws_elasticache_replication_group.redis.reader_endpoint_address
    port            = aws_elasticache_replication_group.redis.port
    auth_token      = aws_elasticache_replication_group.redis.auth_token
  }
  sensitive = true
}

# Database security group ID
output "database_security_group_id" {
  description = "ID of the security group controlling database access"
  value       = aws_security_group.database.id
}

# Database subnet group names
output "subnet_group_names" {
  description = "Names of the database subnet groups"
  value = {
    postgresql    = aws_db_subnet_group.postgresql.name
    mongodb       = aws_docdb_subnet_group.mongodb.name
    redis         = aws_elasticache_subnet_group.redis.name
  }
}

# Database monitoring configuration
output "monitoring_config" {
  description = "Database monitoring configuration details"
  value = {
    rds_monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
    cloudwatch_log_groups = {
      postgresql    = aws_rds_cluster.postgresql.cluster_identifier
      mongodb       = aws_docdb_cluster.mongodb.cluster_identifier
      elasticsearch = "/aws/es/${aws_elasticsearch_domain.search.domain_name}"
      redis         = "refactortrack-${var.environment}-redis"
    }
  }
}

# Database backup windows
output "maintenance_windows" {
  description = "Scheduled maintenance and backup windows for databases"
  value = {
    postgresql = {
      backup      = aws_rds_cluster.postgresql.preferred_backup_window
      maintenance = aws_rds_cluster.postgresql.preferred_maintenance_window
    }
    mongodb = {
      backup      = aws_docdb_cluster.mongodb.preferred_backup_window
      maintenance = aws_docdb_cluster.mongodb.preferred_maintenance_window
    }
    redis = {
      maintenance = aws_elasticache_replication_group.redis.maintenance_window
      snapshot    = aws_elasticache_replication_group.redis.snapshot_window
    }
  }
}

# Database version information
output "database_versions" {
  description = "Deployed database engine versions"
  value = {
    postgresql    = aws_rds_cluster.postgresql.engine_version
    mongodb       = aws_docdb_cluster.mongodb.engine_version
    elasticsearch = aws_elasticsearch_domain.search.elasticsearch_version
    redis         = aws_elasticache_replication_group.redis.engine_version
  }
}