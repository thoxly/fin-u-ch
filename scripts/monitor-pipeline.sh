#!/bin/bash

RUN_ID=$1
MAX_ITERATIONS=5
ITERATION=0

if [ -z "$RUN_ID" ]; then
  echo "Usage: $0 <run-id>"
  exit 1
fi

echo "Мониторинг пайплайна: $RUN_ID"
echo "Максимум итераций: $MAX_ITERATIONS (по 2 минуты каждая)"
echo ""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  echo "=== Проверка $((ITERATION + 1))/$MAX_ITERATIONS ==="
  
  STATUS=$(gh run view "$RUN_ID" --json status,conclusion --jq -r 'if .conclusion then .conclusion else .status end')
  
  echo "Статус: $STATUS"
  
  if [ "$STATUS" = "success" ]; then
    echo "✅ Пайплайн успешно завершен!"
    exit 0
  elif [ "$STATUS" = "failure" ] || [ "$STATUS" = "cancelled" ]; then
    echo "❌ Пайплайн завершился с ошибкой: $STATUS"
    exit 1
  else
    echo "⏳ Пайплайн еще выполняется, ждем 2 минуты..."
    sleep 120
  fi
  
  ITERATION=$((ITERATION + 1))
done

echo "⚠️ Достигнуто максимальное количество итераций. Проверяем финальный статус..."
FINAL_STATUS=$(gh run view "$RUN_ID" --json status,conclusion --jq -r 'if .conclusion then .conclusion else .status end')
echo "Финальный статус: $FINAL_STATUS"

if [ "$FINAL_STATUS" = "success" ]; then
  exit 0
else
  exit 1
fi


