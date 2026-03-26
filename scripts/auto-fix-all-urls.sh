#!/bin/bash

# Comprehensive script to find and fix ALL hardcoded URLs
# This script uses sed and grep to automatically fix hardcoded URLs

echo "🔍 Finding all hardcoded URLs..."

# Find all files with hardcoded URLs (excluding config files and tests)
FILES=$(grep -rl "http://localhost:3000\|http://localhost:4000\|railway\.app\|aestheticrxdepolying" \
  backend/src frontend/src \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  2>/dev/null | \
  grep -v "node_modules\|urlConfig\|apiConfig\|getBackendUrl\|getApiUrl\|__tests__\|\.test\." | \
  sort -u)

TOTAL=$(echo "$FILES" | wc -l)
echo "Found $TOTAL files with hardcoded URLs"
echo ""

if [ -z "$FILES" ] || [ "$TOTAL" -eq 0 ]; then
  echo "✅ No files with hardcoded URLs found!"
  exit 0
fi

echo "Files to process:"
echo "$FILES" | head -20
echo ""

read -p "Continue with automatic fixes? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

COUNT=0
for file in $FILES; do
  if [[ "$file" == *"backend"* ]]; then
    # Backend file - use backend functions
    # Fix localhost:3000
    sed -i "s|process\.env\.FRONTEND_URL || 'http://localhost:3000'|getFrontendUrl()|g" "$file"
    sed -i "s|'http://localhost:3000'|getFrontendUrl()|g" "$file"
    sed -i 's|"http://localhost:3000"|getFrontendUrl()|g' "$file"
    sed -i "s|\`http://localhost:3000|\`\${getFrontendUrl()}|g" "$file"
    
    # Fix localhost:3000 with paths
    sed -i "s|'http://localhost:3000\(/[^']*\)'|getFrontendUrlWithPath('\1')|g" "$file"
    sed -i 's|"http://localhost:3000\(/[^"]*\)"|getFrontendUrlWithPath("\1")|g' "$file"
    sed -i "s|\`http://localhost:3000\(/[^\`]*\)\`|\`\${getFrontendUrlWithPath('\1')}\`|g" "$file"
    
    # Fix localhost:4000
    sed -i "s|process\.env\.BACKEND_URL || 'http://localhost:4000'|getBackendUrl()|g" "$file"
    sed -i "s|'http://localhost:4000'|getBackendUrl()|g" "$file"
    sed -i 's|"http://localhost:4000"|getBackendUrl()|g' "$file"
    sed -i "s|\`http://localhost:4000|\`\${getBackendUrl()}|g" "$file"
    
    # Fix localhost:4000 with paths
    sed -i "s|'http://localhost:4000\(/[^']*\)'|getBackendUrlWithPath('\1')|g" "$file"
    sed -i 's|"http://localhost:4000\(/[^"]*\)"|getBackendUrlWithPath("\1")|g' "$file"
    sed -i "s|\`http://localhost:4000\(/[^\`]*\)\`|\`\${getBackendUrlWithPath('\1')}\`|g" "$file"
    
    # Add import if needed
    if grep -q "getFrontendUrl\|getBackendUrl" "$file" && ! grep -q "from '../config/urlConfig'" "$file" && ! grep -q "from '@/config/urlConfig'" "$file"; then
      # Find last import and add after it
      LAST_IMPORT_LINE=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      if [ ! -z "$LAST_IMPORT_LINE" ]; then
        sed -i "${LAST_IMPORT_LINE}a import { getFrontendUrl, getBackendUrl, getFrontendUrlWithPath, getBackendUrlWithPath } from '../config/urlConfig';" "$file"
      else
        # Add at top if no imports
        sed -i "1i import { getFrontendUrl, getBackendUrl, getFrontendUrlWithPath, getBackendUrlWithPath } from '../config/urlConfig';" "$file"
      fi
    fi
    
  elif [[ "$file" == *"frontend"* ]]; then
    # Frontend file - use frontend functions
    # Fix localhost:4000/api
    sed -i "s|process\.env\.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'|getApiUrl()|g" "$file"
    sed -i "s|'http://localhost:4000/api'|getApiUrl()|g" "$file"
    sed -i 's|"http://localhost:4000/api"|getApiUrl()|g' "$file"
    sed -i "s|\`http://localhost:4000/api|\`\${getApiUrl()}|g" "$file"
    
    # Fix localhost:4000/api with paths
    sed -i "s|'http://localhost:4000/api\(/[^']*\)'|getApiEndpoint('\1')|g" "$file"
    sed -i 's|"http://localhost:4000/api\(/[^"]*\)"|getApiEndpoint("\1")|g' "$file"
    sed -i "s|\`http://localhost:4000/api\(/[^\`]*\)\`|\`\${getApiEndpoint('\1')}\`|g" "$file"
    
    # Add import if needed
    if grep -q "getApiUrl\|getApiEndpoint" "$file" && ! grep -q "from '@/lib/apiConfig'" "$file" && ! grep -q "from '../lib/apiConfig'" "$file"; then
      LAST_IMPORT_LINE=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      if [ ! -z "$LAST_IMPORT_LINE" ]; then
        sed -i "${LAST_IMPORT_LINE}a import { getApiUrl, getApiEndpoint } from '@/lib/apiConfig';" "$file"
      else
        sed -i "1i import { getApiUrl, getApiEndpoint } from '@/lib/apiConfig';" "$file"
      fi
    fi
  fi
  
  COUNT=$((COUNT + 1))
  echo "✅ Processed: $file ($COUNT/$TOTAL)"
done

echo ""
echo "✅ Fixed $COUNT files!"
echo "⚠️  Please review the changes and test your application."

