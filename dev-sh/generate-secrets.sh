#!/bin/bash

# Generate Secure Secrets for AestheticRxNetwork Backend
# This script generates secure JWT secrets for production use

echo "🔐 Generating Secure Secrets for AestheticRxNetwork Backend..."
echo ""

# Generate JWT_SECRET (64 characters for extra security)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Generate JWT_REFRESH_SECRET (64 characters for extra security)
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "✅ Generated secure secrets!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Copy these values to your Railway environment variables:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Keep these secrets secure and never commit them to version control"
echo "   - Each secret is 64 characters long (exceeds the 32 character minimum)"
echo "   - Add these to Railway: Settings → Variables → Add Variable"
echo ""
echo "💡 Quick copy commands:"
echo "   echo 'JWT_SECRET=$JWT_SECRET'"
echo "   echo 'JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET'"
echo ""

