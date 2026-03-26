#!/bin/bash

# Script to sync images from backend to frontend public directory
# This ensures uploaded images are available for same-origin serving

echo "🔄 Syncing images from backend to frontend..."

# Create directories if they don't exist
mkdir -p frontend/public/products_pics
mkdir -p frontend/public/uploads

# Copy products_pics directory
if [ -d "backend/products_pics" ]; then
    echo "📁 Copying products_pics..."
    cp backend/products_pics/* frontend/public/products_pics/ 2>/dev/null || echo "No files to copy in products_pics"
fi

# Copy uploads directory
if [ -d "backend/uploads" ]; then
    echo "📁 Copying uploads..."
    cp backend/uploads/* frontend/public/uploads/ 2>/dev/null || echo "No files to copy in uploads"
fi

echo "✅ Image sync completed!"
echo "📊 Frontend public directory contents:"
echo "Products pics: $(ls frontend/public/products_pics/ | wc -l) files"
echo "Uploads: $(ls frontend/public/uploads/ | wc -l) files"
