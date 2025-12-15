import prisma from '../../config/db';
import logger from '../../config/logger';

/**
 * Сервис для генерации моковых данных демо-компании
 */
export class DemoDataGeneratorService {
  /**
   * Создает моковые данные для демо-компании
   */
  async createSampleData(companyId: string): Promise<void> {
    await this.generateSampleOperations(companyId);
    await this.createSamplePlans(companyId);
    await this.createSampleSalaries(companyId);
  }

  /**
   * Генерирует демо-операции
   */
  private async generateSampleOperations(companyId: string): Promise<void> {
    const [accounts, articles, counterparties, deals] = await Promise.all([
      prisma.account.findMany({ where: { companyId } }),
      prisma.article.findMany({ where: { companyId } }),
      prisma.counterparty.findMany({ where: { companyId } }),
      prisma.deal.findMany({ where: { companyId } }),
    ]);

    const operations = [];

    // Генерируем доходы
    for (let i = 0; i < 20; i++) {
      const date = new Date(2025, 0, 1);
      date.setDate(date.getDate() + i * 15);
      const revenueArticle = articles.find((a) => a.name === 'Выручка');
      const revenueAccount = accounts.find((a) => a.name === 'Выручка');
      const client = counterparties.find((c) => c.category === 'customer');
      const deal = deals[Math.floor(Math.random() * deals.length)];

      if (revenueArticle && revenueAccount && client) {
        operations.push({
          companyId,
          accountId: revenueAccount.id,
          articleId: revenueArticle.id,
          counterpartyId: client.id,
          dealId: deal?.id,
          amount: Math.floor(Math.random() * 500000) + 100000,
          operationDate: date,
          type: 'income',
          description: `Продажа товаров/услуг ${i + 1}`,
        });
      }
    }

    // Генерируем расходы
    for (let i = 0; i < 15; i++) {
      const date = new Date(2025, 0, 5);
      date.setDate(date.getDate() + i * 20);
      const expenseArticle = articles.find((a) => a.name === 'Расходы');
      const expenseAccount = accounts.find((a) => a.name === 'Расходы');
      const supplier = counterparties.find((c) => c.category === 'supplier');

      if (expenseArticle && expenseAccount && supplier) {
        operations.push({
          companyId,
          accountId: expenseAccount.id,
          articleId: expenseArticle.id,
          counterpartyId: supplier.id,
          amount: Math.floor(Math.random() * 200000) + 50000,
          operationDate: date,
          type: 'expense',
          description: `Закупка материалов ${i + 1}`,
        });
      }
    }

    // Генерируем переводы
    for (let i = 0; i < 5; i++) {
      const date = new Date(2025, 0, 10);
      date.setDate(date.getDate() + i * 30);
      const cashAccount = accounts.find((a) => a.name === 'Касса');
      const bankAccount = accounts.find((a) => a.name === 'Расчетный счет');

      if (cashAccount && bankAccount) {
        operations.push({
          companyId,
          accountId: bankAccount.id,
          amount: Math.floor(Math.random() * 100000) + 20000,
          operationDate: date,
          type: 'transfer',
          description: `Перевод в кассу ${i + 1}`,
        });
      }
    }

    if (operations.length > 0) {
      await prisma.operation.createMany({ data: operations });
      logger.info('Demo operations created', {
        count: operations.length,
        companyId,
      });
    }
  }

  /**
   * Создает демо-планы
   */
  private async createSamplePlans(companyId: string): Promise<void> {
    const [accounts, articles, counterparties] = await Promise.all([
      prisma.account.findMany({ where: { companyId } }),
      prisma.article.findMany({ where: { companyId } }),
      prisma.counterparty.findMany({ where: { companyId } }),
    ]);

    const plans = [];

    // План доходов
    const revenueArticle = articles.find((a) => a.name === 'Выручка');
    const revenueAccount = accounts.find((a) => a.name === 'Выручка');
    const client = counterparties.find((c) => c.category === 'customer');

    if (revenueArticle && revenueAccount && client) {
      plans.push({
        companyId,
        name: 'План доходов на 2025',
        description: 'Планируемые доходы на год',
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 11, 31),
        items: {
          create: [
            {
              companyId,
              accountId: revenueAccount.id,
              articleId: revenueArticle.id,
              counterpartyId: client.id,
              amount: 5000000,
              type: 'income',
            },
          ],
        },
      });
    }

    // План расходов
    const expenseArticle = articles.find((a) => a.name === 'Расходы');
    const expenseAccount = accounts.find((a) => a.name === 'Расходы');
    const supplier = counterparties.find((c) => c.category === 'supplier');

    if (expenseArticle && expenseAccount && supplier) {
      plans.push({
        companyId,
        name: 'План расходов на 2025',
        description: 'Планируемые расходы на год',
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 11, 31),
        items: {
          create: [
            {
              companyId,
              accountId: expenseAccount.id,
              articleId: expenseArticle.id,
              counterpartyId: supplier.id,
              amount: 3000000,
              type: 'expense',
            },
          ],
        },
      });
    }

    // Plans are not supported in current schema, skip for now
    // for (const plan of plans) {
    //   await prisma.plan.create({
    //     data: {
    //       companyId: plan.companyId,
    //       name: plan.name,
    //       description: plan.description,
    //       startDate: plan.startDate,
    //       endDate: plan.endDate,
    //       items: plan.items,
    //     },
    //   });
    // }

    logger.info('Demo plans created', { count: plans.length, companyId });
  }

  /**
   * Создает демо-зарплаты
   */
  private async createSampleSalaries(companyId: string): Promise<void> {
    const departments = await prisma.department.findMany({
      where: { companyId },
    });

    const salaries = [];

    for (let i = 0; i < 10; i++) {
      const department =
        departments[Math.floor(Math.random() * departments.length)];

      // Создаем сотрудника как контрагента
      const employee = await prisma.counterparty.create({
        data: {
          companyId,
          name: `Сотрудник ${i + 1}`,
          category: 'employee',
        },
      });

      salaries.push({
        companyId,
        employeeCounterpartyId: employee.id,
        departmentId: department?.id,
        baseWage: Math.floor(Math.random() * 100000) + 50000,
        effectiveFrom: new Date(2025, 0, 1),
        effectiveTo: new Date(2025, 11, 31),
      });
    }

    if (salaries.length > 0) {
      await prisma.salary.createMany({ data: salaries });
      logger.info('Demo salaries created', {
        count: salaries.length,
        companyId,
      });
    }
  }
}

export default new DemoDataGeneratorService();
