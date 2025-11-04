import { PrismaClient } from '@prisma/client';
import logger from '../../config/logger';

/**
 * Создает начальные данные для новой компании
 * Вызывается при регистрации
 */
export async function seedInitialData(
  tx: PrismaClient,
  companyId: string
): Promise<void> {
  // 1. СЧЕТА
  const accounts = await tx.account.createMany({
    data: [
      {
        companyId,
        name: 'Расчетный счет в банке',
        number: null,
        currency: 'RUB',
        openingBalance: 0,
        isActive: true,
      },
      {
        companyId,
        name: 'Касса',
        number: null,
        currency: 'RUB',
        openingBalance: 0,
        isActive: true,
      },
      {
        companyId,
        name: 'Корпоративная карта',
        number: null,
        currency: 'RUB',
        openingBalance: 0,
        isActive: true,
      },
    ],
  });

  // 2. СТАТЬИ - только ключевые (5-6 статей)
  await tx.article.createMany({
    data: [
      {
        companyId,
        name: 'Выручка от продаж',
        type: 'income',
        activity: 'operating',
        isActive: true,
      },
      {
        companyId,
        name: 'Зарплата',
        type: 'expense',
        activity: 'operating',
        isActive: true,
      },
      {
        companyId,
        name: 'Аренда офиса',
        type: 'expense',
        activity: 'operating',
        isActive: true,
      },
      {
        companyId,
        name: 'Налоги',
        type: 'expense',
        activity: 'operating',
        isActive: true,
      },
      {
        companyId,
        name: 'Покупка оборудования',
        type: 'expense',
        activity: 'investing',
        isActive: true,
      },
      {
        companyId,
        name: 'Проценты по кредитам',
        type: 'expense',
        activity: 'financing',
        isActive: true,
      },
    ],
  });

  // 3. ПОДРАЗДЕЛЕНИЯ - минимальный набор
  await tx.department.createMany({
    data: [
      {
        companyId,
        name: 'Основное подразделение',
        description: null,
      },
    ],
  });

  // 4. КОНТРАГЕНТЫ - минимальный набор
  await tx.counterparty.createMany({
    data: [
      {
        companyId,
        name: 'Общий контрагент',
        category: 'other',
        inn: null,
        description: null,
      },
    ],
  });

  // 5. СДЕЛКИ - минимальный набор
  const createdDepartments = await tx.department.findMany({
    where: { companyId },
    take: 1,
  });
  const createdCounterparties = await tx.counterparty.findMany({
    where: { companyId },
    take: 1,
  });

  if (createdDepartments.length > 0 && createdCounterparties.length > 0) {
    await tx.deal.createMany({
      data: [
        {
          companyId,
          name: 'Общая сделка',
          departmentId: createdDepartments[0].id,
          counterpartyId: createdCounterparties[0].id,
          amount: null,
          description: null,
        },
      ],
    });
  }

  logger.info('Initial data seeded successfully', {
    companyId,
    accounts: accounts.count,
  });
}
