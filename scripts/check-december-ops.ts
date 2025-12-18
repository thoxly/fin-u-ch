#!/usr/bin/env tsx
/* eslint-disable no-console */

import prisma from '../apps/api/src/config/db';

async function checkDecemberOps(): Promise<void> {
  try {
    const companyId = '8cc2912d-7ce2-4817-b6df-f4df7bf6d4c0';
    const periodFrom = new Date('2025-12-01T00:00:00.000Z');
    const periodTo = new Date('2025-12-31T23:59:59.999Z');

    console.log('🔍 Checking operations in December 2025...\n');
    console.log(
      `Period: ${periodFrom.toISOString()} - ${periodTo.toISOString()}\n`
    );

    const ops = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: periodFrom,
          lte: periodTo,
        },
        isConfirmed: true,
        isTemplate: false,
      },
      select: {
        id: true,
        operationDate: true,
        type: true,
        amount: true,
      },
      orderBy: {
        operationDate: 'asc',
      },
    });

    console.log(`📊 Found ${ops.length} operations in December 2025\n`);

    if (ops.length > 0) {
      console.log('Operations:');
      ops.forEach((op) => {
        const date = op.operationDate.toISOString().split('T')[0];
        console.log(`  - ${date}: ${op.type} ${op.amount}`);
      });
    } else {
      console.log('⚠️  No operations found in December 2025');
      console.log('\nChecking all operations to see date range...\n');

      const allOps = await prisma.operation.findMany({
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
        take: 5,
      });

      if (allOps.length > 0) {
        console.log('First 5 operations:');
        allOps.forEach((op) => {
          const date = op.operationDate.toISOString().split('T')[0];
          console.log(`  - ${date}: ${op.type} ${op.amount}`);
        });

        const lastOps = await prisma.operation.findMany({
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
            operationDate: 'desc',
          },
          take: 5,
        });

        console.log('\nLast 5 operations:');
        lastOps.forEach((op) => {
          const date = op.operationDate.toISOString().split('T')[0];
          console.log(`  - ${date}: ${op.type} ${op.amount}`);
        });
      }
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
  checkDecemberOps()
    .then(() => {
      console.log('\n✅ Check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
}

export default checkDecemberOps;
