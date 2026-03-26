#!/bin/bash
set -e

# Navigate to backend directory
cd backend

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the TypeScript application
echo "Building application..."
npm run build

# Start the application
echo "Starting application..."
npm start

