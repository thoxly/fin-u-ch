#!/usr/bin/env node

/**
 * Quick AI review для локальной разработки
 * Проверяет staged files перед коммитом
 * 
 * Использование:
 * node scripts/ai-review/quick-check.js
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 Running quick AI check on staged files...\n');

try {
  // Получить список staged файлов
  const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM')
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);

  if (stagedFiles.length === 0) {
    console.log('No staged files to check.');
    process.exit(0);
  }

  console.log(`Found ${stagedFiles.length} staged file(s):\n`);
  stagedFiles.forEach(file => console.log(`  - ${file}`));
  console.log('\n');

  // Фильтруем только релевантные файлы
  const relevantFiles = stagedFiles.filter(file => {
    const skipPatterns = [
      /package-lock\.json$/,
      /pnpm-lock\.yaml$/,
      /\.d\.ts$/,
      /\.map$/,
      /dist\//,
      /node_modules\//,
      /coverage\//,
      /\.min\./,
    ];

    return !skipPatterns.some(pattern => pattern.test(file)) &&
           /\.(ts|tsx|js|jsx)$/.test(file);
  });

  if (relevantFiles.length === 0) {
    console.log('No relevant code files to check.');
    process.exit(0);
  }

  console.log(`Checking ${relevantFiles.length} code file(s)...\n`);

  // Простые локальные проверки
  let hasIssues = false;

  for (const file of relevantFiles) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const issues = [];

    // Проверка 1: Использование any
    if (/:\s*any\b/.test(content)) {
      issues.push('❌ Found `any` type - use specific types or `unknown`');
    }

    // Проверка 2: console.log в production коде
    if (/console\.(log|debug|info)/.test(content) && !file.includes('test')) {
      issues.push('⚠️  Found console.log - use proper logger');
    }

    // Проверка 3: Commented out code
    if (/(\/\/ .{50,}|\/\* .{100,} \*\/)/.test(content)) {
      issues.push('⚠️  Found commented out code - consider removing');
    }

    // Проверка 4: Missing companyId в Prisma queries (только для API)
    if (file.includes('apps/api') && /prisma\.\w+\.findMany\(/.test(content)) {
      if (!/where:\s*{[^}]*companyId/.test(content)) {
        issues.push('🔴 CRITICAL: Prisma query without companyId filter - data leakage risk!');
        hasIssues = true;
      }
    }

    // Проверка 5: dangerouslySetInnerHTML без sanitization
    if (/dangerouslySetInnerHTML/.test(content) && !/DOMPurify|sanitize/.test(content)) {
      issues.push('🔴 CRITICAL: dangerouslySetInnerHTML without sanitization - XSS risk!');
      hasIssues = true;
    }

    if (issues.length > 0) {
      console.log(`\n📄 ${file}:`);
      issues.forEach(issue => console.log(`  ${issue}`));
    }
  }

  console.log('\n');

  if (hasIssues) {
    console.log('❌ Critical issues found! Please fix before committing.\n');
    console.log('💡 Tip: Review the security-checklist.md and style-guide.md\n');
    process.exit(1);
  } else {
    console.log('✅ Quick check passed!\n');
    console.log('Note: Full AI review will run in CI/CD on PR.\n');
  }

} catch (error) {
  console.error('Error during quick check:', error.message);
  process.exit(1);
}

