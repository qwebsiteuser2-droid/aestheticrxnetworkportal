#!/bin/bash

# Script to check database state and run migrations on Railway
# This script will:
# 1. Check current database tables
# 2. Check migration status
# 3. Run migrations if needed
# 4. Verify tables were created

set -e

echo "🔍 Checking Railway database state..."
echo ""

# Step 1: Check current tables
echo "📊 Step 1: Checking existing tables..."
railway connect postgres << 'EOF'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
\q
EOF

echo ""
echo "📋 Step 2: Checking migration status..."
railway connect postgres << 'EOF'
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;
\q
EOF

echo ""
echo "🔧 Step 3: Running migrations manually..."
echo "   This will run migrations using Railway CLI"
echo ""

# Check if backend service exists
if railway service list 2>/dev/null | grep -q "backend\|api\|server"; then
    echo "✅ Backend service found, running migrations..."
    railway run --service backend npm run migration:run:prod
else
    echo "⚠️  Backend service not found in Railway project"
    echo "   Migrations should run automatically on backend startup"
    echo "   Check Railway dashboard for backend service logs"
    echo ""
    echo "   To manually run migrations, you can:"
    echo "   1. Go to Railway dashboard"
    echo "   2. Select your backend service"
    echo "   3. Go to 'Deployments' tab"
    echo "   4. Click 'Redeploy' to trigger migrations"
fi

echo ""
echo "✅ Database check complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Check Railway backend logs for migration errors"
echo "   2. Verify tables were created by running this script again"
echo "   3. If tables are still missing, check backend service configuration"

