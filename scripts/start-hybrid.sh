#!/bin/bash

# ================================================
# Скрипт для запуска проекта в гибридном режиме
# ================================================
# Фронт и бэк локально, база и Redis в Docker

set -e

echo "🚀 Запуск Fin-U-CH в гибридном режиме..."
echo "📦 База данных и Redis в Docker"
echo "💻 Фронт и бэк локально"
echo ""

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверяем наличие pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm не установлен. Установите pnpm и попробуйте снова."
    exit 1
fi

# Копируем .env.hybrid в .env если его нет
if [ ! -f .env ]; then
    echo "📋 Копируем .env.hybrid в .env..."
    cp .env.hybrid .env
fi

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    pnpm install
fi

# Генерируем Prisma клиент
echo "🔧 Генерируем Prisma клиент..."
pnpm prisma:generate

# Запускаем Docker контейнеры
echo "🐳 Запускаем Docker контейнеры (PostgreSQL + Redis)..."
pnpm docker:hybrid:up

# Ждем пока база данных будет готова
echo "⏳ Ждем готовности базы данных..."
sleep 10

# Запускаем миграции
echo "🗄️ Запускаем миграции базы данных..."
pnpm --filter api prisma:migrate

# Создаем демо пользователя
echo "👤 Создаем демо пользователя..."
pnpm demo:create

echo ""
echo "✅ Готово! Проект запущен в гибридном режиме:"
echo "   🌐 Frontend: http://localhost:5173"
echo "   🔧 API: http://localhost:4000"
echo "   🗄️ PostgreSQL: localhost:5432"
echo "   📦 Redis: localhost:6379"
echo ""
echo "Для остановки используйте: pnpm dev:hybrid:stop"
echo ""

# Запускаем фронт и бэк локально
echo "🚀 Запускаем фронт и бэк локально..."
pnpm --filter api dev &
API_PID=$!

pnpm --filter web dev &
WEB_PID=$!

# Функция для корректного завершения
cleanup() {
    echo ""
    echo "🛑 Останавливаем сервисы..."
    kill $API_PID $WEB_PID 2>/dev/null || true
    pnpm docker:hybrid:down
    echo "✅ Все сервисы остановлены"
    exit 0
}

# Обработчик сигналов для корректного завершения
trap cleanup SIGINT SIGTERM

# Ждем завершения
wait
