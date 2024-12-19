# Output definitions for the EKS cluster module
# AWS Provider version: ~> 4.0

# Core cluster outputs
output "cluster_id" {
  description = "The ID of the EKS cluster for service deployments and infrastructure management"
  value       = aws_eks_cluster.main.id
}

output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_version" {
  description = "The Kubernetes server version of the cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_endpoint" {
  description = "The endpoint for the Kubernetes API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

# Security and networking outputs
output "cluster_security_group_id" {
  description = "The security group ID attached to the EKS cluster"
  value       = aws_security_group.cluster.id
}

output "cluster_iam_role_arn" {
  description = "The ARN of the IAM role used by the EKS cluster"
  value       = aws_iam_role.cluster.arn
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Node group outputs
output "node_groups" {
  description = "Map of node groups created and their configurations"
  value = {
    for ng_key, ng in aws_eks_node_group.main : ng_key => {
      node_group_id = ng.id
      status        = ng.status
      scaling_config = {
        desired_size = ng.scaling_config[0].desired_size
        max_size     = ng.scaling_config[0].max_size
        min_size     = ng.scaling_config[0].min_size
      }
      instance_types = ng.instance_types
      labels         = ng.labels
    }
  }
}

output "node_security_group_id" {
  description = "The security group ID attached to the EKS managed node groups"
  value       = aws_security_group.cluster.id
}

# Logging and monitoring outputs
output "cloudwatch_log_group_name" {
  description = "The CloudWatch log group name for EKS cluster logging"
  value       = aws_cloudwatch_log_group.eks.name
}

output "cluster_logging_enabled_types" {
  description = "List of enabled logging types for the EKS cluster"
  value       = aws_eks_cluster.main.enabled_cluster_log_types
}

# Authentication outputs
output "cluster_auth_token" {
  description = "The token to use for authentication with the cluster"
  value       = data.aws_eks_cluster_auth.main.token
  sensitive   = true
}

# KMS encryption outputs
output "cluster_encryption_config" {
  description = "Configuration block for encryption of Kubernetes secrets"
  value = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = aws_eks_cluster.main.encryption_config[0].resources
  }
}

# Networking outputs
output "cluster_vpc_config" {
  description = "Configuration block for VPC settings of the cluster"
  value = {
    vpc_id             = data.terraform_remote_state.vpc.outputs.vpc_id
    subnet_ids         = data.terraform_remote_state.vpc.outputs.private_subnet_ids
    security_group_ids = [aws_security_group.cluster.id]
  }
}

# Tags output
output "cluster_tags" {
  description = "Map of tags applied to the EKS cluster"
  value       = aws_eks_cluster.main.tags
}