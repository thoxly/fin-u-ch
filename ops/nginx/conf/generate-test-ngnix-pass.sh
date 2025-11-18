#!/bin/bash
# Generate 6-character password for admin user

set -e  # Прерывать выполнение при любой ошибке

echo "Generating 6-character password for admin user..."

# Генерация пароля из 6 символов
# Используем openssl для криптографически безопасной генерации случайных данных
PASSWORD=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 6)

/*
 * Объяснение команды генерации:
 * 1. openssl rand -base64 18  - генерирует 18 байт случайных данных в base64 формате
 *    (это дает запас данных для фильтрации)
 * 2. tr -dc 'a-zA-Z0-9'       - удаляет все символы кроме букв и цифр
 *    (-d delete, -c complement - оставляет только указанные символы)
 * 3. head -c 6                - берет первые 6 символов из результата
 */

# Проверяем что пароль имеет правильную длину
if [ ${#PASSWORD} -ne 6 ]; then
    echo "❌ Error: Password length is not 6 characters"
    exit 1
fi

# Выводим сгенерированный пароль в консоль
echo "✅ Generated password: $PASSWORD"

# Сохраняем логин и пароль в файл .hpassword
echo "admin:$PASSWORD" > .hpassword
chmod 600 .htpasswd  # Только владелец может читать/писать
