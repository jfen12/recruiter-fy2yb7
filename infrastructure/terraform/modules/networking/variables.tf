# Terraform AWS Provider version ~> 1.0

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC network"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.vpc_cidr))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16)."
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production)"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "availability_zones" {
  type        = list(string)
  description = "List of AWS Availability Zones for multi-AZ deployment"

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability."
  }

  validation {
    condition     = alltrue([for az in var.availability_zones : can(regex("^[a-z]{2}-[a-z]+-[0-9][a-z]$", az))])
    error_message = "Availability zones must be in the correct format (e.g., us-east-1a)."
  }
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for private subnets (one per AZ)"

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnet CIDRs must be specified for high availability."
  }

  validation {
    condition     = alltrue([for cidr in var.private_subnet_cidrs : can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", cidr))])
    error_message = "Private subnet CIDRs must be valid IPv4 CIDR blocks."
  }
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for public subnets (one per AZ)"

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnet CIDRs must be specified for high availability."
  }

  validation {
    condition     = alltrue([for cidr in var.public_subnet_cidrs : can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", cidr))])
    error_message = "Public subnet CIDRs must be valid IPv4 CIDR blocks."
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for cost tracking and resource management"
  default = {
    Project     = "RefactorTrack"
    ManagedBy   = "Terraform"
    Environment = "development"
  }
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT Gateway for private subnet internet access"
  default     = true
}

variable "enable_vpn_gateway" {
  type        = bool
  description = "Enable VPN Gateway for secure remote access"
  default     = false
}

variable "enable_flow_logs" {
  type        = bool
  description = "Enable VPC Flow Logs for network traffic monitoring and security analysis"
  default     = true
}

variable "flow_logs_retention_days" {
  type        = number
  description = "Number of days to retain VPC Flow Logs"
  default     = 30

  validation {
    condition     = var.flow_logs_retention_days >= 1 && var.flow_logs_retention_days <= 365
    error_message = "Flow logs retention days must be between 1 and 365."
  }
}

variable "vpc_endpoints" {
  type        = map(bool)
  description = "Map of VPC endpoints to enable for secure AWS service access"
  default = {
    s3             = true
    dynamodb       = true
    secretsmanager = true
    ecr_api        = true
    ecr_dkr        = true
    logs           = true
  }
}

variable "vpc_flow_logs_traffic_type" {
  type        = string
  description = "Type of traffic to log in VPC Flow Logs (ACCEPT, REJECT, or ALL)"
  default     = "ALL"

  validation {
    condition     = contains(["ACCEPT", "REJECT", "ALL"], var.vpc_flow_logs_traffic_type)
    error_message = "VPC Flow Logs traffic type must be one of: ACCEPT, REJECT, ALL."
  }
}