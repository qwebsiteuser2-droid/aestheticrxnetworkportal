#!/bin/bash

# Script to import local database data to Railway database
# Usage: ./import-local-to-railway.sh

set -e

echo "🔄 Importing local database to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it with: npm i -g @railway/cli"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Install with: sudo apt install postgresql-client"
    exit 1
fi

# Get Railway DATABASE_URL
echo "📡 Getting Railway DATABASE_URL..."
RAILWAY_DB_URL=$(railway variables --json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        for v in data:
            if v.get('name') == 'DATABASE_PUBLIC_URL':
                url = v.get('value', '')
                # Change /railway to /aestheticrx1
                if url.endswith('/railway'):
                    url = url[:-8] + '/aestheticrx1'
                elif url.endswith('/postgres'):
                    url = url[:-9] + '/aestheticrx1'
                print(url)
                break
    else:
        url = data.get('DATABASE_PUBLIC_URL', '')
        if url.endswith('/railway'):
            url = url[:-8] + '/aestheticrx1'
        elif url.endswith('/postgres'):
            url = url[:-9] + '/aestheticrx1'
        print(url)
except:
    pass
" 2>/dev/null)

# If Railway CLI doesn't work, prompt for URL
if [ -z "$RAILWAY_DB_URL" ]; then
    echo "⚠️  Could not get Railway DATABASE_URL automatically"
    echo ""
    echo "Please provide your Railway DATABASE_PUBLIC_URL:"
    echo "1. Go to Railway Dashboard → Postgres Service → Variables"
    echo "2. Find DATABASE_PUBLIC_URL"
    echo "3. Copy it and paste below (change /railway to /aestheticrx1 at the end)"
    echo ""
    read -p "Railway DATABASE_URL: " RAILWAY_DB_URL
    
    if [ -z "$RAILWAY_DB_URL" ]; then
        echo "❌ DATABASE_URL is required"
        exit 1
    fi
fi

echo "✅ Railway database URL found"
echo ""

# Local database connection
LOCAL_DB_URL="postgresql://postgres:password@localhost:5432/aestheticrx1"

# Check if local database is running
echo "🔍 Checking local database..."
if ! docker ps | grep -q postgres; then
    echo "⚠️  Local PostgreSQL container not running"
    echo "   Starting local database..."
    cd "$(dirname "$0")"
    docker-compose up -d postgres
    sleep 5
fi

echo "✅ Local database is running"
echo ""

# Export from local database
echo "📤 Exporting data from local database..."
TEMP_DIR=$(mktemp -d)
EXPORT_FILE="$TEMP_DIR/local_data.sql"

docker exec aestheticrx1_db pg_dump -U postgres -d aestheticrx1 --data-only --inserts > "$EXPORT_FILE" 2>/dev/null || {
    echo "❌ Failed to export from local database"
    echo "   Make sure local database is running: docker-compose up -d postgres"
    rm -rf "$TEMP_DIR"
    exit 1
}

echo "✅ Data exported to temporary file"
echo ""

# Import to Railway
echo "📥 Importing data to Railway database..."
psql "$RAILWAY_DB_URL" < "$EXPORT_FILE" 2>&1 | grep -v "NOTICE:" || {
    echo "⚠️  Some warnings occurred, but import may have succeeded"
}

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Import complete!"
echo ""
echo "💡 Note: If you see constraint errors, some data may already exist."
echo "   This is normal if you've imported before."

