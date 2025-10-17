import prisma from '../../config/db';
import logger from '../../config/logger';

/**
 * Сервис для генерации демо-данных (операции, планы, зарплаты)
 */
export class DemoDataGeneratorService {
  /**
   * Создает демо-данные для компании
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
    const accounts = await prisma.account.findMany({ where: { companyId } });
    const articles = await prisma.article.findMany({ where: { companyId } });
    const counterparties = await prisma.counterparty.findMany({
      where: { companyId },
    });
    const deals = await prisma.deal.findMany({ where: { companyId } });

    const operations = [];

    // Генерируем доходы
    for (let i = 0; i < 20; i++) {
      const date = new Date(2025, 0, 1 + i * 15);
      const revenueArticle = articles.find((a) => a.type === 'revenue');
      const revenueAccount = accounts.find((a) => a.type === 'revenue');
      const client = counterparties.find((c) => c.type === 'client');
      const deal = deals[Math.floor(Math.random() * deals.length)];

      if (revenueArticle && revenueAccount && client && deal) {
        operations.push({
          companyId,
          type: 'income',
          operationDate: date,
          amount: Math.floor(Math.random() * 100000) + 10000,
          currency: 'RUB',
          accountId: revenueAccount.id,
          articleId: revenueArticle.id,
          counterpartyId: client.id,
          dealId: deal.id,
          description: `Продажа товаров/услуг ${i + 1}`,
        });
      }
    }

    // Генерируем расходы
    for (let i = 0; i < 15; i++) {
      const date = new Date(2025, 0, 5 + i * 20);
      const expenseArticle = articles.find((a) => a.type === 'expense');
      const expenseAccount = accounts.find((a) => a.type === 'expense');
      const supplier = counterparties.find((c) => c.type === 'supplier');

      if (expenseArticle && expenseAccount && supplier) {
        operations.push({
          companyId,
          type: 'expense',
          operationDate: date,
          amount: Math.floor(Math.random() * 50000) + 5000,
          currency: 'RUB',
          accountId: expenseAccount.id,
          articleId: expenseArticle.id,
          counterpartyId: supplier.id,
          description: `Закупка материалов ${i + 1}`,
        });
      }
    }

    // Генерируем переводы
    for (let i = 0; i < 5; i++) {
      const date = new Date(2025, 0, 10 + i * 30);
      const cashAccount = accounts.find((a) => a.name === 'Касса');
      const bankAccount = accounts.find((a) => a.name === 'Расчетный счет');

      if (cashAccount && bankAccount) {
        operations.push({
          companyId,
          type: 'transfer',
          operationDate: date,
          amount: Math.floor(Math.random() * 100000) + 20000,
          currency: 'RUB',
          sourceAccountId: bankAccount.id,
          targetAccountId: cashAccount.id,
          description: `Перевод с расчетного счета в кассу ${i + 1}`,
        });
      }
    }

    if (operations.length > 0) {
      await prisma.operation.createMany({ data: operations });
      logger.info('Demo operations created', {
        companyId,
        count: operations.length,
      });
    }
  }

  /**
   * Создает демо-планы
   */
  private async createSamplePlans(companyId: string): Promise<void> {
    const accounts = await prisma.account.findMany({ where: { companyId } });
    const articles = await prisma.article.findMany({ where: { companyId } });
    const counterparties = await prisma.counterparty.findMany({
      where: { companyId },
    });

    const plans = [];

    // Планы доходов
    for (let i = 0; i < 5; i++) {
      const revenueArticle = articles.find((a) => a.type === 'revenue');
      const revenueAccount = accounts.find((a) => a.type === 'revenue');
      const client = counterparties.find((c) => c.type === 'client');

      if (revenueArticle && revenueAccount && client) {
        plans.push({
          companyId,
          name: `План доходов ${i + 1}`,
          description: `Планируемые доходы на ${i + 1} квартал`,
          type: 'income',
          amount: Math.floor(Math.random() * 200000) + 100000,
          currency: 'RUB',
          accountId: revenueAccount.id,
          articleId: revenueArticle.id,
          counterpartyId: client.id,
          startDate: new Date(2025, i * 3, 1),
          endDate: new Date(2025, (i + 1) * 3, 0),
          periodicity: 'monthly',
          effectiveFrom: new Date(2025, i * 3, 1),
          effectiveTo: new Date(2025, (i + 1) * 3, 0),
        });
      }
    }

    // Планы расходов
    for (let i = 0; i < 8; i++) {
      const expenseArticle = articles.find((a) => a.type === 'expense');
      const expenseAccount = accounts.find((a) => a.type === 'expense');
      const supplier = counterparties.find((c) => c.type === 'supplier');

      if (expenseArticle && expenseAccount && supplier) {
        plans.push({
          companyId,
          name: `План расходов ${i + 1}`,
          description: `Планируемые расходы на ${i + 1} месяц`,
          type: 'expense',
          amount: Math.floor(Math.random() * 100000) + 20000,
          currency: 'RUB',
          accountId: expenseAccount.id,
          articleId: expenseArticle.id,
          counterpartyId: supplier.id,
          startDate: new Date(2025, i, 1),
          endDate: new Date(2025, i + 1, 0),
          periodicity: 'monthly',
          effectiveFrom: new Date(2025, i, 1),
          effectiveTo: new Date(2025, i + 1, 0),
        });
      }
    }

    if (plans.length > 0) {
      await prisma.planItem.createMany({ data: plans });
      logger.info('Demo plans created', { companyId, count: plans.length });
    }
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

      salaries.push({
        companyId,
        employeeName: `Сотрудник ${i + 1}`,
        position: `Должность ${i + 1}`,
        departmentId: department?.id,
        baseSalary: Math.floor(Math.random() * 100000) + 50000,
        currency: 'RUB',
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 11, 31),
        isActive: true,
      });
    }

    if (salaries.length > 0) {
      await prisma.salary.createMany({ data: salaries });
      logger.info('Demo salaries created', {
        companyId,
        count: salaries.length,
      });
    }
  }
}

export default new DemoDataGeneratorService();
