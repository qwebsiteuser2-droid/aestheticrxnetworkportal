#!/bin/bash

# BioAestheticAx Network Production Deployment Script
set -e

echo "🚀 Starting BioAestheticAx Network Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if production.env exists
if [ ! -f "production.env" ]; then
    print_error "production.env file not found. Please create it from env.example and configure it."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p nginx/logs
mkdir -p backend/uploads

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Remove old images to force rebuild
print_status "Removing old images..."
docker-compose -f docker-compose.prod.yml down --rmi all || true

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check if services are running
print_status "Checking service health..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_status "Services are running successfully!"
else
    print_error "Some services failed to start. Check logs with: docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run migration:run

# Seed initial data
print_status "Seeding initial data..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run seed

print_status "🎉 Deployment completed successfully!"
print_warning "Don't forget to:"
print_warning "1. Update your domain name in nginx/nginx.conf"
print_warning "2. Configure SSL certificates in nginx/ssl/"
print_warning "3. Update production.env with your actual credentials"
print_warning "4. Change default admin passwords after first login"

echo ""
print_status "Your application should be accessible at:"
print_status "- HTTP: http://your-domain.com (will redirect to HTTPS)"
print_status "- HTTPS: https://your-domain.com"
print_status "- API: https://your-domain.com/api"
