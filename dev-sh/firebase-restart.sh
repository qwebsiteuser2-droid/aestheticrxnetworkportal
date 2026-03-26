#!/bin/bash

# Firebase Restart/Redeploy Script for BioAestheticAx Network
set -e

echo "🔄 Restarting BioAestheticAx Network on Firebase Hosting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Navigate to project root
cd "$(dirname "$0")"

# Step 1: Clean previous build
print_step "Cleaning previous build..."
cd frontend

if [ -d "out" ]; then
    print_status "Removing previous build..."
    rm -rf out
fi

if [ -d ".next" ]; then
    print_status "Removing Next.js cache..."
    rm -rf .next
fi

# Step 2: Rebuild the frontend
print_step "Rebuilding Next.js frontend..."
print_status "Installing/updating dependencies..."
npm install

print_status "Building the application..."
npm run build

# Check if build was successful
if [ ! -d "out" ]; then
    print_error "Build failed! The 'out' directory was not created."
    exit 1
fi

print_status "Frontend rebuild completed successfully!"

# Step 3: Redeploy to Firebase
print_step "Redeploying to Firebase Hosting..."
cd ..

print_status "Deploying to Firebase..."
firebase deploy --only hosting

print_status "✅ Restart/Redeploy completed successfully!"
print_warning "Your website has been updated on Firebase Hosting!"
print_warning "Changes should be live within a few minutes."

# Show deployment info
print_status "Deployment completed! Your site is live at:"
firebase hosting:sites:list
