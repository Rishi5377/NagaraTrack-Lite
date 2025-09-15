#!/bin/bash

# NagaraTrack Lite Initialization Script
# This script sets up the development environment

set -e

echo "🚀 NagaraTrack Lite - Development Environment Setup"
echo "=================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_status() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Prerequisites check passed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_success ".env file created"
    print_warning "Please review and update .env file with your settings"
else
    print_status ".env file already exists"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data/uploads
mkdir -p logs
mkdir -p backups
print_success "Directories created"

# Set executable permissions for scripts
print_status "Setting executable permissions for scripts..."
chmod +x scripts/*.sh
chmod +x infra/*.sh
print_success "Permissions set"

# Pull and build Docker images
print_status "Pulling and building Docker images..."
docker-compose pull
docker-compose build
print_success "Docker images ready"

# Start services
print_status "Starting services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check backend
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    print_success "Backend is running at http://localhost:8000"
else
    print_warning "Backend may not be ready yet. Check with: docker-compose logs backend"
fi

# Check frontend
if curl -f http://localhost:5000 >/dev/null 2>&1; then
    print_success "Frontend is running at http://localhost:5000"
else
    print_warning "Frontend may not be ready yet. Check with: docker-compose logs frontend"
fi

# Check database
if docker-compose exec -T postgres pg_isready -U nagaratrack -d nagaratrack >/dev/null 2>&1; then
    print_success "Database is ready"
else
    print_warning "Database may not be ready yet. Check with: docker-compose logs postgres"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Services:"
echo "  📱 Frontend (PWA): http://localhost:5000"
echo "  🔌 Backend (API): http://localhost:8000"
echo "  📊 API Docs: http://localhost:8000/docs"
echo "  🗄️  Database: localhost:5432"
echo ""
echo "Useful commands:"
echo "  📋 Check logs: docker-compose logs [service]"
echo "  🔄 Restart: docker-compose restart [service]"
echo "  🛑 Stop all: docker-compose down"
echo "  🔧 Shell access: docker-compose exec [service] /bin/bash"
echo ""
echo "Next steps:"
echo "  1. Review .env file settings"
echo "  2. Visit http://localhost:5000 to see the app"
echo "  3. Visit http://localhost:8000/docs for API documentation"
echo "  4. Check documentation in docs/ folder"
echo ""
print_success "Happy coding! 🚌💨"