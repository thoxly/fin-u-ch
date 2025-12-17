#!/usr/bin/env tsx
/* eslint-disable no-console */

import prisma from '../apps/api/src/config/db';

/**
 * Проверяет наличие операций в базе данных
 *
 * Использование:
 *   npx tsx scripts/check-operations.ts [companyId]
 */
async function checkOperations(): Promise<void> {
  try {
    const companyId = process.argv[2];

    console.log('🔍 Checking operations in database...\n');

    if (companyId) {
      console.log(`📋 Checking operations for company: ${companyId}\n`);

      // Проверяем компанию
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              isSuperAdmin: true,
              isActive: true,
            },
          },
        },
      });

      if (!company) {
        console.error(`❌ Company not found: ${companyId}`);
        process.exit(1);
      }

      console.log('📊 Company Info:');
      console.log(`   Name: ${company.name}`);
      console.log(`   Users: ${company.users.length}`);
      company.users.forEach((user) => {
        console.log(
          `     - ${user.email} (${user.isSuperAdmin ? 'Super Admin' : 'Regular'}, ${user.isActive ? 'Active' : 'Inactive'})`
        );
      });
      console.log('');

      // Проверяем операции
      const operationsCount = await prisma.operation.count({
        where: { companyId },
      });

      const confirmedOperationsCount = await prisma.operation.count({
        where: {
          companyId,
          isConfirmed: true,
          isTemplate: false,
        },
      });

      const operationsByType = await prisma.operation.groupBy({
        by: ['type'],
        where: {
          companyId,
          isConfirmed: true,
          isTemplate: false,
        },
        _count: true,
      });

      const operationsByDate = await prisma.operation.findMany({
        where: {
          companyId,
          isConfirmed: true,
          isTemplate: false,
        },
        select: {
          operationDate: true,
          type: true,
          amount: true,
        },
        orderBy: {
          operationDate: 'asc',
        },
        take: 10,
      });

      console.log('💼 Operations:');
      console.log(`   Total: ${operationsCount}`);
      console.log(`   Confirmed (non-template): ${confirmedOperationsCount}`);
      console.log('');

      if (operationsByType.length > 0) {
        console.log('   By Type:');
        operationsByType.forEach((group) => {
          console.log(`     - ${group.type}: ${group._count}`);
        });
        console.log('');
      }

      if (operationsByDate.length > 0) {
        console.log('   First 10 operations:');
        operationsByDate.forEach((op) => {
          const date = new Date(op.operationDate).toISOString().split('T')[0];
          console.log(`     - ${date}: ${op.type} ${op.amount}`);
        });
        console.log('');

        // Проверяем диапазон дат
        const dateRange = await prisma.operation.aggregate({
          where: {
            companyId,
            isConfirmed: true,
            isTemplate: false,
          },
          _min: {
            operationDate: true,
          },
          _max: {
            operationDate: true,
          },
        });

        if (dateRange._min.operationDate && dateRange._max.operationDate) {
          console.log('   Date Range:');
          console.log(
            `     From: ${new Date(dateRange._min.operationDate).toISOString().split('T')[0]}`
          );
          console.log(
            `     To: ${new Date(dateRange._max.operationDate).toISOString().split('T')[0]}`
          );
          console.log('');
        }
      } else {
        console.log('   ⚠️  No confirmed operations found!');
        console.log('');
      }

      // Проверяем счета
      const accountsCount = await prisma.account.count({
        where: { companyId, isActive: true },
      });
      console.log(`💰 Active Accounts: ${accountsCount}`);

      // Проверяем статьи
      const articlesCount = await prisma.article.count({
        where: { companyId, isActive: true },
      });
      console.log(`📝 Active Articles: ${articlesCount}`);
      console.log('');
    } else {
      // Показываем все компании
      const companies = await prisma.company.findMany({
        include: {
          _count: {
            select: {
              users: true,
              operations: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      console.log(
        `📋 Found ${companies.length} companies (showing first 10):\n`
      );

      for (const company of companies) {
        const confirmedOps = await prisma.operation.count({
          where: {
            companyId: company.id,
            isConfirmed: true,
            isTemplate: false,
          },
        });

        console.log(`   ${company.name} (${company.id})`);
        console.log(`     Users: ${company._count.users}`);
        console.log(`     Total Operations: ${company._count.operations}`);
        console.log(`     Confirmed Operations: ${confirmedOps}`);
        console.log('');
      }

      console.log('💡 Tip: Run with company ID to see detailed info:');
      console.log('   npx tsx scripts/check-operations.ts <companyId>');
    }
  } catch (error) {
    console.error('❌ Failed to check operations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  checkOperations()
    .then(() => {
      console.log('✅ Check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
}

export default checkOperations;
