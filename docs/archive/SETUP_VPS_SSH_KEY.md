# Настройка VPS_SSH_KEY для GitHub Actions

## Что нужно сделать

Добавить SSH ключ для доступа к VPS в GitHub Secrets, чтобы GitHub Actions мог автоматически настроить GHCR на сервере.

## Шаги

### 1. Скопировать SSH ключ

Выполните команду для отображения вашего SSH ключа:

```bash
cat ~/.ssh/id_rsa_server
```

Скопируйте **весь вывод** (включая строки `-----BEGIN` и `-----END`).

### 2. Добавить в GitHub Secrets

1. Откройте: https://github.com/thoxly/fin-u-ch/settings/secrets/actions

2. Нажмите **"New repository secret"**

3. Заполните:
   - **Name:** `VPS_SSH_KEY`
   - **Value:** вставьте скопированный ключ

4. Нажмите **"Add secret"**

### 3. Запустить настройку GHCR

После добавления секрета:

1. Откройте: https://github.com/thoxly/fin-u-ch/actions

2. Выберите workflow **"CI/CD with AI Review"**

3. Нажмите **"Run workflow"** (справа)

4. Выберите branch: **main**

5. Нажмите зеленую кнопку **"Run workflow"**

Workflow автоматически:

- Подключится к VPS через SSH
- Выполнит `docker login ghcr.io` используя ваш GHCR_TOKEN
- Проверит доступ к образам

### 4. Проверка результата

После завершения workflow:

- Откройте вкладку "Actions" в GitHub
- Найдите запущенный workflow
- Проверьте логи job "Setup GHCR Access on VPS"
- Должно быть: ✅ GHCR login successful!

## Альтернативный способ (если не хотите добавлять ключ в GitHub)

Выполните команду локально (замените YOUR_GHCR_TOKEN):

```bash
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139 "echo YOUR_GHCR_TOKEN | docker login ghcr.io -u thoxly --password-stdin"
```

## Проверка

После настройки проверьте на сервере:

```bash
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139 "cat ~/.docker/config.json"
```

Должны увидеть конфигурацию с `ghcr.io` в `auths`.
