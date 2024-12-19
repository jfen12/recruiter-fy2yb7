# Provider configuration with required versions
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws" # v4.0
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes" # v2.23
      version = "~> 2.23"
    }
    tls = {
      source  = "hashicorp/tls" # v4.0
      version = "~> 4.0"
    }
  }
}

# Local variables for common configurations
locals {
  common_tags = {
    Environment = var.environment
    Project     = "RefactorTrack"
    ManagedBy   = "Terraform"
  }

  cluster_config = {
    version   = "1.27"
    logging   = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
    encryption = {
      resources = ["secrets"]
      provider  = "aws-kms"
    }
  }

  node_groups = {
    default_labels = {
      Environment = var.environment
      Type        = "managed"
    }
  }
}

# KMS key for EKS cluster encryption
resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = local.common_tags
}

# IAM role for EKS cluster
resource "aws_iam_role" "cluster" {
  name = "${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

# Attach required policies to cluster role
resource "aws_iam_role_policy_attachment" "cluster_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  ])

  policy_arn = each.value
  role       = aws_iam_role.cluster.name
}

# EKS cluster security group
resource "aws_security_group" "cluster" {
  name_prefix = "${var.environment}-eks-cluster-"
  description = "Security group for EKS cluster"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.environment}-eks-cluster-sg"
  })
}

# EKS cluster
resource "aws_eks_cluster" "main" {
  name     = "${var.environment}-refactortrack"
  role_arn = aws_iam_role.cluster.arn
  version  = local.cluster_config.version

  vpc_config {
    subnet_ids              = data.terraform_remote_state.vpc.outputs.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = false
    security_group_ids      = [aws_security_group.cluster.id]
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = local.cluster_config.encryption.resources
  }

  enabled_cluster_log_types = local.cluster_config.logging

  tags = local.common_tags

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policies
  ]
}

# IAM role for node groups
resource "aws_iam_role" "node_group" {
  name = "${var.environment}-eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

# Attach required policies to node group role
resource "aws_iam_role_policy_attachment" "node_group_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ])

  policy_arn = each.value
  role       = aws_iam_role.node_group.name
}

# EKS node groups
resource "aws_eks_node_group" "main" {
  for_each = {
    app = {
      instance_types = ["t3.medium"]
      scaling_config = {
        desired_size = 2
        min_size     = 2
        max_size     = 5
      }
    }
    worker = {
      instance_types = ["t3.large"]
      scaling_config = {
        desired_size = 2
        min_size     = 2
        max_size     = 10
      }
    }
  }

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.environment}-${each.key}"
  node_role_arn   = aws_iam_role.node_group.arn
  subnet_ids      = data.terraform_remote_state.vpc.outputs.private_subnet_ids

  scaling_config {
    desired_size = each.value.scaling_config.desired_size
    max_size     = each.value.scaling_config.max_size
    min_size     = each.value.scaling_config.min_size
  }

  instance_types = each.value.instance_types

  labels = merge(local.node_groups.default_labels, {
    NodeGroup = each.key
  })

  tags = local.common_tags

  depends_on = [
    aws_iam_role_policy_attachment.node_group_policies
  ]
}

# CloudWatch Log Group for cluster logging
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.environment}-refactortrack/cluster"
  retention_in_days = 30

  tags = local.common_tags
}

# Data source for EKS cluster auth
data "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
}

# Configure kubernetes provider
provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

# Outputs
output "cluster_id" {
  description = "EKS cluster identifier"
  value       = aws_eks_cluster.main.id
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_security_group.cluster.id
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}