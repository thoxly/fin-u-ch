#!/bin/bash

# Force Docker Update Script
# Обновляет Docker образы на production сервере принудительно

set -e

echo "🚀 Starting force Docker update on production server..."
echo ""

# Переходим в рабочую директорию
cd /opt/fin-u-ch

echo "📋 Step 1: Checking current Docker images..."
docker images | grep fin-u-ch

echo ""
echo "🔐 Step 2: Login to GitHub Container Registry..."
# Замените на ваш токен или используйте переменную окружения
echo "$GHCR_TOKEN" | docker login ghcr.io -u thoxly --password-stdin

echo ""
echo "📥 Step 3: Pulling latest images..."
docker compose -f docker-compose.prod.yml pull api web worker

echo ""
echo "🛑 Step 4: Stopping running containers..."
docker compose -f docker-compose.prod.yml stop api web worker

echo ""
echo "🗑️  Step 5: Removing old containers..."
docker compose -f docker-compose.prod.yml rm -f api web worker

echo ""
echo "🗄️  Step 6: Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

echo ""
echo "🚀 Step 7: Starting services with new images..."
docker compose -f docker-compose.prod.yml up -d --force-recreate api web worker

echo ""
echo "⏳ Step 8: Waiting for services to start (30 seconds)..."
sleep 30

echo ""
echo "🏥 Step 9: Checking health..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "📊 Step 10: Viewing logs (last 50 lines)..."
docker compose -f docker-compose.prod.yml logs --tail=50 api web worker

echo ""
echo "🧹 Step 11: Cleaning up old images..."
docker image prune -af --filter "until=168h"

echo ""
echo "✅ Docker update completed successfully!"
echo ""
echo "📝 To check logs: docker compose -f docker-compose.prod.yml logs -f [api|web|worker]"
echo "📊 To check status: docker compose -f docker-compose.prod.yml ps"

