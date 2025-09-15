#!/bin/bash

# NagaraTrack Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
DB_NAME="${POSTGRES_DB:-nagaratrack}"
DB_USER="${POSTGRES_USER:-nagaratrack}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
MAX_BACKUPS="${MAX_BACKUPS:-10}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/nagaratrack_backup_$TIMESTAMP.sql"

echo "Starting database backup..."
echo "Backup file: $BACKUP_FILE"

# Create the backup
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=custom \
    --file="$BACKUP_FILE.backup"

# Also create a plain SQL backup for easier inspection
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    --clean \
    --if-exists \
    --create \
    > "$BACKUP_FILE"

# Compress the SQL backup
gzip "$BACKUP_FILE"

echo "Database backup completed successfully!"
echo "Files created:"
echo "  - $BACKUP_FILE.backup (PostgreSQL custom format)"
echo "  - $BACKUP_FILE.gz (Compressed SQL)"

# Cleanup old backups based on retention policy
echo "Cleaning up old backups..."

# Remove backups older than retention days
if [ "$RETENTION_DAYS" -gt 0 ]; then
    find "$BACKUP_DIR" -name "nagaratrack_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "nagaratrack_backup_*.backup" -mtime +$RETENTION_DAYS -delete
    echo "Removed backups older than $RETENTION_DAYS days"
fi

# Keep only the latest N backups
if [ "$MAX_BACKUPS" -gt 0 ]; then
    # Count current backups
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "nagaratrack_backup_*.sql.gz" | wc -l)
    
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        EXCESS_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
        
        # Remove oldest backups
        find "$BACKUP_DIR" -name "nagaratrack_backup_*.sql.gz" -printf '%T+ %p\n' | \
            sort | head -n "$EXCESS_COUNT" | cut -d' ' -f2- | xargs rm -f
        
        find "$BACKUP_DIR" -name "nagaratrack_backup_*.backup" -printf '%T+ %p\n' | \
            sort | head -n "$EXCESS_COUNT" | cut -d' ' -f2- | xargs rm -f
            
        echo "Removed $EXCESS_COUNT oldest backups to maintain max of $MAX_BACKUPS"
    fi
fi

# Show backup summary
echo ""
echo "Backup Summary:"
ls -lh "$BACKUP_DIR"/nagaratrack_backup_* | tail -5

# Verify backup integrity
echo ""
echo "Verifying backup integrity..."
if pg_restore --list "$BACKUP_FILE.backup" > /dev/null 2>&1; then
    echo "✓ Backup file integrity verified"
else
    echo "✗ Backup file integrity check failed"
    exit 1
fi

echo "Backup process completed successfully!"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# if [ -n "$AWS_S3_BUCKET" ]; then
#     echo "Uploading to S3..."
#     aws s3 cp "$BACKUP_FILE.gz" "s3://$AWS_S3_BUCKET/backups/"
#     aws s3 cp "$BACKUP_FILE.backup" "s3://$AWS_S3_BUCKET/backups/"
#     echo "Backup uploaded to S3"
# fi

# if [ -n "$GOOGLE_CLOUD_BUCKET" ]; then
#     echo "Uploading to Google Cloud Storage..."
#     gsutil cp "$BACKUP_FILE.gz" "gs://$GOOGLE_CLOUD_BUCKET/backups/"
#     gsutil cp "$BACKUP_FILE.backup" "gs://$GOOGLE_CLOUD_BUCKET/backups/"
#     echo "Backup uploaded to Google Cloud Storage"
# fi