#!/bin/bash

# Development Restart Script for AestheticRxNetwork
set -e

echo "🔄 Restarting AestheticRxNetwork Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Restart services
print_status "Restarting development services..."
docker compose restart

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check if services are running
print_status "Checking service health..."
if docker compose ps | grep -q "Up"; then
    print_status "Services restarted successfully!"
else
    print_warning "Some services may not be running. Check with: docker compose ps"
fi

print_status "✅ Development environment restarted!"
print_warning "Your application is accessible at:"
print_warning "- Frontend: http://localhost:3000"
print_warning "- Backend API: http://localhost:4000"
