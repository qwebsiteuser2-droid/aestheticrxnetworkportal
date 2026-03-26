#!/bin/bash

echo "🧪 Testing Advertisement Media Loading..."
echo ""

# Test 1: Check if backend is serving uploads
echo "1️⃣ Testing backend static file serving..."
curl -s -I "http://localhost:4000/uploads/advertisements/videos/video-1763289505640-456638713.mp4" | head -3
echo ""

# Test 2: Check active advertisements API
echo "2️⃣ Testing active advertisements API..."
curl -s "http://localhost:4000/api/video-advertisements/active?area_name=desktop_header_banner&device_type=desktop" | jq -r '.data[0] | "Title: \(.title)\nType: \(.type)\nVideo URL: \(.video_url // "N/A")\nImage URL: \(.image_url // "N/A")\nThumbnail URL: \(.thumbnail_url // "N/A")"' 2>/dev/null || echo "No active ads found or API error"
echo ""

# Test 3: Test a specific video file
echo "3️⃣ Testing specific video file access..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/uploads/advertisements/videos/video-1763289505640-456638713.mp4" | grep -q "200"; then
    echo "✅ Video file is accessible"
else
    echo "❌ Video file is NOT accessible"
fi
echo ""

# Test 4: Check frontend is running
echo "4️⃣ Testing frontend accessibility..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" | grep -q "200"; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is NOT accessible"
fi
echo ""

echo "✅ Testing complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Open browser console at http://localhost:3000"
echo "   2. Check for video/image loading logs"
echo "   3. Verify URLs are being constructed correctly"
echo "   4. Check for any CORS or CSP errors"

