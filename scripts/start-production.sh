#!/bin/bash

# Quick Production Start Script for AestheticRxNetwork
set -e

echo "🚀 Starting AestheticRxNetwork in Production Mode..."

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

# Check if production.env exists
if [ ! -f "production.env" ]; then
    print_warning "production.env not found. Creating from env.example..."
    cp env.example production.env
    print_warning "Please edit production.env with your actual values before running again."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p nginx/logs
mkdir -p backend/uploads

# Stop existing containers
print_status "Stopping existing containers..."
docker compose -f docker-compose.prod-http.yml down || true

# Build and start services
print_status "Building and starting services..."
docker compose -f docker-compose.prod-http.yml up --build -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check if services are running
print_status "Checking service health..."
if docker compose -f docker-compose.prod-http.yml ps | grep -q "Up"; then
    print_status "Services are running successfully!"
else
    print_error "Some services failed to start. Check logs with: docker compose -f docker-compose.prod-http.yml logs"
    exit 1
fi

# Run database migrations
print_status "Running database migrations..."
docker compose -f docker-compose.prod-http.yml exec -T backend npm run migration:run

# Seed initial data
print_status "Seeding initial data..."
docker compose -f docker-compose.prod-http.yml exec -T backend npm run seed

print_status "🎉 Application started successfully!"
print_warning "Your application is accessible at:"
print_warning "- Frontend: http://localhost"
print_warning "- Backend API: http://localhost/api"
print_warning "- Direct Backend: http://localhost:4000"

print_warning "Default admin credentials:"
print_warning "- Email: Check your production.env MAIN_ADMIN_EMAIL"
print_warning "- Password: ChangeMe123!"

print_warning "Don't forget to:"
print_warning "1. Change default admin passwords"
print_warning "2. Configure your domain and SSL certificates"
print_warning "3. Update production.env with your actual credentials"
