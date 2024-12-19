# VPC Outputs
output "vpc_id" {
  description = "ID of the created VPC for resource association"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC for network planning and security group rules"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "private_subnet_ids" {
  description = "List of private subnet IDs for deploying internal resources like ECS tasks and RDS instances"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for deploying internet-facing resources like ALB"
  value       = aws_subnet.public[*].id
}

# Security Group Outputs
output "security_group_ids" {
  description = "Map of security group IDs for different components"
  value = {
    alb = aws_security_group.alb.id
    app = aws_security_group.app.id
  }
}

# NAT Gateway Outputs
output "nat_gateway_ips" {
  description = "List of Elastic IPs associated with NAT Gateways for outbound internet access"
  value       = var.enable_nat_gateway ? aws_eip.nat[*].public_ip : []
}

# VPC Flow Logs Outputs
output "vpc_flow_log_group" {
  description = "Name of the CloudWatch Log Group for VPC Flow Logs"
  value       = var.enable_flow_logs ? aws_cloudwatch_log_group.flow_logs[0].name : null
}

# Network ACL Outputs
output "network_acl_ids" {
  description = "Map of Network ACL IDs for network security auditing"
  value = {
    public  = aws_subnet.public[0].network_acl_id
    private = aws_subnet.private[0].network_acl_id
  }
}

# Route Table Outputs
output "route_table_ids" {
  description = "Map of Route Table IDs for network routing configuration"
  value = {
    public  = aws_route_table.public.id
    private = aws_route_table.private[*].id
  }
}

# Availability Zone Outputs
output "availability_zones" {
  description = "List of Availability Zones used in the VPC deployment"
  value       = var.availability_zones
}

# VPC Endpoint Outputs
output "vpc_endpoints" {
  description = "Map of VPC Endpoint IDs for AWS service access"
  value = {
    s3 = var.vpc_endpoints["s3"] ? aws_vpc_endpoint.s3[0].id : null
  }
}

# Internet Gateway Output
output "internet_gateway_id" {
  description = "ID of the Internet Gateway attached to the VPC"
  value       = aws_internet_gateway.main.id
}

# Tags Output
output "network_tags" {
  description = "Common tags applied to networking resources"
  value       = var.tags
}