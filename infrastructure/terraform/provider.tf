# Provider configuration for RefactorTrack ATS infrastructure
# Version: 1.0.0
# Last Updated: 2023

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws" # v4.0
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes" # v2.0
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm" # v2.0
      version = "~> 2.0"
    }
  }
}

# Primary AWS provider configuration for main region
provider "aws" {
  alias  = "primary"
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "RefactorTrack"
      ManagedBy   = "Terraform"
    }
  }
}

# Secondary AWS provider configuration for disaster recovery region
provider "aws" {
  alias  = "secondary"
  region = var.secondary_aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "RefactorTrack"
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources for EKS cluster configuration
data "aws_eks_cluster" "refactortrack_cluster" {
  name       = "refactortrack_cluster"
  depends_on = [module.eks]
  provider   = aws.primary
}

data "aws_eks_cluster_auth" "refactortrack_cluster" {
  name     = "refactortrack_cluster"
  provider = aws.primary
}

# Kubernetes provider configuration for EKS cluster management
provider "kubernetes" {
  host                   = data.aws_eks_cluster.refactortrack_cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.refactortrack_cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.refactortrack_cluster.token

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      "refactortrack_cluster"
    ]
  }
}

# Helm provider configuration for application deployments
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.refactortrack_cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.refactortrack_cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.refactortrack_cluster.token

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        "refactortrack_cluster"
      ]
    }
  }
}