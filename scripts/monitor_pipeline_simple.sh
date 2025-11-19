#!/bin/bash
# Простой мониторинг пайплайна с проверкой каждые 2 минуты

RUN_ID=${1:-19427885543}
MAX_CHECKS=5
INTERVAL=120

echo "Мониторинг пайплайна: $RUN_ID"
echo "URL: https://github.com/thoxly/fin-u-ch/actions/runs/$RUN_ID"
echo "Проверка каждые 2 минуты, максимум $MAX_CHECKS проверок"
echo ""

for i in $(seq 1 $MAX_CHECKS); do
  echo "=== Проверка $i/$MAX_CHECKS ($(date '+%H:%M:%S')) ==="
  
  # Получаем статус через gh CLI
  RESULT=$(gh run view "$RUN_ID" --json status,conclusion,jobs 2>&1)
  
  if [ $? -ne 0 ]; then
    echo "Ошибка: $RESULT"
    sleep 30
    continue
  fi
  
  # Парсим JSON
  STATUS=$(echo "$RESULT" | jq -r '.status')
  CONCLUSION=$(echo "$RESULT" | jq -r '.conclusion // empty')
  FINAL_STATUS="${CONCLUSION:-$STATUS}"
  
  echo "Статус: $FINAL_STATUS"
  
  # Показываем статус всех jobs
  echo "$RESULT" | jq -r '.jobs[] | "  \(if .conclusion == "success" then "✅" elif .conclusion == "failure" then "❌" else "⏳" end) \(.name): \(.conclusion // .status)"'
  
  # Проверяем финальный статус
  if [ "$FINAL_STATUS" = "success" ]; then
    echo ""
    echo "✅ Пайплайн успешно завершен!"
    exit 0
  elif [ "$FINAL_STATUS" = "failure" ] || [ "$FINAL_STATUS" = "cancelled" ]; then
    echo ""
    echo "❌ Пайплайн завершился с ошибкой: $FINAL_STATUS"
    echo ""
    echo "Упавшие jobs:"
    echo "$RESULT" | jq -r '.jobs[] | select(.conclusion == "failure") | "  - \(.name)"'
    exit 1
  else
    echo ""
    echo "⏳ Пайплайн еще выполняется, ждем 2 минуты..."
    sleep $INTERVAL
  fi
done

echo ""
echo "⚠️ Достигнуто максимальное количество проверок"
FINAL=$(gh run view "$RUN_ID" --json status,conclusion --jq -r 'if .conclusion then .conclusion else .status end')
echo "Финальный статус: $FINAL"


