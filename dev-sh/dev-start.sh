#!/bin/bash

# Development Start Script for BioAestheticAx Network
set -e

echo "🚀 Starting BioAestheticAx Network Development Environment..."

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from env.example..."
    if [ -f env.example ]; then
        cp env.example .env
        print_warning "Please update .env file with your actual credentials!"
    else
        print_error "env.example file not found. Cannot create .env file."
        exit 1
    fi
fi

# Build and start services
print_status "Building and starting development services..."
docker compose up -d --build

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 15

# Check if services are running
print_status "Checking service health..."
if docker compose ps | grep -q "Up"; then
    print_status "Services started successfully!"
    
    # Show service status
    echo ""
    print_status "Service Status:"
    docker compose ps
    
    echo ""
    print_status "✅ Development environment is ready!"
    print_warning "Your application is accessible at:"
    print_warning "- Frontend: http://localhost:3000"
    print_warning "- Backend API: http://localhost:4000"
    print_warning "- Database: localhost:5432"
    print_warning "- Redis: localhost:6379"
    echo ""
    print_status "To view logs, run: docker compose logs -f"
    print_status "To stop services, run: docker compose down"
else
    print_error "Some services may not be running. Check with: docker compose ps"
    print_error "View logs with: docker compose logs"
    exit 1
fi

