#!/bin/bash

# Claim Mapper Setup Script
# Automates the development environment setup

set -e

echo "🚀 Setting up Claim Mapper development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend API dependencies
echo "📦 Installing backend API dependencies..."
cd backend/api
npm install
cd ../..

# Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from example"
else
    echo "⚠️  .env.local already exists, skipping..."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p backend/ml/models

# Pull required Docker images
echo "🐳 Pulling Docker images..."
docker pull mongo:7.0
docker pull redis:7.2-alpine
docker pull nginx:alpine

# Build Docker images for development
echo "🔨 Building development Docker images..."
docker-compose -f docker-compose.dev.yml build --no-cache

# Start the development environment
echo "🏃 Starting development environment..."
docker-compose -f docker-compose.dev.yml up -d mongo redis

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 10

# Run database migrations/setup if needed
echo "🗄️  Setting up databases..."
# Add any database setup commands here

# Start all services
echo "🌟 Starting all services..."
docker-compose -f docker-compose.dev.yml up -d

# Display service status
echo ""
echo "🎉 Setup complete! Services are starting..."
echo ""
echo "📊 Service URLs:"
echo "  Frontend:    http://localhost:3000"
echo "  API:         http://localhost:8000"
echo "  WebSocket:   ws://localhost:8001"
echo "  ML Service:  http://localhost:8002"
echo "  MongoDB:     mongodb://localhost:27017"
echo "  Redis:       redis://localhost:6379"
echo ""
echo "🔍 Check service status:"
echo "  docker-compose -f docker-compose.dev.yml ps"
echo ""
echo "📋 View logs:"
echo "  docker-compose -f docker-compose.dev.yml logs -f [service-name]"
echo ""
echo "🛑 Stop all services:"
echo "  docker-compose -f docker-compose.dev.yml down"
echo ""

# Check if services are responding
echo "🔍 Checking service health..."
sleep 15

# Check API health
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ API service is responding"
else
    echo "⚠️  API service is not responding yet (may still be starting)"
fi

# Check ML service health
if curl -s http://localhost:8002/health > /dev/null; then
    echo "✅ ML service is responding"
else
    echo "⚠️  ML service is not responding yet (may still be starting)"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Check that all services are running with: docker-compose -f docker-compose.dev.yml ps"
echo "3. View application logs if needed"
echo "4. Start developing!"
echo ""
echo "📚 For more information, see README.md"