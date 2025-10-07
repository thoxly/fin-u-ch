# AI Code Review

Автоматический code review с использованием Claude API.

## Установка

```bash
cd scripts/ai-review
pnpm install
```

## Конфигурация

Создайте `.env` файл или установите переменные окружения:

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
GITHUB_REPOSITORY_OWNER=your-org
GITHUB_REPOSITORY_NAME=fin-u-ch
```

## Использование

### Локальный запуск

```bash
cd scripts/ai-review

# Собрать проект
pnpm build

# Запустить review для PR #123
pnpm start 123

# Или в dev режиме без сборки
pnpm dev 123
```

### В GitHub Actions

Workflow автоматически запускает AI review для каждого PR:

```yaml
- name: Run AI Code Review
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_PR_NUMBER: ${{ github.event.pull_request.number }}
  run: |
    cd scripts/ai-review
    pnpm install
    pnpm build
    pnpm start
```

## Как это работает

1. **Загружает контекст проекта** из документации (ARCHITECTURE.md, style-guide.md, etc.)
2. **Получает diff PR** через GitHub API
3. **Отправляет в Claude** для анализа
4. **Парсит ответ** и создает комментарии к PR
5. **Определяет результат review**:
   - `REQUEST_CHANGES` - если найдены critical/high issues
   - `COMMENT` - если только medium/low issues
   - `APPROVE` - если проблем не найдено

## Уровни серьезности

- **CRITICAL**: Уязвимости безопасности (missing companyId, SQL injection, XSS, exposed secrets)
- **HIGH**: Баги, утечки данных, отсутствие обработки ошибок
- **MEDIUM**: Проблемы производительности, отсутствие валидации, плохие паттерны
- **LOW**: Стилистические проблемы, мелкие улучшения

## Что проверяется

- ✅ TypeScript strict types (no `any`)
- ✅ Multi-tenancy security (companyId filters)
- ✅ Security issues (OWASP Top 10)
- ✅ Performance (N+1 queries, missing indexes)
- ✅ Error handling and validation
- ✅ React patterns and hooks rules
- ✅ Prisma best practices
- ✅ Code simplicity and readability

## Отладка

Если AI review не работает:

1. Проверьте переменные окружения
2. Проверьте логи в GitHub Actions
3. Запустите локально с `pnpm dev <pr-number>`
4. Проверьте формат ответа Claude (должен быть JSON)

## Ограничения

- Максимум 10 файлов на batch
- Claude API лимиты: 8000 tokens на ответ
- Не проверяет сгенерированные файлы (dist/, \*.d.ts, etc.)
