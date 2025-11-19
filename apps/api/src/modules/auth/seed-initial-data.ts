import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import logger from '../../config/logger';

// Правильный тип для транзакции Prisma - используем официальный тип из Prisma
type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Создает начальные данные для новой компании
 * Вызывается при регистрации
 */
export async function seedInitialData(
  tx: TransactionClient,
  companyId: string
): Promise<void> {
  const txClient = tx;
  try {
    // 1. СЧЕТА
    logger.info('Creating accounts for company', { companyId });
    const accounts = await txClient.account.createMany({
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
    logger.info('Creating articles for company', { companyId });
    await txClient.article.createMany({
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
    logger.info('Creating departments for company', { companyId });
    await txClient.department.createMany({
      data: [
        {
          companyId,
          name: 'Основное подразделение',
          description: null,
        },
      ],
    });

    // 4. КОНТРАГЕНТЫ - минимальный набор
    logger.info('Creating counterparties for company', { companyId });
    await txClient.counterparty.createMany({
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
    logger.info('Creating deals for company', { companyId });
    const createdDepartments = await txClient.department.findMany({
      where: { companyId },
      take: 1,
    });
    const createdCounterparties = await txClient.counterparty.findMany({
      where: { companyId },
      take: 1,
    });

    if (createdDepartments.length > 0 && createdCounterparties.length > 0) {
      await txClient.deal.createMany({
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
    } else {
      logger.warn(
        'Could not create deal - missing departments or counterparties',
        {
          companyId,
          departmentsCount: createdDepartments.length,
          counterpartiesCount: createdCounterparties.length,
        }
      );
    }

    logger.info('Initial data seeded successfully', {
      companyId,
      accounts: accounts.count,
    });
  } catch (error: unknown) {
    const errorDetails = {
      companyId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorCode:
        error && typeof error === 'object' && 'code' in error
          ? error.code
          : undefined,
      errorMeta:
        error && typeof error === 'object' && 'meta' in error
          ? error.meta
          : undefined,
      errorName: error instanceof Error ? error.name : undefined,
    };

    logger.error('Error during seed initial data', errorDetails);

    // Пробрасываем ошибку с более понятным сообщением
    if (error instanceof Error) {
      throw new Error(`Failed to seed initial data: ${error.message}`);
    }
    throw error;
  }
}
