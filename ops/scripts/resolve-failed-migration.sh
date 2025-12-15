#!/bin/bash

# Script to resolve failed Prisma migration
# Usage: ./resolve-failed-migration.sh <migration_name> [--applied|--rolled-back]

set -e

MIGRATION_NAME=$1
RESOLVE_TYPE=${2:-"--rolled-back"}

if [ -z "$MIGRATION_NAME" ]; then
  echo "❌ Error: Migration name is required"
  echo "Usage: ./resolve-failed-migration.sh <migration_name> [--applied|--rolled-back]"
  exit 1
fi

echo "🔧 Resolving failed migration: $MIGRATION_NAME"
echo "📋 Resolve type: $RESOLVE_TYPE"

# Check if running in Docker
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
  echo "🐳 Running in Docker container"
  npx prisma migrate resolve $RESOLVE_TYPE "$MIGRATION_NAME"
else
  # Running locally or on server
  if [ -f "docker-compose.prod.yml" ]; then
    echo "🐳 Running via Docker Compose"
    docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate resolve $RESOLVE_TYPE "$MIGRATION_NAME"
  else
    echo "💻 Running locally"
    cd apps/api || cd .  # Try apps/api first, fallback to current dir
    npx prisma migrate resolve $RESOLVE_TYPE "$MIGRATION_NAME"
  fi
fi

echo "✅ Migration resolved successfully!"

