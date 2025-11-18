# Инструкция по мониторингу пайплайна

## Проблема с терминалом

Терминал застрял в состоянии ожидания ввода. Нужно:

1. Нажать `Ctrl+C` чтобы прервать текущую команду
2. Или закрыть терминал и открыть новый

## Быстрая проверка статуса

```bash
cd /Users/shoxy/Projects/fin-u-ch
gh run view 19427885543 --json status,conclusion,jobs --jq '{status: .status, conclusion: .conclusion, jobs: [.jobs[] | {name: .name, status: .status, conclusion: .conclusion}]}'
```

## Мониторинг с проверкой каждые 2 минуты

```bash
cd /Users/shoxy/Projects/fin-u-ch
python3 scripts/check_and_monitor.py 19427885543
```

Или через bash скрипт:

```bash
cd /Users/shoxy/Projects/fin-u-ch
bash scripts/monitor_pipeline_simple.sh 19427885543
```

## Получение логов упавших jobs

```bash
gh run view 19427885543 --log-failed
```

## Просмотр конкретного job

```bash
# Сначала получить список jobs
gh run view 19427885543 --json jobs --jq '.jobs[] | "\(.id) \(.name)"'

# Затем получить логи конкретного job
gh run view 19427885543 --job <job-id> --log
```

## Веб-интерфейс

Прямая ссылка на пайплайн:
https://github.com/thoxly/fin-u-ch/actions/runs/19427885543
