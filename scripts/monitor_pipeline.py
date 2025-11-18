#!/usr/bin/env python3
import subprocess
import time
import sys
import json

def get_run_status(run_id):
    """Получить статус workflow run"""
    try:
        result = subprocess.run(
            ['gh', 'run', 'view', str(run_id), '--json', 'status,conclusion'],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(result.stdout)
        # Если есть conclusion, используем его, иначе status
        return data.get('conclusion') or data.get('status', 'unknown')
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при получении статуса: {e.stderr}")
        return None
    except json.JSONDecodeError:
        print("Ошибка парсинга JSON")
        return None

def monitor_pipeline(run_id, max_iterations=5, check_interval=120):
    """Мониторинг пайплайна с проверкой каждые 2 минуты"""
    print(f"Мониторинг пайплайна: {run_id}")
    print(f"Максимум итераций: {max_iterations} (по {check_interval//60} минуты каждая)")
    print()
    
    for iteration in range(max_iterations):
        print(f"=== Проверка {iteration + 1}/{max_iterations} ===")
        
        status = get_run_status(run_id)
        if status is None:
            print("Не удалось получить статус, повторяем через 30 секунд...")
            time.sleep(30)
            continue
        
        print(f"Статус: {status}")
        
        if status == "success":
            print("✅ Пайплайн успешно завершен!")
            return 0
        elif status in ["failure", "cancelled"]:
            print(f"❌ Пайплайн завершился с ошибкой: {status}")
            return 1
        else:
            print(f"⏳ Пайплайн еще выполняется, ждем {check_interval//60} минуты...")
            time.sleep(check_interval)
    
    print("⚠️ Достигнуто максимальное количество итераций. Проверяем финальный статус...")
    final_status = get_run_status(run_id)
    print(f"Финальный статус: {final_status}")
    
    if final_status == "success":
        return 0
    else:
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 monitor_pipeline.py <run-id>")
        sys.exit(1)
    
    run_id = sys.argv[1]
    exit_code = monitor_pipeline(run_id)
    sys.exit(exit_code)


