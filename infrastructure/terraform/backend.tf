# AWS Provider version ~> 4.0

terraform {
  backend "s3" {
    # Primary state storage configuration
    bucket         = "refactortrack-terraform-state"
    key            = "${var.environment}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "refactortrack-terraform-locks"
    kms_key_id     = "alias/terraform-state-key"

    # Workspace configuration for environment isolation
    workspace_key_prefix = "environments"

    # Enable versioning for state file history
    versioning = true

    # Access logging configuration for audit compliance
    access_logging {
      target_bucket = "refactortrack-terraform-logs"
      target_prefix = "state-access-logs/"
    }

    # Cross-region replication configuration for disaster recovery
    replication_configuration {
      role = "arn:aws:iam::ACCOUNT_ID:role/terraform-state-replication"
      rules {
        id       = "state-replication-rule"
        status   = "Enabled"
        priority = 1

        destination {
          bucket        = "arn:aws:s3:::refactortrack-terraform-state-replica"
          storage_class = "STANDARD_IA"
          region        = "us-west-2"
          
          # Enable encryption for replicated state
          encryption_configuration {
            replica_kms_key_id = "arn:aws:kms:us-west-2:ACCOUNT_ID:key/replica-key-id"
          }
        }
      }
    }

    # Lifecycle rules for cost optimization
    lifecycle_rule {
      enabled = true

      # Transition non-current versions to cheaper storage
      noncurrent_version_transition {
        days          = 30
        storage_class = "STANDARD_IA"
      }

      # Expire old non-current versions
      noncurrent_version_expiration {
        days = 90
      }
    }
  }

  # Required provider configuration
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  # Minimum required Terraform version
  required_version = ">= 1.0.0"
}

# Additional backend configuration for state monitoring
resource "aws_cloudwatch_metric_alarm" "state_file_changes" {
  alarm_name          = "terraform-state-changes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NumberOfObjectsChanged"
  namespace           = "AWS/S3"
  period             = "300"
  statistic          = "Sum"
  threshold          = "1"
  alarm_description  = "This metric monitors changes to the Terraform state file"
  alarm_actions      = ["arn:aws:sns:us-east-1:ACCOUNT_ID:terraform-state-alerts"]

  dimensions = {
    BucketName = "refactortrack-terraform-state"
    FilterId   = "state-changes"
  }
}

# DynamoDB table configuration for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "refactortrack-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "RefactorTrack Terraform State Lock Table"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}