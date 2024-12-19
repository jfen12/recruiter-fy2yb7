#!/bin/bash

# RefactorTrack ATS Backup Script
# Version: 1.0.0
# Description: Enterprise-grade backup solution for RefactorTrack databases and critical data
# Dependencies:
#   - aws-cli v2.0+
#   - postgresql-client v15+
#   - mongodb-database-tools v100.7+
#   - pigz v2.4+

set -euo pipefail

# Import environment variables with secure defaults
ENVIRONMENT=${ENVIRONMENT:-production}
BACKUP_ROOT=${BACKUP_ROOT:-/backup}
S3_BUCKET=${S3_BUCKET:-refactortrack-backups}
RETENTION_DAYS=${RETENTION_DAYS:-30}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
BACKUP_TYPE=${BACKUP_TYPE:-full}
PARALLEL_JOBS=${PARALLEL_JOBS:-4}
COMPRESSION_LEVEL=${COMPRESSION_LEVEL:-9}
REPLICA_REGIONS=${REPLICA_REGIONS:-us-west-2,eu-west-1}

# Constants
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${ENVIRONMENT}/${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/backup.log"
METRIC_PREFIX="refactortrack.backup"

# Ensure script fails on any error
trap 'error_handler $? $LINENO $BASH_LINENO "$BASH_COMMAND" $(printf "::%s" ${FUNCNAME[@]:-})' ERR

# Error handling function
error_handler() {
    local exit_code=$1
    local line_no=$2
    local bash_lineno=$3
    local last_command=$4
    local func_trace=$5
    
    echo "Error occurred in backup script:"
    echo "Exit code: $exit_code"
    echo "Line number: $line_no"
    echo "Command: $last_command"
    echo "Function trace: $func_trace"
    
    # Log error to monitoring system
    monitor_backup_status "error" "Backup failed at line $line_no" \
        "{\"exit_code\": $exit_code, \"command\": \"$last_command\"}"
        
    cleanup_temporary_files
    exit $exit_code
}

# Function to check prerequisites
check_prerequisites() {
    local status=0
    
    # Check AWS CLI version
    if ! aws --version | grep -q "aws-cli/2"; then
        echo "ERROR: AWS CLI v2 is required"
        status=1
    fi
    
    # Check PostgreSQL client
    if ! command -v pg_dump &> /dev/null || \
       ! pg_dump --version | grep -q "PostgreSQL) 15"; then
        echo "ERROR: PostgreSQL client v15+ is required"
        status=1
    fi
    
    # Check MongoDB tools
    if ! command -v mongodump &> /dev/null || \
       ! mongodump --version | grep -q "100.7"; then
        echo "ERROR: MongoDB database tools v100.7+ are required"
        status=1
    fi
    
    # Check pigz
    if ! command -v pigz &> /dev/null; then
        echo "ERROR: pigz is required for parallel compression"
        status=1
    fi
    
    # Verify environment variables
    if [[ -z "${ENCRYPTION_KEY}" ]]; then
        echo "ERROR: ENCRYPTION_KEY environment variable is required"
        status=1
    fi
    
    # Check S3 bucket access
    if ! aws s3 ls "s3://${S3_BUCKET}" &> /dev/null; then
        echo "ERROR: Cannot access S3 bucket ${S3_BUCKET}"
        status=1
    fi
    
    return $status
}

# Function to backup PostgreSQL databases
backup_postgresql() {
    local database_name=$1
    local backup_type=$2
    local backup_file="${BACKUP_DIR}/postgresql_${database_name}_${TIMESTAMP}.sql.gz"
    local status=0
    
    echo "Starting PostgreSQL backup for ${database_name}..."
    
    # Create WAL archive for incremental backup
    if [[ "${backup_type}" == "incremental" ]]; then
        pg_basebackup -D "${BACKUP_DIR}/wal" -X stream -c fast
    fi
    
    # Execute backup with parallel workers and compression
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -U "${DB_USER}" \
        -d "${database_name}" \
        -j "${PARALLEL_JOBS}" \
        --format=custom \
        | pigz -p "${PARALLEL_JOBS}" -${COMPRESSION_LEVEL} \
        | aws kms encrypt \
            --key-id "${ENCRYPTION_KEY}" \
            --plaintext fileb:- \
            --output text \
            --query CiphertextBlob \
        > "${backup_file}"
    
    # Calculate and store checksum
    sha256sum "${backup_file}" > "${backup_file}.sha256"
    
    # Upload to S3 with versioning
    aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/${ENVIRONMENT}/postgresql/${database_name}/"
    aws s3 cp "${backup_file}.sha256" "s3://${S3_BUCKET}/${ENVIRONMENT}/postgresql/${database_name}/"
    
    # Initiate cross-region replication
    for region in ${REPLICA_REGIONS//,/ }; do
        aws s3 cp \
            --region "${region}" \
            "${backup_file}" \
            "s3://${S3_BUCKET}-${region}/${ENVIRONMENT}/postgresql/${database_name}/"
    done
    
    # Record metrics
    local backup_size=$(stat -f%z "${backup_file}")
    monitor_backup_status "postgresql" "success" \
        "{\"database\":\"${database_name}\",\"size\":${backup_size},\"type\":\"${backup_type}\"}"
    
    return $status
}

# Function to backup MongoDB databases
backup_mongodb() {
    local database_name=$1
    local backup_type=$2
    local backup_file="${BACKUP_DIR}/mongodb_${database_name}_${TIMESTAMP}.archive.gz"
    local status=0
    
    echo "Starting MongoDB backup for ${database_name}..."
    
    # Lock balancer for sharded clusters
    if mongosh --eval "sh.isBalancerRunning()" | grep -q "true"; then
        mongosh --eval "sh.stopBalancer()"
    fi
    
    # Execute backup with parallel collections
    mongodump \
        --uri="${MONGO_URI}" \
        --db="${database_name}" \
        --archive \
        --gzip \
        --numParallelCollections="${PARALLEL_JOBS}" \
        | aws kms encrypt \
            --key-id "${ENCRYPTION_KEY}" \
            --plaintext fileb:- \
            --output text \
            --query CiphertextBlob \
        > "${backup_file}"
    
    # Calculate and store checksum
    sha256sum "${backup_file}" > "${backup_file}.sha256"
    
    # Upload to S3 with versioning
    aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/${database_name}/"
    aws s3 cp "${backup_file}.sha256" "s3://${S3_BUCKET}/${ENVIRONMENT}/mongodb/${database_name}/"
    
    # Initiate cross-region replication
    for region in ${REPLICA_REGIONS//,/ }; do
        aws s3 cp \
            --region "${region}" \
            "${backup_file}" \
            "s3://${S3_BUCKET}-${region}/${ENVIRONMENT}/mongodb/${database_name}/"
    done
    
    # Unlock balancer
    if [[ -n "${MONGO_URI}" ]]; then
        mongosh --eval "sh.startBalancer()"
    fi
    
    # Record metrics
    local backup_size=$(stat -f%z "${backup_file}")
    monitor_backup_status "mongodb" "success" \
        "{\"database\":\"${database_name}\",\"size\":${backup_size},\"type\":\"${backup_type}\"}"
    
    return $status
}

# Function to clean up old backups
cleanup_old_backups() {
    local retention_days=$1
    local status=0
    
    echo "Starting cleanup of backups older than ${retention_days} days..."
    
    # List and remove old backups from primary region
    aws s3api list-objects-v2 \
        --bucket "${S3_BUCKET}" \
        --prefix "${ENVIRONMENT}/" \
        --query "Contents[?LastModified<=\`$(date -d "${retention_days} days ago" -Iseconds)\`].[Key]" \
        --output text | while read -r key; do
        
        # Verify backup integrity before removal
        if aws s3 cp "s3://${S3_BUCKET}/${key}" - | \
           aws kms decrypt --ciphertext-blob fileb:- > /dev/null; then
            
            # Move to glacier storage
            aws s3 mv \
                "s3://${S3_BUCKET}/${key}" \
                "s3://${S3_BUCKET}-archive/${key}" \
                --storage-class GLACIER
            
            echo "Moved ${key} to glacier storage"
        else
            echo "WARNING: Backup integrity check failed for ${key}"
            status=1
        fi
    done
    
    # Update backup inventory
    aws s3api put-bucket-inventory-configuration \
        --bucket "${S3_BUCKET}" \
        --id "BackupInventory" \
        --inventory-configuration "$(cat <<EOF
{
    "Destination": {
        "S3BucketDestination": {
            "Bucket": "arn:aws:s3:::${S3_BUCKET}-inventory",
            "Format": "CSV"
        }
    },
    "IsEnabled": true,
    "Id": "BackupInventory",
    "IncludedObjectVersions": "Current",
    "Schedule": {
        "Frequency": "Daily"
    }
}
EOF
)"
    
    # Record cleanup metrics
    monitor_backup_status "cleanup" "success" \
        "{\"retention_days\":${retention_days}}"
    
    return $status
}

# Function to monitor backup status
monitor_backup_status() {
    local backup_type=$1
    local status=$2
    local metrics=$3
    
    # Log backup status
    logger -t "refactortrack-backup" "Backup ${backup_type} ${status}: ${metrics}"
    
    # Record metrics
    if command -v record_metric &> /dev/null; then
        record_metric "${METRIC_PREFIX}.${backup_type}.${status}" 1 "${metrics}"
    fi
}

# Function to clean up temporary files
cleanup_temporary_files() {
    echo "Cleaning up temporary files..."
    rm -rf "${BACKUP_DIR}"
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    echo "Starting RefactorTrack backup process..."
    
    # Create backup directory
    mkdir -p "${BACKUP_DIR}"
    
    # Check prerequisites
    if ! check_prerequisites; then
        echo "ERROR: Prerequisites check failed"
        exit 1
    fi
    
    # Backup PostgreSQL databases
    backup_postgresql "refactortrack_main" "${BACKUP_TYPE}"
    backup_postgresql "refactortrack_analytics" "${BACKUP_TYPE}"
    
    # Backup MongoDB databases
    backup_mongodb "refactortrack_documents" "${BACKUP_TYPE}"
    
    # Clean up old backups
    cleanup_old_backups "${RETENTION_DAYS}"
    
    # Calculate total duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Record final status
    monitor_backup_status "complete" "success" \
        "{\"duration\":${duration},\"backup_type\":\"${BACKUP_TYPE}\"}"
    
    echo "Backup process completed successfully in ${duration} seconds"
    
    # Clean up
    cleanup_temporary_files
}

# Execute main function
main "$@"