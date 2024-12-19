#!/bin/bash
# monitoring-setup.sh
# Version: 1.0.0
# Description: Automated setup script for RefactorTrack monitoring stack
# Dependencies:
# - kubectl v1.24+ (kubernetes-cli)
# - helm v3.0+ (helm)

set -euo pipefail

# Global variables
NAMESPACE="refactortrack"
PROMETHEUS_VERSION="v2.45.0"
GRAFANA_VERSION="9.5.0"
ALERTMANAGER_VERSION="v0.25.0"
MONITORING_DOMAIN="monitoring.refactortrack.com"
RETENTION_PERIOD="30d"
BACKUP_BUCKET="refactortrack-monitoring-backup"
LOG_LEVEL="info"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_DIR="${SCRIPT_DIR}/../kubernetes/monitoring"
LOG_FILE="/var/log/refactortrack/monitoring-setup.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$*"
}

log_error() {
    log "ERROR" "${RED}$*${NC}"
}

log_warning() {
    log "WARNING" "${YELLOW}$*${NC}"
}

log_success() {
    log "SUCCESS" "${GREEN}$*${NC}"
}

# Prerequisite check function
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl v1.24 or later."
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm not found. Please install helm v3.0 or later."
        exit 1
    }
    
    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Unable to access Kubernetes cluster. Please check your kubeconfig."
        exit 1
    }
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "${LOG_FILE}")"
    
    log_success "Prerequisites check passed"
}

# Create and configure namespace
create_namespace() {
    log_info "Creating monitoring namespace..."
    
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        kubectl create namespace "${NAMESPACE}"
        
        # Apply resource quotas
        cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: monitoring-quota
  namespace: ${NAMESPACE}
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    persistentvolumeclaims: "10"
EOF
        
        # Apply network policies
        cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: monitoring-network-policy
  namespace: ${NAMESPACE}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ${NAMESPACE}
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: ${NAMESPACE}
EOF
        
        log_success "Namespace ${NAMESPACE} created and configured"
    else
        log_warning "Namespace ${NAMESPACE} already exists"
    fi
}

# Deploy Prometheus
deploy_prometheus() {
    log_info "Deploying Prometheus ${PROMETHEUS_VERSION}..."
    
    # Create storage class and PVC
    kubectl apply -f "${MANIFEST_DIR}/prometheus-storage.yaml"
    
    # Apply RBAC configuration
    kubectl apply -f "${MANIFEST_DIR}/prometheus-rbac.yaml"
    
    # Deploy Prometheus
    helm upgrade --install prometheus prometheus-community/prometheus \
        --namespace "${NAMESPACE}" \
        --version "${PROMETHEUS_VERSION}" \
        --values "${MANIFEST_DIR}/prometheus-values.yaml" \
        --set retention.time="${RETENTION_PERIOD}" \
        --wait
    
    # Verify deployment
    if ! kubectl rollout status statefulset/prometheus -n "${NAMESPACE}" --timeout=300s; then
        log_error "Prometheus deployment failed"
        exit 1
    }
    
    log_success "Prometheus deployment completed"
}

# Deploy Grafana
deploy_grafana() {
    log_info "Deploying Grafana ${GRAFANA_VERSION}..."
    
    # Create storage
    kubectl apply -f "${MANIFEST_DIR}/grafana-storage.yaml"
    
    # Deploy Grafana
    helm upgrade --install grafana grafana/grafana \
        --namespace "${NAMESPACE}" \
        --version "${GRAFANA_VERSION}" \
        --values "${MANIFEST_DIR}/grafana-values.yaml" \
        --set persistence.enabled=true \
        --set ingress.enabled=true \
        --set ingress.hosts[0]="${MONITORING_DOMAIN}" \
        --wait
    
    # Configure backup cronjob
    kubectl apply -f "${MANIFEST_DIR}/grafana-backup-cronjob.yaml"
    
    # Verify deployment
    if ! kubectl rollout status deployment/grafana -n "${NAMESPACE}" --timeout=300s; then
        log_error "Grafana deployment failed"
        exit 1
    }
    
    log_success "Grafana deployment completed"
}

# Deploy AlertManager
deploy_alertmanager() {
    log_info "Deploying AlertManager ${ALERTMANAGER_VERSION}..."
    
    # Deploy AlertManager
    helm upgrade --install alertmanager prometheus-community/alertmanager \
        --namespace "${NAMESPACE}" \
        --version "${ALERTMANAGER_VERSION}" \
        --values "${MANIFEST_DIR}/alertmanager-values.yaml" \
        --set replicaCount=3 \
        --wait
    
    # Verify deployment
    if ! kubectl rollout status statefulset/alertmanager -n "${NAMESPACE}" --timeout=300s; then
        log_error "AlertManager deployment failed"
        exit 1
    }
    
    log_success "AlertManager deployment completed"
}

# Configure monitoring stack integration
configure_monitoring() {
    log_info "Configuring monitoring stack integration..."
    
    # Apply recording rules
    kubectl apply -f "${MANIFEST_DIR}/prometheus-rules.yaml"
    
    # Apply alert rules
    kubectl apply -f "${MANIFEST_DIR}/alertmanager-rules.yaml"
    
    # Configure Grafana datasources
    kubectl apply -f "${MANIFEST_DIR}/grafana-datasources.yaml"
    
    # Import dashboards
    kubectl apply -f "${MANIFEST_DIR}/grafana-dashboards.yaml"
    
    log_success "Monitoring stack configuration completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying monitoring stack deployment..."
    
    # Check pod status
    local failed_pods=$(kubectl get pods -n "${NAMESPACE}" --field-selector status.phase!=Running -o name)
    if [[ -n "${failed_pods}" ]]; then
        log_error "Failed pods found: ${failed_pods}"
        exit 1
    }
    
    # Check endpoints
    local services=("prometheus" "grafana" "alertmanager")
    for service in "${services[@]}"; do
        if ! kubectl get endpoints -n "${NAMESPACE}" "${service}" -o jsonpath='{.subsets[*].addresses[*]}' | grep -q .; then
            log_error "No endpoints found for service ${service}"
            exit 1
        fi
    done
    
    # Test Prometheus API
    if ! curl -s "http://prometheus.${NAMESPACE}:9090/-/healthy" | grep -q "Prometheus is Healthy"; then
        log_error "Prometheus health check failed"
        exit 1
    }
    
    log_success "Monitoring stack verification completed successfully"
}

# Main execution
main() {
    log_info "Starting monitoring stack setup..."
    
    # Execute setup steps
    check_prerequisites
    create_namespace
    deploy_prometheus
    deploy_grafana
    deploy_alertmanager
    configure_monitoring
    verify_deployment
    
    log_success "Monitoring stack setup completed successfully"
    
    # Print access information
    echo -e "\nAccess Information:"
    echo -e "Grafana: https://${MONITORING_DOMAIN}"
    echo -e "Prometheus: http://prometheus.${NAMESPACE}:9090"
    echo -e "AlertManager: http://alertmanager.${NAMESPACE}:9093"
    
    # Get Grafana admin password
    echo -e "\nGrafana admin password:"
    kubectl get secret --namespace "${NAMESPACE}" grafana -o jsonpath="{.data.admin-password}" | base64 --decode
    echo -e "\n"
}

# Script entry point with error handling
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    trap 'log_error "Script failed on line $LINENO"' ERR
    main "$@"
fi