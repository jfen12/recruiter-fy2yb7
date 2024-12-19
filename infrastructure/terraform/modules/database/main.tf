# Provider configuration
# AWS Provider version ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Common security group for database resources
resource "aws_security_group" "database" {
  name        = "refactortrack-${var.environment}-db-sg"
  description = "Security group for RefactorTrack database resources"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = []  # Will be populated by application security groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-db-sg"
  })
}

# PostgreSQL Aurora Cluster
resource "aws_rds_cluster" "postgresql" {
  cluster_identifier     = "refactortrack-${var.environment}-postgresql"
  engine                = "aurora-postgresql"
  engine_version        = var.postgresql_config.engine_version
  database_name         = "refactortrack"
  master_username       = "refactortrack_admin"
  master_password       = random_password.postgresql_password.result
  storage_encrypted     = true
  kms_key_id           = var.kms_key_id
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name  = aws_db_subnet_group.postgresql.name
  
  backup_retention_period = var.backup_retention_days
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = var.maintenance_window
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  scaling_configuration {
    auto_pause               = var.environment != "production"
    min_capacity            = 2
    max_capacity            = 16
    seconds_until_auto_pause = 300
  }

  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-postgresql"
  })
}

resource "aws_rds_cluster_instance" "postgresql" {
  count               = var.postgresql_config.replica_count + 1
  identifier          = "refactortrack-${var.environment}-postgresql-${count.index}"
  cluster_identifier  = aws_rds_cluster.postgresql.id
  instance_class      = var.postgresql_config.instance_class
  engine              = aws_rds_cluster.postgresql.engine
  engine_version      = aws_rds_cluster.postgresql.engine_version
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-postgresql-${count.index}"
  })
}

# DocumentDB Cluster
resource "aws_docdb_cluster" "mongodb" {
  cluster_identifier     = "refactortrack-${var.environment}-docdb"
  engine                = "docdb"
  engine_version        = var.mongodb_config.engine_version
  master_username       = "refactortrack_admin"
  master_password       = random_password.mongodb_password.result
  storage_encrypted     = true
  kms_key_id           = var.kms_key_id
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name  = aws_docdb_subnet_group.mongodb.name
  
  backup_retention_period = var.backup_retention_days
  preferred_backup_window = "02:00-03:00"
  preferred_maintenance_window = var.maintenance_window

  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-docdb"
  })
}

resource "aws_docdb_cluster_instance" "mongodb" {
  count              = var.mongodb_config.shard_count
  identifier         = "refactortrack-${var.environment}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.mongodb.id
  instance_class     = var.mongodb_config.instance_class

  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-docdb-${count.index}"
  })
}

# Elasticsearch Domain
resource "aws_elasticsearch_domain" "search" {
  domain_name           = "refactortrack-${var.environment}-search"
  elasticsearch_version = var.elasticsearch_config.version

  cluster_config {
    instance_type            = var.elasticsearch_config.instance_type
    instance_count          = var.elasticsearch_config.instance_count
    dedicated_master_enabled = var.environment == "production"
    dedicated_master_count  = var.environment == "production" ? 3 : 0
    zone_awareness_enabled  = true
  }

  ebs_options {
    ebs_enabled = true
    volume_size = var.elasticsearch_config.volume_size
    volume_type = "gp3"
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = var.kms_key_id
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  vpc_options {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.database.id]
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "refactortrack_admin"
      master_user_password = random_password.elasticsearch_password.result
    }
  }

  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-search"
  })
}

# Redis Cluster
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "refactortrack-${var.environment}-redis"
  description               = "Redis cluster for RefactorTrack ${var.environment}"
  node_type                 = var.redis_config.node_type
  engine                    = "redis"
  engine_version            = var.redis_config.version
  num_cache_clusters        = var.redis_config.num_cache_clusters
  parameter_group_family    = "redis6.x"
  port                      = 6379
  
  subnet_group_name         = aws_elasticache_subnet_group.redis.name
  security_group_ids        = [aws_security_group.database.id]
  
  automatic_failover_enabled = true
  multi_az_enabled          = var.environment == "production"
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_password.result
  
  maintenance_window        = var.maintenance_window
  snapshot_retention_limit  = var.backup_retention_days
  snapshot_window          = "01:00-02:00"

  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-redis"
  })
}

# Random password generation
resource "random_password" "postgresql_password" {
  length  = 32
  special = true
}

resource "random_password" "mongodb_password" {
  length  = 32
  special = true
}

resource "random_password" "elasticsearch_password" {
  length  = 32
  special = true
}

resource "random_password" "redis_password" {
  length  = 32
  special = true
}

# Subnet groups
resource "aws_db_subnet_group" "postgresql" {
  name       = "refactortrack-${var.environment}-postgresql-subnet"
  subnet_ids = var.private_subnet_ids
  
  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-postgresql-subnet"
  })
}

resource "aws_docdb_subnet_group" "mongodb" {
  name       = "refactortrack-${var.environment}-docdb-subnet"
  subnet_ids = var.private_subnet_ids
  
  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-docdb-subnet"
  })
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "refactortrack-${var.environment}-redis-subnet"
  subnet_ids = var.private_subnet_ids
  
  tags = merge(var.tags, {
    Name = "refactortrack-${var.environment}-redis-subnet"
  })
}

# IAM role for RDS enhanced monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "refactortrack-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"]

  tags = var.tags
}