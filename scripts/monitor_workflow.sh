#!/bin/bash
# Простой скрипт для мониторинга GitHub Actions workflow

RUN_ID=$1
if [ -z "$RUN_ID" ]; then
  echo "Usage: $0 <run-id>"
  exit 1
fi

MAX_CHECKS=5
CHECK_INTERVAL=120  # 2 минуты

for i in $(seq 1 $MAX_CHECKS); do
  echo "=== Проверка $i/$MAX_CHECKS ==="
  
  # Получаем статус
  STATUS_OUTPUT=$(gh run view "$RUN_ID" --json status,conclusion 2>/dev/null)
  
  if [ $? -ne 0 ]; then
    echo "Ошибка при получении статуса"
    sleep 30
    continue
  fi
  
  STATUS=$(echo "$STATUS_OUTPUT" | jq -r '.status')
  CONCLUSION=$(echo "$STATUS_OUTPUT" | jq -r '.conclusion // empty')
  
  FINAL_STATUS="${CONCLUSION:-$STATUS}"
  
  echo "Статус: $FINAL_STATUS"
  
  if [ "$FINAL_STATUS" = "success" ]; then
    echo "✅ Пайплайн успешно завершен!"
    exit 0
  elif [ "$FINAL_STATUS" = "failure" ] || [ "$FINAL_STATUS" = "cancelled" ]; then
    echo "❌ Пайплайн завершился с ошибкой: $FINAL_STATUS"
    echo ""
    echo "Получаем список jobs..."
    gh run view "$RUN_ID" --json jobs --jq '.jobs[] | select(.conclusion == "failure") | "❌ \(.name): \(.conclusion)"'
    exit 1
  else
    echo "⏳ Пайплайн еще выполняется, ждем 2 минуты..."
    sleep $CHECK_INTERVAL
  fi
done

echo "⚠️ Достигнуто максимальное количество проверок"
FINAL=$(gh run view "$RUN_ID" --json status,conclusion --jq -r 'if .conclusion then .conclusion else .status end')
echo "Финальный статус: $FINAL"


