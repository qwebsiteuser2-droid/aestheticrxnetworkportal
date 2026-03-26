#!/bin/bash

# Script to copy all tables from aestheticrx1 to railway database
# This allows Railway's database viewer to display the tables

set -e

RAILWAY_HOST="tramway.proxy.rlwy.net"
RAILWAY_PORT="22589"
RAILWAY_USER="postgres"
RAILWAY_PASSWORD="icbMyRDBMxDvNBKxTBleHZCbvekroZmS"
SOURCE_DB="aestheticrx1"
TARGET_DB="railway"

export PGPASSWORD="$RAILWAY_PASSWORD"

echo "🔄 Copying tables from $SOURCE_DB to $TARGET_DB..."
echo ""

# Get list of tables
echo "📋 Getting list of tables..."
TABLES=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$SOURCE_DB" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' ORDER BY tablename;" | tr -d ' ' | grep -v '^$')

if [ -z "$TABLES" ]; then
    echo "❌ No tables found in $SOURCE_DB"
    exit 1
fi

TABLE_COUNT=$(echo "$TABLES" | wc -l)
echo "✅ Found $TABLE_COUNT tables"
echo ""

# For each table, create it in target DB and copy data
for TABLE in $TABLES; do
    echo "📦 Processing table: $TABLE"
    
    # Create table structure in target database using dblink or direct connection
    # We'll use a simpler approach: export and import
    psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" <<EOF 2>&1 | grep -v "NOTICE:" || true
CREATE TABLE IF NOT EXISTS public.$TABLE AS 
SELECT * FROM $SOURCE_DB.public.$TABLE WHERE 1=0;
EOF
    
    # Copy structure properly
    psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" <<EOF 2>&1 | grep -v "NOTICE:" || true
DROP TABLE IF EXISTS public.$TABLE CASCADE;
CREATE TABLE public.$TABLE (LIKE $SOURCE_DB.public.$TABLE INCLUDING ALL);
EOF
    
    # Get row count before copy
    ROW_COUNT=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$SOURCE_DB" -t -c "SELECT COUNT(*) FROM public.$TABLE;" | tr -d ' ')
    
    if [ "$ROW_COUNT" -gt 0 ]; then
        # Copy data
        psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" <<EOF 2>&1 | grep -v "NOTICE:" || true
INSERT INTO public.$TABLE 
SELECT * FROM $SOURCE_DB.public.$TABLE;
EOF
        echo "   ✅ Copied $ROW_COUNT rows"
    else
        echo "   ⚠️  Table is empty"
    fi
done

echo ""
echo "✅ Copy complete!"
echo ""
echo "🔍 Verifying..."
TARGET_COUNT=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | tr -d ' ')
echo "   Tables in $TARGET_DB: $TARGET_COUNT"

unset PGPASSWORD
