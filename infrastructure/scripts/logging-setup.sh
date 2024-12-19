#!/bin/bash

# RefactorTrack Logging Setup Script
# Version: 1.0
# Description: Automates the setup and configuration of the ELK stack with security and monitoring
# Dependencies:
# - kubectl v1.24+
# - helm v3.0+
# - openssl for certificate generation

# Global variables
NAMESPACE="refactortrack-logging"
ELASTICSEARCH_VERSION="8.0"
KIBANA_VERSION="8.0"
FLUENTD_VERSION="v1.16-1"
RETRY_ATTEMPTS=3
HEALTH_CHECK_INTERVAL=30
LOG_RETENTION_DAYS=90

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Error handling
set -euo pipefail
trap 'log_error "An error occurred on line $LINENO. Exiting..."; exit 1' ERR

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl v1.24+"
        return 1
    fi

    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed. Please install helm v3.0+"
        return 1
    }

    # Check cluster access
    if ! kubectl auth can-i create namespace --all-namespaces &> /dev/null; then
        log_error "Insufficient cluster permissions. Please ensure cluster admin access."
        return 1
    }

    # Verify storage class
    if ! kubectl get storageclass high-iops-ssd &> /dev/null; then
        log_error "Required storage class 'high-iops-ssd' not found"
        return 1
    }

    # Check network policy support
    if ! kubectl api-resources | grep networkpolicies &> /dev/null; then
        log_warn "Network Policy support not detected. Security may be compromised."
    }

    log_info "Prerequisites check completed successfully"
    return 0
}

# Function to create and configure namespace
setup_namespace() {
    log_info "Setting up namespace and security context..."

    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

    # Apply resource quotas
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: logging-quota
  namespace: ${NAMESPACE}
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "16Gi"
    limits.cpu: "16"
    limits.memory: "32Gi"
    persistentvolumeclaims: "10"
EOF

    # Apply network policies
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: logging-network-policy
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
          name: refactortrack
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: refactortrack
EOF
}

# Function to generate certificates
generate_certificates() {
    log_info "Generating TLS certificates..."

    # Create certificates directory
    CERT_DIR="./certs"
    mkdir -p ${CERT_DIR}

    # Generate CA certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
        -keyout ${CERT_DIR}/ca.key -out ${CERT_DIR}/ca.crt \
        -subj "/CN=refactortrack-logging-ca"

    # Generate certificates for Elasticsearch
    openssl req -newkey rsa:4096 -nodes \
        -keyout ${CERT_DIR}/elasticsearch.key -out ${CERT_DIR}/elasticsearch.csr \
        -subj "/CN=elasticsearch.${NAMESPACE}.svc"

    openssl x509 -req -days 365 \
        -in ${CERT_DIR}/elasticsearch.csr \
        -CA ${CERT_DIR}/ca.crt -CAkey ${CERT_DIR}/ca.key -CAcreateserial \
        -out ${CERT_DIR}/elasticsearch.crt

    # Create Kubernetes secrets
    kubectl create secret generic elasticsearch-certs \
        --from-file=${CERT_DIR}/ca.crt \
        --from-file=${CERT_DIR}/elasticsearch.crt \
        --from-file=${CERT_DIR}/elasticsearch.key \
        -n ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
}

# Function to deploy Elasticsearch
deploy_elasticsearch() {
    log_info "Deploying Elasticsearch..."

    # Apply Elasticsearch configuration
    kubectl apply -f ../kubernetes/logging/elasticsearch.yaml -n ${NAMESPACE}

    # Wait for Elasticsearch to be ready
    for i in $(seq 1 ${RETRY_ATTEMPTS}); do
        if kubectl wait --for=condition=ready pod -l service=elasticsearch -n ${NAMESPACE} --timeout=300s; then
            log_info "Elasticsearch deployment successful"
            return 0
        fi
        log_warn "Attempt $i: Waiting for Elasticsearch to be ready..."
        sleep ${HEALTH_CHECK_INTERVAL}
    done

    log_error "Elasticsearch deployment failed after ${RETRY_ATTEMPTS} attempts"
    return 1
}

# Function to deploy Fluentd
deploy_fluentd() {
    log_info "Deploying Fluentd..."

    # Create Fluentd service account and RBAC
    kubectl apply -f ../kubernetes/logging/fluentd.yaml -n ${NAMESPACE}

    # Wait for Fluentd DaemonSet to be ready
    for i in $(seq 1 ${RETRY_ATTEMPTS}); do
        if kubectl rollout status daemonset/fluentd -n ${NAMESPACE} --timeout=300s; then
            log_info "Fluentd deployment successful"
            return 0
        fi
        log_warn "Attempt $i: Waiting for Fluentd to be ready..."
        sleep ${HEALTH_CHECK_INTERVAL}
    done

    log_error "Fluentd deployment failed after ${RETRY_ATTEMPTS} attempts"
    return 1
}

# Function to deploy Kibana
deploy_kibana() {
    log_info "Deploying Kibana..."

    # Generate random encryption key for Kibana
    ENCRYPTION_KEY=$(openssl rand -base64 32)

    # Create Kibana secrets
    kubectl create secret generic kibana-secrets \
        --from-literal=encryptionKey=${ENCRYPTION_KEY} \
        --from-literal=elasticUsername=elastic \
        --from-literal=elasticPassword=$(openssl rand -base64 32) \
        -n ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

    # Apply Kibana configuration
    kubectl apply -f ../kubernetes/logging/kibana.yaml -n ${NAMESPACE}

    # Wait for Kibana deployment to be ready
    for i in $(seq 1 ${RETRY_ATTEMPTS}); do
        if kubectl rollout status deployment/kibana -n ${NAMESPACE} --timeout=300s; then
            log_info "Kibana deployment successful"
            return 0
        fi
        log_warn "Attempt $i: Waiting for Kibana to be ready..."
        sleep ${HEALTH_CHECK_INTERVAL}
    done

    log_error "Kibana deployment failed after ${RETRY_ATTEMPTS} attempts"
    return 1
}

# Function to configure monitoring
configure_monitoring() {
    log_info "Configuring monitoring and alerts..."

    # Apply Prometheus ServiceMonitor for logging components
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: logging-monitor
  namespace: ${NAMESPACE}
spec:
  selector:
    matchLabels:
      app: refactortrack
      component: logging
  endpoints:
  - port: http
    interval: 30s
EOF

    # Configure log retention
    kubectl patch statefulset elasticsearch -n ${NAMESPACE} --type=json \
        -p='[{"op": "add", "path": "/spec/template/spec/containers/0/env/-", "value": {"name": "INDEX_RETENTION_DAYS", "value": "'${LOG_RETENTION_DAYS}'"}}]'
}

# Function to validate setup
validate_setup() {
    log_info "Validating logging setup..."

    # Check Elasticsearch cluster health
    if ! kubectl exec -it elasticsearch-0 -n ${NAMESPACE} -- curl -s localhost:9200/_cluster/health | grep -q '"status":"green"'; then
        log_error "Elasticsearch cluster is not healthy"
        return 1
    fi

    # Verify Fluentd log shipping
    if ! kubectl get pods -n ${NAMESPACE} -l service=fluentd | grep -q "Running"; then
        log_error "Fluentd pods are not running"
        return 1
    fi

    # Check Kibana accessibility
    if ! kubectl get pods -n ${NAMESPACE} -l service=kibana | grep -q "Running"; then
        log_error "Kibana is not accessible"
        return 1
    fi

    log_info "Logging setup validation completed successfully"
    return 0
}

# Main function
main() {
    log_info "Starting RefactorTrack logging setup..."

    check_prerequisites || exit 1
    setup_namespace || exit 1
    generate_certificates || exit 1
    deploy_elasticsearch || exit 1
    deploy_fluentd || exit 1
    deploy_kibana || exit 1
    configure_monitoring || exit 1
    validate_setup || exit 1

    log_info "Logging setup completed successfully"
    
    # Display access information
    echo -e "\n${GREEN}Access Information:${NC}"
    echo "Kibana URL: https://kibana.${NAMESPACE}.svc:5601"
    echo "Elasticsearch URL: https://elasticsearch.${NAMESPACE}.svc:9200"
    echo "Credentials are stored in kubernetes secrets"
}

# Execute main function
main "$@"