#!/bin/bash

# Script to create aestheticrx1 database on Railway
# Usage: ./create-railway-database.sh

set -e

echo "🔧 Creating aestheticrx1 database on Railway..."
echo ""

# Get Railway DATABASE_URL (using default database)
RAILWAY_DEFAULT_URL=$(railway variables --json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        for v in data:
            if v.get('name') == 'DATABASE_PUBLIC_URL':
                print(v.get('value', ''))
                break
    else:
        print(data.get('DATABASE_PUBLIC_URL', ''))
except:
    pass
" 2>/dev/null)

if [ -z "$RAILWAY_DEFAULT_URL" ]; then
    echo "⚠️  Could not get Railway DATABASE_URL automatically"
    echo ""
    echo "Please provide your Railway DATABASE_PUBLIC_URL (the one ending with /railway):"
    read -p "Railway DATABASE_PUBLIC_URL: " RAILWAY_DEFAULT_URL
    
    if [ -z "$RAILWAY_DEFAULT_URL" ]; then
        echo "❌ DATABASE_URL is required"
        exit 1
    fi
fi

echo "✅ Using Railway database: $RAILWAY_DEFAULT_URL"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Install with: sudo apt install postgresql-client"
    exit 1
fi

# Create database
echo "📝 Creating aestheticrx1 database..."
psql "$RAILWAY_DEFAULT_URL" -c "SELECT 1 FROM pg_database WHERE datname='aestheticrx1';" 2>&1 | grep -q "1 row" && {
    echo "✅ Database aestheticrx1 already exists"
} || {
    psql "$RAILWAY_DEFAULT_URL" -c "CREATE DATABASE aestheticrx1;" 2>&1 && {
        echo "✅ Database aestheticrx1 created successfully"
    } || {
        echo "⚠️  Database may already exist or connection failed"
    }
}

echo ""
echo "✅ Done! Now your backend should be able to connect."

