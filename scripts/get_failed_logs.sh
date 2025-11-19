#!/bin/bash
# Получить логи упавших jobs

RUN_ID=${1:-19427885543}
OUTPUT_FILE=${2:-/tmp/pipeline_failed_logs.txt}

echo "Получение логов упавших jobs для run: $RUN_ID"
echo "Вывод будет сохранен в: $OUTPUT_FILE"
echo ""

gh run view "$RUN_ID" --log-failed > "$OUTPUT_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Логи получены. Первые 300 строк:"
  echo "=========================================="
  head -300 "$OUTPUT_FILE"
  echo ""
  echo "=========================================="
  echo "Полный лог сохранен в: $OUTPUT_FILE"
  echo "Для просмотра: cat $OUTPUT_FILE | less"
else
  echo "❌ Ошибка при получении логов"
  exit 1
fi


