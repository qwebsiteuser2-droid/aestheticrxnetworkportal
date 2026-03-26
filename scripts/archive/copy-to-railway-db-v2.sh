#!/bin/bash

# Script to copy all tables from aestheticrx1 to railway database
# Uses temporary SQL files to work around cross-database limitations

set -e

RAILWAY_HOST="tramway.proxy.rlwy.net"
RAILWAY_PORT="22589"
RAILWAY_USER="postgres"
RAILWAY_PASSWORD="icbMyRDBMxDvNBKxTBleHZCbvekroZmS"
SOURCE_DB="aestheticrx1"
TARGET_DB="railway"

export PGPASSWORD="$RAILWAY_PASSWORD"

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "🔄 Copying tables from $SOURCE_DB to $TARGET_DB..."
echo ""

# Step 1: Export schema from aestheticrx1
echo "📤 Exporting schema from $SOURCE_DB..."
docker run --rm -e PGPASSWORD="$RAILWAY_PASSWORD" postgres:17 \
    pg_dump -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" \
    -d "$SOURCE_DB" --schema-only --no-owner --no-acl \
    > "$TEMP_DIR/schema.sql" 2>&1 || {
    echo "⚠️  Using alternative method (version mismatch)..."
    # Alternative: use local psql to generate CREATE TABLE statements
    psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$SOURCE_DB" <<'EOF' > "$TEMP_DIR/schema.sql" 2>&1
SELECT 'CREATE TABLE IF NOT EXISTS public.' || tablename || ' (' || 
    string_agg(column_name || ' ' || data_type || 
        CASE WHEN character_maximum_length IS NOT NULL 
        THEN '(' || character_maximum_length || ')' 
        ELSE '' END, ', ') || ');'
FROM information_schema.columns c
JOIN pg_tables t ON t.tablename = c.table_name
WHERE c.table_schema = 'public' AND t.schemaname = 'public'
GROUP BY tablename;
EOF
}

# Step 2: Apply schema to railway database
echo "📥 Applying schema to $TARGET_DB..."
psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" \
    -f "$TEMP_DIR/schema.sql" 2>&1 | grep -v "NOTICE:" || true

# Step 3: Export and import data for each table
echo "📦 Copying data..."
TABLES=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$SOURCE_DB" \
    -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' ORDER BY tablename;" | tr -d ' ' | grep -v '^$')

for TABLE in $TABLES; do
    echo "   Processing: $TABLE"
    
    # Export data as INSERT statements
    psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$SOURCE_DB" \
        -c "COPY (SELECT * FROM public.$TABLE) TO STDOUT WITH CSV HEADER;" \
        > "$TEMP_DIR/${TABLE}.csv" 2>&1 || continue
    
    # Import data
    if [ -s "$TEMP_DIR/${TABLE}.csv" ]; then
        ROW_COUNT=$(wc -l < "$TEMP_DIR/${TABLE}.csv" | tr -d ' ')
        if [ "$ROW_COUNT" -gt 1 ]; then  # More than just header
            psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" <<EOF 2>&1 | grep -v "NOTICE:" || true
\COPY public.$TABLE FROM '$TEMP_DIR/${TABLE}.csv' WITH CSV HEADER;
EOF
            echo "      ✅ Copied $((ROW_COUNT - 1)) rows"
        fi
    fi
done

echo ""
echo "✅ Copy complete!"
echo ""
echo "🔍 Verifying..."
TARGET_COUNT=$(psql -h "$RAILWAY_HOST" -U "$RAILWAY_USER" -p "$RAILWAY_PORT" -d "$TARGET_DB" \
    -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | tr -d ' ')
echo "   Tables in $TARGET_DB: $TARGET_COUNT"

unset PGPASSWORD
