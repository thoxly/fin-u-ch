#!/bin/bash

# ================================================
# Умный скрипт для запуска проекта в гибридном режиме
# ================================================
# Фронт и бэк локально, база и Redis в Docker
# Автоматически решает проблемы с портами, Docker, Prisma

set -e

echo "🚀 Запуск Fin-U-CH в гибридном режиме..."
echo "📦 База данных и Redis в Docker"
echo "💻 Фронт и бэк локально"
echo ""

# Функция для освобождения портов
free_ports() {
    echo "🔧 Проверяем и освобождаем порты..."
    
    # Список портов для проверки
    PORTS=(4000 5173 5432 6379)
    
    for port in "${PORTS[@]}"; do
        # Находим процессы на порту
        PIDS=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            echo "⚠️  Порт $port занят, освобождаем..."
            echo "$PIDS" | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    done
    
    echo "✅ Порты освобождены"
}

# Функция для проверки и запуска Docker
ensure_docker() {
    echo "🐳 Проверяем Docker..."
    
    # Проверяем наличие Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
        exit 1
    fi
    
    # Проверяем, запущен ли Docker daemon
    if ! docker info &> /dev/null; then
        echo "⚠️  Docker не запущен, запускаем..."
        open -a Docker
        echo "⏳ Ждем запуска Docker (30 сек)..."
        sleep 30
        
        # Проверяем еще раз
        if ! docker info &> /dev/null; then
            echo "❌ Не удалось запустить Docker. Запустите Docker Desktop вручную."
            exit 1
        fi
    fi
    
    echo "✅ Docker готов"
}

# Проверяем наличие pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm не установлен. Установите pnpm и попробуйте снова."
    exit 1
fi

# Выполняем предварительные проверки
free_ports
ensure_docker

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

# Проверяем подключение к базе данных
echo "🔍 Проверяем подключение к базе данных..."
for i in {1..10}; do
    if pnpm --filter api prisma db push --accept-data-loss &>/dev/null; then
        echo "✅ База данных готова"
        break
    else
        echo "⏳ Попытка $i/10 - ждем базу данных..."
        sleep 3
    fi
done

# Запускаем миграции
echo "🗄️ Запускаем миграции базы данных..."
pnpm --filter api prisma:migrate

# Создаем демо пользователя (игнорируем ошибку если уже существует)
echo "👤 Создаем демо пользователя..."
pnpm demo:create || echo "ℹ️  Демо пользователь уже существует"

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

# Запускаем API в фоне
pnpm --filter api dev &
API_PID=$!

# Ждем запуска API
echo "⏳ Ждем запуска API..."
sleep 5

# Проверяем, что API запустился
if ! kill -0 $API_PID 2>/dev/null; then
    echo "❌ API не запустился"
    exit 1
fi

# Запускаем Web в фоне
pnpm --filter web dev &
WEB_PID=$!

# Ждем запуска Web
echo "⏳ Ждем запуска Web..."
sleep 3

# Проверяем, что Web запустился
if ! kill -0 $WEB_PID 2>/dev/null; then
    echo "❌ Web не запустился"
    kill $API_PID 2>/dev/null || true
    exit 1
fi

# Функция для корректного завершения
cleanup() {
    echo ""
    echo "🛑 Останавливаем сервисы..."
    
    # Останавливаем процессы
    kill $API_PID $WEB_PID 2>/dev/null || true
    
    # Ждем завершения процессов
    wait $API_PID $WEB_PID 2>/dev/null || true
    
    # Останавливаем Docker контейнеры
    echo "🐳 Останавливаем Docker контейнеры..."
    pnpm docker:hybrid:down
    
    echo "✅ Все сервисы остановлены"
    exit 0
}

# Обработчик сигналов для корректного завершения
trap cleanup SIGINT SIGTERM

echo ""
echo "🎉 Проект успешно запущен!"
echo "   🌐 Frontend: http://localhost:5173"
echo "   🔧 API: http://localhost:4000"
echo "   🗄️ PostgreSQL: localhost:5432"
echo "   📦 Redis: localhost:6379"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

# Ждем завершения
wait
