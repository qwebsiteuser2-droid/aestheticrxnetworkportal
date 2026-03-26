#!/bin/bash

# Script to copy schema from aestheticrx1 to railway database
# This allows Railway's database viewer to display the tables
# Usage: ./copy-schema-to-railway-db.sh

set -e

echo "🔧 Copying schema from aestheticrx1 to railway database..."
echo "   (This allows Railway's database viewer to display tables)"
echo ""

# Railway connection details
RAILWAY_HOST="tramway.proxy.rlwy.net"
RAILWAY_PORT="22589"
RAILWAY_USER="postgres"
RAILWAY_PASSWORD="icbMyRDBMxDvNBKxTBleHZCbvekroZmS"

export PGPASSWORD="$RAILWAY_PASSWORD"

# Export schema from aestheticrx1
echo "📤 Exporting schema from aestheticrx1 database..."
TEMP_FILE=$(mktemp)
pg_dump -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
    -d aestheticrx1 \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    > "$TEMP_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Failed to export schema"
    cat "$TEMP_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi

echo "✅ Schema exported successfully"
echo ""

# Import schema to railway database
echo "📥 Importing schema to railway database..."
psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
    -d railway \
    < "$TEMP_FILE" 2>&1 | grep -v "NOTICE:" | grep -v "already exists" || true

rm -f "$TEMP_FILE"

echo ""
echo "✅ Schema copy complete!"
echo ""
echo "🔍 Verifying tables in railway database..."
TABLE_COUNT=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
    -d railway \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1 | tr -d ' ')

echo "   Found $TABLE_COUNT tables in railway database"
echo ""
echo "✅ Done! Railway's database viewer should now show your tables."
echo ""
echo "💡 Note: Your backend still uses aestheticrx1 database (this is correct)."
echo "   The railway database is just for viewing in Railway's UI."
