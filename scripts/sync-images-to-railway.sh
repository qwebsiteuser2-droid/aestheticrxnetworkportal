#!/bin/bash

# Script to sync images from local backend to Railway
# Usage: ./scripts/sync-images-to-railway.sh

set -e

echo "🖼️  Syncing images from local to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it with: npm i -g @railway/cli"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if local image directories exist
UPLOADS_DIR="backend/uploads"
PRODUCTS_PICS_DIR="backend/products_pics"

if [ ! -d "$UPLOADS_DIR" ] && [ ! -d "$PRODUCTS_PICS_DIR" ]; then
    echo "❌ No image directories found!"
    echo "   Expected: $UPLOADS_DIR or $PRODUCTS_PICS_DIR"
    exit 1
fi

# Create temporary directory for archive
TEMP_DIR=$(mktemp -d)
ARCHIVE_FILE="$TEMP_DIR/images.tar.gz"

echo "📦 Creating archive of images..."

# Create archive with both directories if they exist
if [ -d "$UPLOADS_DIR" ] && [ -d "$PRODUCTS_PICS_DIR" ]; then
    tar -czf "$ARCHIVE_FILE" -C backend uploads products_pics
    echo "   ✅ Archived uploads and products_pics"
elif [ -d "$UPLOADS_DIR" ]; then
    tar -czf "$ARCHIVE_FILE" -C backend uploads
    echo "   ✅ Archived uploads"
elif [ -d "$PRODUCTS_PICS_DIR" ]; then
    tar -czf "$ARCHIVE_FILE" -C backend products_pics
    echo "   ✅ Archived products_pics"
fi

ARCHIVE_SIZE=$(du -h "$ARCHIVE_FILE" | cut -f1)
echo "   📊 Archive size: $ARCHIVE_SIZE"
echo ""

# Check Railway connection
echo "🔍 Checking Railway connection..."
RAILWAY_CONNECTED=false

# Try to check if we're connected
if railway status &>/dev/null; then
    RAILWAY_CONNECTED=true
    echo "✅ Connected to Railway project"
elif railway variables &>/dev/null; then
    RAILWAY_CONNECTED=true
    echo "✅ Railway CLI is authenticated"
else
    echo "⚠️  Railway CLI not linked. Attempting to use service name directly..."
    echo "   If this fails, please run manually:"
    echo "   1. railway login"
    echo "   2. railway link"
    echo "   3. Then run this script again"
    echo ""
    echo "   Or specify service name: RAILWAY_SERVICE=backend ./scripts/sync-images-to-railway.sh"
    echo ""
    
    # Try to proceed anyway with service name
    RAILWAY_SERVICE="${RAILWAY_SERVICE:-backend}"
    echo "   Attempting to use service: $RAILWAY_SERVICE"
fi

echo ""

# Upload archive to Railway and extract
echo "📤 Uploading images to Railway..."
echo "   This may take a while depending on image sizes..."
echo ""

# Ensure directories exist on Railway
RAILWAY_SERVICE="${RAILWAY_SERVICE:-backend}"
echo "   📁 Creating directories on Railway (service: $RAILWAY_SERVICE)..."

# Try multiple possible paths
railway run --service "$RAILWAY_SERVICE" bash -c "
if [ -d /app ]; then
    mkdir -p /app/uploads /app/products_pics 2>/dev/null || true
    echo 'Created in /app'
elif [ -d /workspace ]; then
    mkdir -p /workspace/uploads /workspace/products_pics 2>/dev/null || true
    echo 'Created in /workspace'
else
    mkdir -p ./uploads ./products_pics 2>/dev/null || true
    echo 'Created in current directory'
fi
" || {
    echo "⚠️  Failed to create directories via Railway CLI"
    echo "   This might be okay if directories already exist"
    echo "   Continuing anyway..."
}

# Method: Upload files individually using base64 encoding
# This is more reliable than trying to upload a large archive

UPLOADED_COUNT=0
FAILED_COUNT=0

# Sync uploads directory
if [ -d "$UPLOADS_DIR" ]; then
    echo "   📁 Syncing uploads directory..."
    UPLOAD_FILES=$(find "$UPLOADS_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" \) 2>/dev/null | head -100)
    
    for file in $UPLOAD_FILES; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            filesize=$(du -h "$file" | cut -f1)
            echo "      📤 Uploading: $filename ($filesize)..."
            
            # Encode file to base64 and upload
            BASE64_CONTENT=$(base64 -w 0 "$file" 2>/dev/null || base64 "$file")
            
            # For large files, use a temp file approach
            if [ ${#BASE64_CONTENT} -gt 100000 ]; then
                TEMP_B64="/tmp/${filename}.b64"
                echo "$BASE64_CONTENT" > "$TEMP_B64"
                railway run --service "$RAILWAY_SERVICE" bash -c "
                cd backend || cd . 2>/dev/null
                mkdir -p uploads
                base64 -d < /dev/stdin > uploads/$filename
                " < "$TEMP_B64" && {
                    rm -f "$TEMP_B64"
                    echo "         ✅ Uploaded: $filename"
                    UPLOADED_COUNT=$((UPLOADED_COUNT + 1))
                } || {
                    rm -f "$TEMP_B64"
                    echo "         ❌ Failed: $filename"
                    FAILED_COUNT=$((FAILED_COUNT + 1))
                }
            else
                railway run --service "$RAILWAY_SERVICE" bash -c "
                cd backend || cd . 2>/dev/null
                mkdir -p uploads
                echo '$BASE64_CONTENT' | base64 -d > uploads/$filename
                " && {
                    echo "         ✅ Uploaded: $filename"
                    UPLOADED_COUNT=$((UPLOADED_COUNT + 1))
                } || {
                    echo "         ❌ Failed: $filename"
                    FAILED_COUNT=$((FAILED_COUNT + 1))
                }
            fi
        fi
    done
fi

# Sync products_pics directory
if [ -d "$PRODUCTS_PICS_DIR" ]; then
    echo "   📁 Syncing products_pics directory..."
    PRODUCT_FILES=$(find "$PRODUCTS_PICS_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" \) 2>/dev/null | head -100)
    
    for file in $PRODUCT_FILES; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            filesize=$(du -h "$file" | cut -f1)
            echo "      📤 Uploading: $filename ($filesize)..."
            
            # Encode file to base64 and upload
            BASE64_CONTENT=$(base64 -w 0 "$file" 2>/dev/null || base64 "$file")
            
            # For large files, use a temp file approach
            if [ ${#BASE64_CONTENT} -gt 100000 ]; then
                # Large file - write to temp file first
                TEMP_B64="/tmp/${filename}.b64"
                echo "$BASE64_CONTENT" > "$TEMP_B64"
                railway run --service "$RAILWAY_SERVICE" bash -c "
                cd backend || cd . 2>/dev/null
                mkdir -p products_pics
                base64 -d < /dev/stdin > products_pics/$filename
                " < "$TEMP_B64" && {
                    rm -f "$TEMP_B64"
                    echo "         ✅ Uploaded: $filename"
                    UPLOADED_COUNT=$((UPLOADED_COUNT + 1))
                } || {
                    rm -f "$TEMP_B64"
                    echo "         ❌ Failed: $filename"
                    FAILED_COUNT=$((FAILED_COUNT + 1))
                }
            else
                # Small file - use direct method
                railway run --service "$RAILWAY_SERVICE" bash -c "
                cd backend || cd . 2>/dev/null
                mkdir -p products_pics
                echo '$BASE64_CONTENT' | base64 -d > products_pics/$filename
                " && {
                    echo "         ✅ Uploaded: $filename"
                    UPLOADED_COUNT=$((UPLOADED_COUNT + 1))
                } || {
                    echo "         ❌ Failed: $filename"
                    FAILED_COUNT=$((FAILED_COUNT + 1))
                }
            fi
        fi
    done
fi

echo ""
echo "📊 Upload Summary:"
echo "   ✅ Successfully uploaded: $UPLOADED_COUNT files"
if [ "$FAILED_COUNT" -gt 0 ]; then
    echo "   ❌ Failed: $FAILED_COUNT files"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Image sync complete!"
echo ""
echo "🔍 Verifying images on Railway..."
railway run --service "$RAILWAY_SERVICE" bash -c "
echo 'Uploads directory:'
ls -la /app/uploads 2>/dev/null | wc -l | xargs echo '  Files:'
echo 'Products pics directory:'
ls -la /app/products_pics 2>/dev/null | wc -l | xargs echo '  Files:'
" || echo "⚠️  Could not verify (this is okay - check manually)"

echo ""
echo "💡 Check image status at: https://bioaestheticaxdepolying-production.up.railway.app/api/public/image-diagnostics"
