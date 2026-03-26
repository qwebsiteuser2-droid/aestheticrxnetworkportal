#!/bin/bash

# Script to upload missing product images to Railway volume
# This uploads images that are referenced in the database but missing from /app/uploads

set -e

echo "🖼️  Uploading missing images to Railway volume..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it with: npm i -g @railway/cli"
    exit 1
fi

RAILWAY_SERVICE="${RAILWAY_SERVICE:-aestheticrxdepolying}"

# List of missing images from the error logs
MISSING_IMAGES=(
    "image-1760873702045-696857732.png"
    "image-1759550392113-13102643.png"
    "image-1759551615278-637439587.png"
    "image-1759551688071-160150830.png"
    "image-1765343717261-864173810.png"
    "image-1766156122218-562424104.png"
    "image-1759054689176-227459151.png"
)

echo "📋 Missing images to upload: ${#MISSING_IMAGES[@]}"
echo ""

# Check if we have any source images to use
# Try to find them in various locations
SOURCE_DIR=""
if [ -d "backend/uploads" ] && [ "$(ls -A backend/uploads 2>/dev/null)" ]; then
    SOURCE_DIR="backend/uploads"
    echo "✅ Found local uploads directory"
elif [ -d "frontend/public/uploads" ] && [ "$(ls -A frontend/public/uploads 2>/dev/null)" ]; then
    SOURCE_DIR="frontend/public/uploads"
    echo "✅ Found frontend public uploads directory"
else
    echo "⚠️  No local uploads directory found"
    echo "   These images need to be re-uploaded through the admin interface"
    echo "   Or you can place them in backend/uploads/ and run this script again"
    exit 0
fi

UPLOADED=0
MISSING=0

for image_file in "${MISSING_IMAGES[@]}"; do
    local_path="${SOURCE_DIR}/${image_file}"
    
    if [ -f "$local_path" ]; then
        echo "📤 Uploading: $image_file..."
        filesize=$(du -h "$local_path" | cut -f1)
        
        # Encode to base64 and upload
        BASE64_CONTENT=$(base64 -w 0 "$local_path" 2>/dev/null || base64 "$local_path")
        
        # For large files, use temp file
        if [ ${#BASE64_CONTENT} -gt 100000 ]; then
            TEMP_B64="/tmp/${image_file}.b64"
            echo "$BASE64_CONTENT" > "$TEMP_B64"
            railway run --service "$RAILWAY_SERVICE" bash -c "
            mkdir -p /app/uploads
            base64 -d < /dev/stdin > /app/uploads/$image_file
            chmod 644 /app/uploads/$image_file
            ls -lh /app/uploads/$image_file
            " < "$TEMP_B64" && {
                rm -f "$TEMP_B64"
                echo "   ✅ Uploaded: $image_file ($filesize)"
                UPLOADED=$((UPLOADED + 1))
            } || {
                rm -f "$TEMP_B64"
                echo "   ❌ Failed: $image_file"
                MISSING=$((MISSING + 1))
            }
        else
            railway run --service "$RAILWAY_SERVICE" bash -c "
            mkdir -p /app/uploads
            echo '$BASE64_CONTENT' | base64 -d > /app/uploads/$image_file
            chmod 644 /app/uploads/$image_file
            ls -lh /app/uploads/$image_file
            " && {
                echo "   ✅ Uploaded: $image_file ($filesize)"
                UPLOADED=$((UPLOADED + 1))
            } || {
                echo "   ❌ Failed: $image_file"
                MISSING=$((MISSING + 1))
            }
        fi
    else
        echo "⚠️  Not found locally: $image_file"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "📊 Upload Summary:"
echo "   ✅ Successfully uploaded: $UPLOADED files"
echo "   ❌ Missing/not found: $MISSING files"

if [ $MISSING -gt 0 ]; then
    echo ""
    echo "💡 For missing images:"
    echo "   1. Re-upload them through the admin interface (they'll persist in the volume)"
    echo "   2. Or place them in backend/uploads/ and run this script again"
fi

echo ""
echo "🔍 Verifying uploads on Railway..."
railway run --service "$RAILWAY_SERVICE" bash -c "
echo 'Files in /app/uploads:'
ls -lh /app/uploads 2>/dev/null | head -10 || echo 'Directory is empty'
echo ''
echo 'Total files:'
ls -1 /app/uploads 2>/dev/null | wc -l | xargs echo
" || echo "⚠️  Could not verify"
