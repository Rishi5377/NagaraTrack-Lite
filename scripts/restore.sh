#!/bin/bash

# NagaraTrack Database Restore Script
# This script restores the PostgreSQL database from a backup

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
DB_NAME="${POSTGRES_DB:-nagaratrack}"
DB_USER="${POSTGRES_USER:-nagaratrack}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -f, --file FILE       Backup file to restore from"
    echo "  -l, --list           List available backup files"
    echo "  -i, --interactive    Interactive mode to select backup"
    echo "  -y, --yes            Skip confirmation prompts"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list                                    # List available backups"
    echo "  $0 --interactive                             # Select backup interactively"
    echo "  $0 --file /path/to/backup.sql.gz             # Restore from specific file"
    echo "  $0 --file /path/to/backup.backup --yes       # Restore without confirmation"
}

# Parse command line arguments
BACKUP_FILE=""
LIST_BACKUPS=false
INTERACTIVE=false
SKIP_CONFIRMATION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -l|--list)
            LIST_BACKUPS=true
            shift
            ;;
        -i|--interactive)
            INTERACTIVE=true
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRMATION=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Function to list available backups
list_backups() {
    echo "Available backup files:"
    echo ""
    
    if ls "$BACKUP_DIR"/nagaratrack_backup_* >/dev/null 2>&1; then
        ls -lht "$BACKUP_DIR"/nagaratrack_backup_* | while read -r line; do
            filename=$(echo "$line" | awk '{print $NF}')
            size=$(echo "$line" | awk '{print $5}')
            date=$(echo "$line" | awk '{print $6, $7, $8}')
            echo "  $(basename "$filename") - $size - $date"
        done
    else
        echo "  No backup files found in $BACKUP_DIR"
    fi
}

# Function for interactive backup selection
interactive_selection() {
    echo "Select a backup to restore:"
    echo ""
    
    mapfile -t backup_files < <(find "$BACKUP_DIR" -name "nagaratrack_backup_*" | sort -r)
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        echo "No backup files found in $BACKUP_DIR"
        exit 1
    fi
    
    for i in "${!backup_files[@]}"; do
        filename=$(basename "${backup_files[$i]}")
        size=$(du -h "${backup_files[$i]}" | cut -f1)
        date=$(stat -c %y "${backup_files[$i]}" | cut -d' ' -f1,2 | cut -d'.' -f1)
        echo "  $((i+1)). $filename - $size - $date"
    done
    
    echo ""
    read -p "Enter selection (1-${#backup_files[@]}): " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le "${#backup_files[@]}" ]; then
        BACKUP_FILE="${backup_files[$((selection-1))]}"
    else
        echo "Invalid selection"
        exit 1
    fi
}

# Handle list option
if [ "$LIST_BACKUPS" = true ]; then
    list_backups
    exit 0
fi

# Handle interactive selection
if [ "$INTERACTIVE" = true ]; then
    interactive_selection
fi

# Validate backup file
if [ -z "$BACKUP_FILE" ]; then
    echo "Error: No backup file specified"
    echo ""
    show_usage
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Determine file type and restoration method
if [[ "$BACKUP_FILE" == *.backup ]]; then
    RESTORE_TYPE="custom"
elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    RESTORE_TYPE="compressed_sql"
elif [[ "$BACKUP_FILE" == *.sql ]]; then
    RESTORE_TYPE="sql"
else
    echo "Error: Unsupported backup file format"
    echo "Supported formats: .backup, .sql, .sql.gz"
    exit 1
fi

# Show restoration summary
echo "Database Restore Summary:"
echo "  Source file: $BACKUP_FILE"
echo "  File type: $RESTORE_TYPE"
echo "  Target database: $DB_NAME"
echo "  Target host: $DB_HOST:$DB_PORT"
echo "  Target user: $DB_USER"
echo ""

# Confirmation prompt
if [ "$SKIP_CONFIRMATION" = false ]; then
    echo "WARNING: This will completely replace the existing database!"
    echo "All current data will be lost."
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo "Restoration cancelled"
        exit 0
    fi
fi

echo "Starting database restoration..."

# Perform the restoration based on file type
case $RESTORE_TYPE in
    "custom")
        echo "Restoring from PostgreSQL custom format..."
        PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            --no-password \
            --verbose \
            --clean \
            --if-exists \
            --create \
            -d postgres \
            "$BACKUP_FILE"
        ;;
    
    "compressed_sql")
        echo "Restoring from compressed SQL file..."
        gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            --no-password \
            -d postgres
        ;;
    
    "sql")
        echo "Restoring from SQL file..."
        PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            --no-password \
            -d postgres \
            -f "$BACKUP_FILE"
        ;;
esac

echo ""
echo "Database restoration completed successfully!"

# Verify restoration
echo "Verifying restoration..."
TABLE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "✓ Restoration verified: $TABLE_COUNT tables found in database"
else
    echo "✗ Verification failed: No tables found in database"
    exit 1
fi

echo "Restoration process completed successfully!"