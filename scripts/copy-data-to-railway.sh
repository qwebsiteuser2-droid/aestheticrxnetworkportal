#!/bin/bash

# Copy data from bioaestheticax1 to railway database tables
# ⚠️ SECURITY: Uses environment variables for credentials

set -e

# Use environment variables or prompt for credentials
RAILWAY_HOST="${RAILWAY_HOST:-${DATABASE_HOST}}"
RAILWAY_PORT="${RAILWAY_PORT:-${DATABASE_PORT:-5432}}"
RAILWAY_USER="${RAILWAY_USER:-${DATABASE_USER:-postgres}}"
RAILWAY_PASSWORD="${RAILWAY_PASSWORD:-${DATABASE_PASSWORD}}"
SOURCE_DB="${SOURCE_DB:-bioaestheticax1}"
TARGET_DB="${TARGET_DB:-railway}"

# Validate required variables
if [ -z "$RAILWAY_PASSWORD" ]; then
    echo "❌ ERROR: RAILWAY_PASSWORD or DATABASE_PASSWORD environment variable must be set"
    echo "   Usage: RAILWAY_PASSWORD=your_password ./scripts/copy-data-to-railway.sh"
    exit 1
fi

if [ -z "$RAILWAY_HOST" ]; then
    echo "❌ ERROR: RAILWAY_HOST or DATABASE_HOST environment variable must be set"
    exit 1
fi

export PGPASSWORD="$RAILWAY_PASSWORD"

echo "🔄 Copying data from $SOURCE_DB to $TARGET_DB..."
echo ""

# Get list of tables
TABLES=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$SOURCE_DB" \
    -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' ORDER BY tablename;" | tr -d ' ' | grep -v '^$')

for TABLE in $TABLES; do
    # Get row count in source
    SOURCE_COUNT=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$SOURCE_DB" \
        -t -c "SELECT COUNT(*) FROM public.$TABLE;" | tr -d ' ')
    
    # Get row count in target
    TARGET_COUNT=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" \
        -t -c "SELECT COUNT(*) FROM public.$TABLE;" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$SOURCE_COUNT" -gt 0 ] && [ "$TARGET_COUNT" -ne "$SOURCE_COUNT" ]; then
        echo "📦 Copying $TABLE ($SOURCE_COUNT rows)..."
        
        # Use COPY to export and import
        TEMP_FILE=$(mktemp)
        psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$SOURCE_DB" \
            -c "COPY (SELECT * FROM public.$TABLE) TO STDOUT WITH CSV HEADER;" > "$TEMP_FILE" 2>&1
        
        if [ -s "$TEMP_FILE" ]; then
            # Truncate target table first
            psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" \
                -c "TRUNCATE TABLE public.$TABLE CASCADE;" 2>&1 | grep -v "NOTICE:" || true
            
            # Import data
            psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" \
                -c "\COPY public.$TABLE FROM '$TEMP_FILE' WITH CSV HEADER;" 2>&1 | grep -v "NOTICE:" || true
            
            NEW_COUNT=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" \
                -t -c "SELECT COUNT(*) FROM public.$TABLE;" | tr -d ' ')
            echo "   ✅ Copied $NEW_COUNT rows"
        fi
        rm -f "$TEMP_FILE"
    elif [ "$TARGET_COUNT" -eq "$SOURCE_COUNT" ] && [ "$SOURCE_COUNT" -gt 0 ]; then
        echo "   ✓ $TABLE already has $TARGET_COUNT rows (skipping)"
    fi
done

echo ""
echo "✅ Data copy complete!"
echo ""
echo "🔍 Final verification..."
TARGET_TABLES=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" \
    -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | tr -d ' ')
echo "   Tables in $TARGET_DB: $TARGET_TABLES"

# Show sample data counts
echo ""
echo "📊 Sample table row counts:"
psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" <<EOF
SELECT 'doctors' as table_name, COUNT(*) as count FROM doctors
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'contact_platforms', COUNT(*) FROM contact_platforms
LIMIT 10;
EOF

unset PGPASSWORD
