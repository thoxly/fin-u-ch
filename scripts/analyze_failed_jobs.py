#!/usr/bin/env python3
"""
Анализ упавших jobs в пайплайне
Использование: python3 analyze_failed_jobs.py <run-id>
"""

import subprocess
import sys
import json

def get_jobs_info(run_id):
    """Получить информацию о всех jobs"""
    try:
        result = subprocess.run(
            ['gh', 'run', 'view', str(run_id), '--json', 'jobs'],
            capture_output=True,
            text=True,
            check=True
        )
        data = json.loads(result.stdout)
        return data.get('jobs', [])
    except Exception as e:
        print(f"Ошибка при получении информации о jobs: {e}", file=sys.stderr)
        return []

def get_job_logs(run_id, job_id, job_name):
    """Получить логи конкретного job"""
    try:
        result = subprocess.run(
            ['gh', 'run', 'view', str(run_id), '--job', str(job_id), '--log'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except Exception as e:
        return f"Ошибка при получении логов: {e}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 analyze_failed_jobs.py <run-id>")
        sys.exit(1)
    
    run_id = sys.argv[1]
    print(f"Анализ упавших jobs для run: {run_id}")
    print("=" * 60)
    print()
    
    jobs = get_jobs_info(run_id)
    
    if not jobs:
        print("Не удалось получить информацию о jobs")
        sys.exit(1)
    
    failed_jobs = [j for j in jobs if j.get('conclusion') == 'failure']
    
    if not failed_jobs:
        print("✅ Нет упавших jobs")
        sys.exit(0)
    
    print(f"Найдено упавших jobs: {len(failed_jobs)}\n")
    
    for job in failed_jobs:
        job_id = job.get('id')
        job_name = job.get('name', 'unknown')
        job_status = job.get('status')
        job_conclusion = job.get('conclusion')
        
        print(f"❌ Job: {job_name}")
        print(f"   ID: {job_id}")
        print(f"   Status: {job_status}")
        print(f"   Conclusion: {job_conclusion}")
        print()
        
        # Получаем логи
        print("   Получение логов...")
        logs = get_job_logs(run_id, job_id, job_name)
        
        # Ищем ключевые ошибки в логах
        error_lines = []
        for line in logs.split('\n'):
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in ['error', 'failed', 'failure', 'exception', 'fatal']):
                error_lines.append(line)
        
        if error_lines:
            print(f"   Найдено {len(error_lines)} строк с ошибками (первые 20):")
            for line in error_lines[:20]:
                print(f"   {line}")
        else:
            print("   Последние 30 строк логов:")
            for line in logs.split('\n')[-30:]:
                if line.strip():
                    print(f"   {line}")
        
        print()
        print("-" * 60)
        print()

if __name__ == '__main__':
    main()


