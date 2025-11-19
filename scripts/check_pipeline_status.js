#!/usr/bin/env node

const { execSync } = require('child_process');

const runId = process.argv[2];

if (!runId) {
  console.error('Usage: node check_pipeline_status.js <run-id>');
  process.exit(1);
}

try {
  const output = execSync(
    `gh run view ${runId} --json status,conclusion,jobs --jq '{status: .status, conclusion: .conclusion, jobs: [.jobs[] | {name: .name, status: .status, conclusion: .conclusion}]}'`,
    { encoding: 'utf-8', stdio: 'pipe' }
  );
  
  const data = JSON.parse(output);
  console.log('Статус пайплайна:', data.status);
  console.log('Результат:', data.conclusion || 'в процессе');
  console.log('\nJobs:');
  data.jobs.forEach(job => {
    const icon = job.conclusion === 'success' ? '✅' : job.conclusion === 'failure' ? '❌' : '⏳';
    console.log(`  ${icon} ${job.name}: ${job.conclusion || job.status}`);
  });
  
  // Проверяем есть ли упавшие jobs
  const failedJobs = data.jobs.filter(j => j.conclusion === 'failure');
  if (failedJobs.length > 0) {
    console.log('\n❌ Упавшие jobs:');
    failedJobs.forEach(job => {
      console.log(`  - ${job.name}`);
    });
    process.exit(1);
  }
  
  if (data.conclusion === 'success') {
    console.log('\n✅ Все jobs прошли успешно!');
    process.exit(0);
  } else if (data.conclusion === 'failure') {
    console.log('\n❌ Пайплайн завершился с ошибкой');
    process.exit(1);
  } else {
    console.log('\n⏳ Пайплайн еще выполняется');
    process.exit(0);
  }
} catch (error) {
  console.error('Ошибка:', error.message);
  process.exit(1);
}


