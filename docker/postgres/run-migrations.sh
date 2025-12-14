#!/bin/bash
set -e

# Database Migration Runner
# Safely applies pending migrations to PostgreSQL database
# Usage: DB_HOST=host DB_PORT=port DB_NAME=dbname DB_USER=user DB_PASSWORD=pass ./run-migrations.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration from environment variables
PGHOST="${DB_HOST:-localhost}"
PGPORT="${DB_PORT:-5432}"
PGDATABASE="${DB_NAME:-st44}"
PGUSER="${DB_USER:-postgres}"
PGPASSWORD="${DB_PASSWORD}"

export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

# Determine migrations directory
# When run inside container: /migrations
# When run on host: ./docker/postgres/migrations
if [ -d "/migrations" ]; then
    MIGRATIONS_DIR="/migrations"
else
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Database Migration Runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Database: ${PGDATABASE}@${PGHOST}:${PGPORT}"
echo "User: ${PGUSER}"
echo "Migrations: ${MIGRATIONS_DIR}"
echo ""

# Function to wait for database to be ready
wait_for_database() {
    echo -n "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -q 2>/dev/null; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e " ${RED}✗${NC}"
    echo -e "${RED}ERROR: Database not ready after ${max_attempts} attempts${NC}"
    return 1
}

# Function to check if schema_migrations table exists
check_migrations_table() {
    psql -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations');" 2>/dev/null | grep -q 't'
}

# Function to get applied migrations
get_applied_migrations() {
    if check_migrations_table; then
        psql -t -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | grep -v '^$' | tr -d ' '
    else
        echo ""
    fi
}

# Function to apply a migration
apply_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    echo -n "  Applying ${migration_name}..."
    
    if psql -f "$migration_file" > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        return 0
    else
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}ERROR: Migration failed!${NC}"
        echo -e "${RED}File: ${migration_file}${NC}"
        psql -f "$migration_file" 2>&1 | head -20
        return 1
    fi
}

# Main migration logic
main() {
    # Wait for database
    if ! wait_for_database; then
        exit 1
    fi
    
    # Test connection
    echo -n "Testing database connection..."
    if ! psql -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}ERROR: Cannot connect to database${NC}"
        exit 1
    fi
    echo -e " ${GREEN}✓${NC}"
    echo ""
    
    # Get applied migrations
    echo "Checking applied migrations..."
    applied_migrations=$(get_applied_migrations)
    applied_count=$(echo "$applied_migrations" | grep -c '^' 2>/dev/null || echo "0")
    echo "  Applied migrations: ${applied_count}"
    echo ""
    
    # Get migration files
    migration_files=$(find "$MIGRATIONS_DIR" -name "*.sql" -not -name "TEMPLATE.sql" | sort)
    total_files=$(echo "$migration_files" | grep -c '^')
    echo "  Available migrations: ${total_files}"
    echo ""
    
    # Apply pending migrations
    echo "Applying pending migrations..."
    applied=0
    skipped=0
    failed=0
    
    for migration_file in $migration_files; do
        migration_name=$(basename "$migration_file" .sql)
        migration_version=$(echo "$migration_name" | cut -d'_' -f1)
        
        # Check if already applied
        if echo "$applied_migrations" | grep -q "^${migration_version}$"; then
            echo -e "  Skipping ${migration_name}... ${YELLOW}already applied${NC}"
            skipped=$((skipped + 1))
            continue
        fi
        
        # Apply migration
        if apply_migration "$migration_file"; then
            applied=$((applied + 1))
        else
            failed=$((failed + 1))
            break
        fi
    done
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Migration Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  Applied: ${GREEN}${applied}${NC}"
    echo -e "  Skipped: ${YELLOW}${skipped}${NC}"
    echo -e "  Failed:  ${RED}${failed}${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ $failed -gt 0 ]; then
        echo -e "${RED}Migration failed! Database may be in inconsistent state.${NC}"
        exit 1
    fi
    
    if [ $applied -eq 0 ] && [ $skipped -gt 0 ]; then
        echo -e "${GREEN}All migrations already applied. Database is up to date.${NC}"
    elif [ $applied -gt 0 ]; then
        echo -e "${GREEN}Successfully applied ${applied} migration(s).${NC}"
    fi
    
    echo ""
    
    # Show final migration status
    echo "Current database schema version:"
    final_migrations=$(get_applied_migrations)
    if [ -n "$final_migrations" ]; then
        latest=$(echo "$final_migrations" | tail -1)
        count=$(echo "$final_migrations" | grep -c '^')
        echo "  Latest: ${latest}"
        echo "  Total: ${count} migrations"
    else
        echo "  No migrations applied"
    fi
    
    exit 0
}

# Run main function
main
