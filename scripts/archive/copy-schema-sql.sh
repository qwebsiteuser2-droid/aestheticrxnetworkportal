#!/bin/bash

# Script to copy schema from bioaestheticax1 to railway database using SQL
# This allows Railway's database viewer to display the tables
# Usage: ./copy-schema-sql.sh

set -e

echo "🔧 Copying schema from bioaestheticax1 to railway database..."
echo "   (This allows Railway's database viewer to display tables)"
echo ""

# Railway connection details
RAILWAY_HOST="tramway.proxy.rlwy.net"
RAILWAY_PORT="22589"
RAILWAY_USER="postgres"
RAILWAY_PASSWORD="icbMyRDBMxDvNBKxTBleHZCbvekroZmS"

export PGPASSWORD="$RAILWAY_PASSWORD"

# Get list of tables from bioaestheticax1
echo "📋 Getting table list from bioaestheticax1..."
TABLES=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
    -d bioaestheticax1 \
    -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>&1 | tr -d ' ')

if [ -z "$TABLES" ]; then
    echo "❌ No tables found in bioaestheticax1 database"
    exit 1
fi

TABLE_COUNT=$(echo "$TABLES" | wc -l)
echo "✅ Found $TABLE_COUNT tables"
echo ""

# For each table, create it in railway database using LIKE
echo "📥 Copying table schemas to railway database..."
COPIED=0
SKIPPED=0

for TABLE in $TABLES; do
    if [ -z "$TABLE" ]; then
        continue
    fi
    
    echo -n "   Copying $TABLE... "
    
    # First, we need to connect to bioaestheticax1 to get the table structure, then create in railway
    # Use a cross-database approach via psql
    psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
        -d railway \
        -c "CREATE TABLE IF NOT EXISTS $TABLE (LIKE bioaestheticax1.$TABLE INCLUDING ALL);" \
        > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅"
        COPIED=$((COPIED + 1))
    else
        # Try alternative method: get CREATE TABLE statement and execute it
        CREATE_SQL=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
            -d bioaestheticax1 \
            -t -c "SELECT 'CREATE TABLE IF NOT EXISTS ' || \$1 || ' (' || string_agg(column_name || ' ' || data_type, ', ') || ');' FROM information_schema.columns WHERE table_name = \$1 GROUP BY table_name;" \
            -v table="$TABLE" 2>/dev/null)
        
        if [ ! -z "$CREATE_SQL" ]; then
            psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
                -d railway \
                -c "$CREATE_SQL" > /dev/null 2>&1 && echo "✅" || echo "⚠️"
        else
            echo "⚠️  (may already exist)"
            SKIPPED=$((SKIPPED + 1))
        fi
    fi
done

echo ""
echo "✅ Schema copy complete!"
echo "   Copied: $COPIED tables"
echo "   Skipped: $SKIPPED tables"
echo ""

# Verify
echo "🔍 Verifying tables in railway database..."
RAILWAY_COUNT=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
    -d railway \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1 | tr -d ' ')

echo "   Found $RAILWAY_COUNT tables in railway database"
echo ""
echo "✅ Done! Railway's database viewer should now show your tables."
echo ""
echo "💡 Note: Your backend still uses bioaestheticax1 database (this is correct)."
echo "   The railway database is just for viewing in Railway's UI."
