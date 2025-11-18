#!/bin/bash
# Быстрая проверка статуса пайплайна

RUN_ID=${1:-19427885543}

echo "Проверка пайплайна: $RUN_ID"
gh run view "$RUN_ID" --json status,conclusion,jobs --jq '
  "Статус: " + .status + 
  (if .conclusion then "\nРезультат: " + .conclusion else "" end) + 
  "\n\nJobs:\n" + 
  (.jobs | map("  " + (if .conclusion == "success" then "✅" elif .conclusion == "failure" then "❌" else "⏳" end) + " \(.name): \(.conclusion // .status)") | join("\n"))
'


