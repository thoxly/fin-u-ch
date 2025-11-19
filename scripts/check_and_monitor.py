#!/usr/bin/env python3
"""
Скрипт для проверки и мониторинга GitHub Actions пайплайна
Использование: python3 check_and_monitor.py <run-id>
"""

import subprocess
import time
import sys
import json
from datetime import datetime

def run_gh_command(cmd):
    """Выполнить команду gh CLI"""
    try:
        result = subprocess.run(
            ['gh'] + cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Ошибка выполнения команды: {e.stderr}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"Ошибка парсинга JSON: {e}", file=sys.stderr)
        return None

def get_run_status(run_id):
    """Получить статус workflow run"""
    return run_gh_command(['run', 'view', str(run_id), '--json', 'status,conclusion,jobs'])

def print_status(data):
    """Вывести статус пайплайна"""
    if not data:
        return
    
    status = data.get('status', 'unknown')
    conclusion = data.get('conclusion')
    jobs = data.get('jobs', [])
    
    final_status = conclusion or status
    print(f"Статус: {final_status}")
    print(f"\nJobs ({len(jobs)}):")
    
    for job in jobs:
        job_status = job.get('conclusion') or job.get('status', 'unknown')
        name = job.get('name', 'unknown')
        
        if job_status == 'success':
            icon = '✅'
        elif job_status == 'failure':
            icon = '❌'
        else:
            icon = '⏳'
        
        print(f"  {icon} {name}: {job_status}")
    
    return final_status, jobs

def monitor_pipeline(run_id, max_iterations=5, interval=120):
    """Мониторинг пайплайна"""
    print(f"Мониторинг пайплайна: {run_id}")
    print(f"URL: https://github.com/thoxly/fin-u-ch/actions/runs/{run_id}")
    print(f"Проверка каждые {interval//60} минуты, максимум {max_iterations} проверок")
    print()
    
    for iteration in range(max_iterations):
        print(f"=== Проверка {iteration + 1}/{max_iterations} ({datetime.now().strftime('%H:%M:%S')}) ===")
        
        data = get_run_status(run_id)
        if not data:
            print("Не удалось получить статус, повторяем через 30 секунд...")
            time.sleep(30)
            continue
        
        final_status, jobs = print_status(data)
        
        # Проверяем упавшие jobs
        failed_jobs = [j for j in jobs if j.get('conclusion') == 'failure']
        
        if final_status == 'success':
            print("\n✅ Пайплайн успешно завершен!")
            return 0
        elif final_status in ['failure', 'cancelled']:
            print(f"\n❌ Пайплайн завершился с ошибкой: {final_status}")
            if failed_jobs:
                print("\nУпавшие jobs:")
                for job in failed_jobs:
                    print(f"  - {job.get('name')}")
            return 1
        else:
            print(f"\n⏳ Пайплайн еще выполняется, ждем {interval//60} минуты...")
            time.sleep(interval)
    
    print("\n⚠️ Достигнуто максимальное количество проверок")
    final_data = get_run_status(run_id)
    if final_data:
        final_status, _ = print_status(final_data)
        return 0 if final_status == 'success' else 1
    
    return 1

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 check_and_monitor.py <run-id>")
        sys.exit(1)
    
    run_id = sys.argv[1]
    exit_code = monitor_pipeline(run_id)
    sys.exit(exit_code)


