#!/bin/bash

# Firebase Deployment Script for AestheticRxNetwork
set -e

echo "🚀 Deploying AestheticRxNetwork to Firebase Hosting..."

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

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Installing now..."
    npm install -g firebase-tools
    print_status "Firebase CLI installed successfully!"
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_warning "You need to log in to Firebase first."
    print_status "Opening Firebase login..."
    firebase login
fi

# Navigate to project root
cd "$(dirname "$0")"

# Step 1: Build the frontend
print_step "Building Next.js frontend for production..."
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Build the application
print_status "Building the application..."
npm run build

# Check if build was successful
if [ ! -d "out" ]; then
    print_error "Build failed! The 'out' directory was not created."
    exit 1
fi

print_status "Frontend build completed successfully!"

# Step 2: Deploy to Firebase
print_step "Deploying to Firebase Hosting..."
cd ..

# Deploy to Firebase
print_status "Deploying to Firebase..."
firebase deploy --only hosting

print_status "🎉 Deployment completed successfully!"
print_warning "Your website is now live on Firebase Hosting!"
print_warning "You can view it at the URL provided above."

# Optional: Open the deployed site
read -p "Would you like to open the deployed website in your browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    firebase hosting:channel:open live
fi
