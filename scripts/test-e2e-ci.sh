#!/bin/bash
# Script для локального тестирования E2E в CI-подобном окружении

set -e

echo "🧪 Testing E2E in CI-like environment"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "Creating .env from env.example..."
    cp env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Override for test environment
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fin_u_ch_test"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="test-jwt-secret"
export NODE_ENV="test"
export PORT=4000
export CI=true

echo ""
echo "📦 Building packages..."
pnpm --filter @fin-u-ch/shared build

echo ""
echo "🔨 Building API..."
pnpm --filter api build

echo ""
echo "🔨 Building Web..."
pnpm --filter web build

echo ""
echo "🗄️  Starting PostgreSQL and Redis..."
docker compose -f ops/docker/docker-compose.yml up -d postgres redis

echo ""
echo "⏳ Waiting for databases to be ready..."
sleep 5

echo ""
echo "🔄 Running Prisma migrations..."
cd apps/api
npx prisma migrate deploy
cd ../..

echo ""
echo "🚀 Starting API server..."
cd apps/api
node dist/server.js &
API_PID=$!
echo "API PID: $API_PID"
cd ../..

echo ""
echo "⏳ Waiting for API to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:4000/api/health 2>/dev/null; then
        echo -e "${GREEN}✅ API is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ API failed to start${NC}"
        kill $API_PID 2>/dev/null || true
        exit 1
    fi
    echo "Attempt $i/30: API not ready yet, waiting..."
    sleep 2
done

echo ""
echo "🌐 Starting Web server..."
cd apps/web
npx vite preview --port 3000 --host &
WEB_PID=$!
echo "Web PID: $WEB_PID"
cd ../..

echo ""
echo "⏳ Waiting for Web to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:3000 2>/dev/null; then
        echo -e "${GREEN}✅ Web server is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Web server failed to start${NC}"
        kill $API_PID 2>/dev/null || true
        kill $WEB_PID 2>/dev/null || true
        exit 1
    fi
    echo "Attempt $i/30: Web not ready yet, waiting..."
    sleep 2
done

echo ""
echo "🎭 Running E2E tests..."
cd apps/web

# Run tests
if pnpm test:e2e; then
    echo -e "${GREEN}✅ E2E tests passed!${NC}"
    TEST_RESULT=0
else
    echo -e "${RED}❌ E2E tests failed${NC}"
    TEST_RESULT=1
fi

cd ../..

echo ""
echo "🧹 Cleaning up..."
kill $API_PID 2>/dev/null || true
kill $WEB_PID 2>/dev/null || true

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}======================================"
    echo -e "✅ All tests passed!${NC}"
    echo "======================================"
else
    echo -e "${RED}======================================"
    echo -e "❌ Tests failed${NC}"
    echo "======================================"
fi

exit $TEST_RESULT

