#!/usr/bin/env bash

# ssl-setup.sh
# Version: 1.0.0
# Description: SSL/TLS certificate setup and configuration script for RefactorTrack
# Dependencies:
# - kubectl v1.24+
# - helm v3.0+
# - openssl v1.1.1+

set -euo pipefail

# Global variables
NAMESPACE="refactortrack"
DOMAIN="refactortrack.com"
CERT_MANAGER_VERSION="v1.9.1"
INGRESS_CLASS="nginx"
MIN_TLS_VERSION="1.3"
CIPHER_SUITES="TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256"
HSTS_MAX_AGE="31536000"
CERT_RENEWAL_THRESHOLD="30"

# Logging functions
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo "[DEBUG] $(date '+%Y-%m-%d %H:%M:%S') - $1"
    fi
}

log_audit() {
    echo "[AUDIT] $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a /var/log/refactortrack/ssl-audit.log
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    for tool in kubectl helm openssl; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            return 1
        fi
    done
    
    # Verify cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot access Kubernetes cluster"
        return 1
    }
    
    # Check namespace existence or create it
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        kubectl create namespace "$NAMESPACE"
        log_info "Created namespace: $NAMESPACE"
    fi
    
    # Verify TLS 1.3 support
    if ! openssl version | grep -q "OpenSSL 1.1.1"; then
        log_error "OpenSSL 1.1.1+ is required for TLS 1.3 support"
        return 1
    }
    
    log_info "Prerequisites check completed successfully"
    return 0
}

# Install cert-manager
install_cert_manager() {
    log_info "Installing cert-manager version ${CERT_MANAGER_VERSION}..."
    
    # Add and update helm repository
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    # Install cert-manager with CRDs
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace "$NAMESPACE" \
        --version "$CERT_MANAGER_VERSION" \
        --set installCRDs=true \
        --set global.leaderElection.namespace="$NAMESPACE" \
        --set prometheus.enabled=true \
        --set webhook.timeoutSeconds=30 \
        --set securityContext.enabled=true \
        --set webhook.hostNetwork=false \
        --wait
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager \
        --namespace "$NAMESPACE" \
        --timeout=300s
    
    log_info "Cert-manager installation completed"
    return 0
}

# Configure TLS settings
configure_tls() {
    local domain="$1"
    log_info "Configuring TLS for domain: $domain"
    
    # Create ClusterIssuer for Let's Encrypt
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
  namespace: ${NAMESPACE}
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@${domain}
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
    - http01:
        ingress:
          class: ${INGRESS_CLASS}
EOF
    
    # Configure Certificate resource
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${domain}-tls
  namespace: ${NAMESPACE}
spec:
  secretName: ${domain}-tls
  duration: 2160h # 90 days
  renewBefore: ${CERT_RENEWAL_THRESHOLD}h
  subject:
    organizations:
      - RefactorTrack
  privateKey:
    algorithm: RSA
    encoding: PKCS1
    size: 2048
  dnsNames:
    - ${domain}
    - "*.${domain}"
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
EOF
    
    # Update ingress annotations for enhanced security
    kubectl patch ingress refactortrack-ingress -n "$NAMESPACE" --type=merge -p "{
        \"metadata\": {
            \"annotations\": {
                \"nginx.ingress.kubernetes.io/ssl-protocols\": \"TLSv${MIN_TLS_VERSION}\",
                \"nginx.ingress.kubernetes.io/ssl-ciphers\": \"${CIPHER_SUITES}\",
                \"nginx.ingress.kubernetes.io/hsts\": \"true\",
                \"nginx.ingress.kubernetes.io/hsts-max-age\": \"${HSTS_MAX_AGE}\",
                \"nginx.ingress.kubernetes.io/hsts-include-subdomains\": \"true\",
                \"nginx.ingress.kubernetes.io/hsts-preload\": \"true\",
                \"nginx.ingress.kubernetes.io/enable-ocsp-stapling\": \"true\"
            }
        }
    }"
    
    log_info "TLS configuration completed"
    return 0
}

# Verify SSL/TLS setup
verify_setup() {
    log_info "Verifying SSL/TLS setup..."
    
    # Check certificate status
    if ! kubectl get certificate -n "$NAMESPACE" "${DOMAIN}-tls" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' | grep -q "True"; then
        log_error "Certificate is not ready"
        return 1
    fi
    
    # Verify TLS secret
    if ! kubectl get secret -n "$NAMESPACE" "${DOMAIN}-tls" &> /dev/null; then
        log_error "TLS secret not found"
        return 1
    }
    
    # Test HTTPS endpoint
    if ! curl -sS --head "https://${DOMAIN}" | grep -q "HTTP/2"; then
        log_error "HTTPS endpoint test failed"
        return 1
    }
    
    log_info "SSL/TLS verification completed successfully"
    return 0
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up SSL/TLS monitoring..."
    
    # Create ServiceMonitor for cert-manager
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cert-manager
  namespace: ${NAMESPACE}
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: cert-manager
  endpoints:
  - port: metrics
    interval: 30s
EOF
    
    # Configure PrometheusRule for alerts
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: ${NAMESPACE}
spec:
  groups:
  - name: cert-manager
    rules:
    - alert: CertificateExpiringSoon
      expr: certmanager_certificate_expiration_timestamp_seconds - time() < (${CERT_RENEWAL_THRESHOLD} * 3600)
      for: 1h
      labels:
        severity: warning
      annotations:
        description: "Certificate {{ \$labels.name }} is expiring in less than ${CERT_RENEWAL_THRESHOLD} hours"
EOF
    
    log_info "Monitoring setup completed"
    return 0
}

# Main execution
main() {
    log_info "Starting SSL/TLS setup for RefactorTrack..."
    
    # Create log directory
    mkdir -p /var/log/refactortrack
    
    # Execute setup steps
    if ! check_prerequisites; then
        log_error "Prerequisites check failed"
        exit 1
    fi
    
    if ! install_cert_manager; then
        log_error "Cert-manager installation failed"
        exit 1
    fi
    
    if ! configure_tls "$DOMAIN"; then
        log_error "TLS configuration failed"
        exit 1
    fi
    
    if ! verify_setup; then
        log_error "SSL/TLS verification failed"
        exit 1
    fi
    
    if ! setup_monitoring; then
        log_error "Monitoring setup failed"
        exit 1
    fi
    
    log_info "SSL/TLS setup completed successfully"
    log_audit "SSL/TLS setup completed for domain: $DOMAIN"
    return 0
}

# Script execution
main "$@"