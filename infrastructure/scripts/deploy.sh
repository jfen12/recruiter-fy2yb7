#!/usr/bin/env bash

# RefactorTrack ATS Deployment Script
# Version: 1.0.0
# Description: Advanced deployment automation script for blue/green deployments
# with comprehensive security validation and monitoring

set -euo pipefail
IFS=$'\n\t'

# Import environment variables with defaults
ENVIRONMENT=${ENVIRONMENT:-production}
NAMESPACE=${NAMESPACE:-refactortrack}
KUBE_CONFIG_PATH=${KUBE_CONFIG_PATH:-~/.kube/config}
DOCKER_REGISTRY=${DOCKER_REGISTRY}
DEPLOYMENT_TIMEOUT=${DEPLOYMENT_TIMEOUT:-300}
HEALTH_CHECK_RETRIES=${HEALTH_CHECK_RETRIES:-5}
ROLLBACK_ENABLED=${ROLLBACK_ENABLED:-true}
METRIC_ENDPOINT=${METRIC_ENDPOINT:-http://monitoring:9090}

# Color codes for output formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites for deployment
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "docker" "aws")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            return 1
        fi
    done
    
    # Verify kubectl connection
    if ! kubectl version --short &> /dev/null; then
        log_error "Unable to connect to Kubernetes cluster"
        return 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "Invalid AWS credentials"
        return 1
    }
    
    # Verify namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warn "Namespace $NAMESPACE does not exist, creating..."
        kubectl create namespace "$NAMESPACE"
    }
    
    # Check Docker registry access
    if ! docker login "$DOCKER_REGISTRY" &> /dev/null; then
        log_error "Unable to authenticate with Docker registry"
        return 1
    }
    
    return 0
}

# Health check function for deployed services
health_check() {
    local service_name=$1
    local health_check_config=$2
    local retries=${HEALTH_CHECK_RETRIES}
    
    log_info "Performing health check for $service_name..."
    
    while [ $retries -gt 0 ]; do
        # Check deployment status
        if ! kubectl rollout status deployment/"$service_name" -n "$NAMESPACE" --timeout=30s &> /dev/null; then
            log_warn "Deployment not ready, retrying... ($retries attempts remaining)"
            ((retries--))
            sleep 10
            continue
        }
        
        # Check pod readiness
        local ready_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$service_name" -o jsonpath='{.items[*].status.containerStatuses[*].ready}' | tr ' ' '\n' | grep -c "true")
        local total_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$service_name" --no-headers | wc -l)
        
        if [ "$ready_pods" -lt "$total_pods" ]; then
            log_warn "Not all pods are ready ($ready_pods/$total_pods), retrying... ($retries attempts remaining)"
            ((retries--))
            sleep 10
            continue
        }
        
        # Check application health endpoint
        local service_url=$(kubectl get svc -n "$NAMESPACE" "$service_name" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
        if ! curl -sf "http://$service_url/health" &> /dev/null; then
            log_warn "Health endpoint not responding, retrying... ($retries attempts remaining)"
            ((retries--))
            sleep 10
            continue
        }
        
        log_info "Health check passed for $service_name"
        return 0
    done
    
    log_error "Health check failed for $service_name after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Deploy a service using blue/green deployment
deploy_service() {
    local service_name=$1
    local version_tag=$2
    local deployment_config=$3
    
    log_info "Starting blue/green deployment for $service_name:$version_tag"
    
    # Generate unique deployment ID
    local deployment_id="deploy-$(date +%s)"
    local blue_deployment="${service_name}-blue"
    local green_deployment="${service_name}-green"
    
    # Determine current active deployment
    local active_deployment=$(kubectl get service "$service_name" -n "$NAMESPACE" -o jsonpath='{.spec.selector.deployment}' 2>/dev/null || echo "$blue_deployment")
    local new_deployment=$([ "$active_deployment" == "$blue_deployment" ] && echo "$green_deployment" || echo "$blue_deployment")
    
    log_info "Current active deployment: $active_deployment"
    log_info "New deployment target: $new_deployment"
    
    # Deploy new version
    kubectl apply -f <(cat "$deployment_config" | sed "s/{{SERVICE_NAME}}/$new_deployment/g" | sed "s/{{VERSION}}/$version_tag/g") -n "$NAMESPACE"
    
    # Wait for deployment to be ready
    if ! kubectl rollout status deployment/"$new_deployment" -n "$NAMESPACE" --timeout="${DEPLOYMENT_TIMEOUT}s"; then
        log_error "Deployment failed for $new_deployment"
        if [ "$ROLLBACK_ENABLED" = "true" ]; then
            rollback_deployment "$service_name" "$active_deployment"
        fi
        return 1
    }
    
    # Perform health check
    if ! health_check "$new_deployment" "$deployment_config"; then
        log_error "Health check failed for $new_deployment"
        if [ "$ROLLBACK_ENABLED" = "true" ]; then
            rollback_deployment "$service_name" "$active_deployment"
        fi
        return 1
    }
    
    # Switch traffic to new deployment
    log_info "Switching traffic to $new_deployment"
    kubectl patch service "$service_name" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"deployment\":\"$new_deployment\"}}}"
    
    # Clean up old deployment
    if kubectl get deployment "$active_deployment" -n "$NAMESPACE" &> /dev/null; then
        log_info "Removing old deployment: $active_deployment"
        kubectl delete deployment "$active_deployment" -n "$NAMESPACE"
    fi
    
    log_info "Deployment completed successfully for $service_name:$version_tag"
    return 0
}

# Rollback deployment to previous version
rollback_deployment() {
    local service_name=$1
    local rollback_config=$2
    
    log_info "Initiating rollback for $service_name"
    
    # Get previous deployment
    local previous_deployment=$(kubectl rollout history deployment/"$service_name" -n "$NAMESPACE" | tail -n 2 | head -n 1 | awk '{print $1}')
    
    if [ -z "$previous_deployment" ]; then
        log_error "No previous deployment found for rollback"
        return 1
    }
    
    log_info "Rolling back to revision: $previous_deployment"
    kubectl rollout undo deployment/"$service_name" -n "$NAMESPACE" --to-revision="$previous_deployment"
    
    # Wait for rollback to complete
    if ! kubectl rollout status deployment/"$service_name" -n "$NAMESPACE" --timeout=300s; then
        log_error "Rollback failed for $service_name"
        return 1
    }
    
    log_info "Rollback completed successfully for $service_name"
    return 0
}

# Main execution
main() {
    local command=$1
    shift
    
    case $command in
        "deploy")
            if ! check_prerequisites; then
                log_error "Prerequisites check failed"
                exit 1
            }
            deploy_service "$@"
            ;;
        "rollback")
            rollback_deployment "$@"
            ;;
        "health-check")
            health_check "$@"
            ;;
        *)
            log_error "Unknown command: $command"
            echo "Usage: $0 {deploy|rollback|health-check} [args...]"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ "$#" -lt 1 ]; then
        log_error "No command specified"
        echo "Usage: $0 {deploy|rollback|health-check} [args...]"
        exit 1
    fi
    main "$@"
fi