import prisma from '../../config/db';
import logger from '../../config/logger';

/**
 * Сервис для генерации моковых данных демо-компании
 */
export class DemoDataGeneratorService {
  /**
   * Создает моковые данные для демо-компании
   * С retry логикой на случай, если каталоги еще не созданы
   */
  async createSampleData(
    companyId: string,
    maxRetries: number = 2
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Проверяем наличие счетов перед генерацией данных
        const accounts = await prisma.account.findMany({
          where: { companyId },
        });
        const mainAccount = accounts.find(
          (a) => a.name === 'Расчетный счет в банке'
        );

        if (!mainAccount && attempt < maxRetries - 1) {
          // Если счет не найден и есть еще попытки, ждем и повторяем
          const delay = 500 * (attempt + 1); // 500ms, 1000ms
          logger.warn(
            `Main account not found for company ${companyId}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        await this.generateSampleOperations(companyId);
        await this.createSamplePlans(companyId);

        logger.info('Demo sample data created successfully', { companyId });
        return;
      } catch (error: any) {
        lastError = error;

        if (attempt === maxRetries - 1) {
          logger.error('Failed to create demo sample data after all retries', {
            error: error.message || error,
            companyId,
            attempts: maxRetries,
          });
          // Не выбрасываем ошибку, так как это фоновый процесс
          return;
        }

        const delay = 500 * (attempt + 1);
        logger.warn(
          `Error creating demo sample data (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`,
          {
            error: error.message || error,
            companyId,
          }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
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

    const mainAccount = accounts.find(
      (a) => a.name === 'Расчетный счет в банке'
    );
    const cashAccount = accounts.find((a) => a.name === 'Касса');

    if (!mainAccount) {
      logger.warn('Main account not found, skipping operations generation');
      return;
    }

    const operations = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Генерируем операции за последние 6 месяцев
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const month = currentMonth - monthOffset;
      const year = currentYear + Math.floor(month / 12);
      const actualMonth = ((month % 12) + 12) % 12;

      // Доходы (2-3 в месяц)
      const revenueArticle = articles.find(
        (a) => a.name === 'Выручка от продаж'
      );
      const customers = counterparties.filter((c) => c.category === 'customer');
      const mainDeal = deals.find((d) => d.name === 'Проект А');

      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        const day = 5 + Math.floor(Math.random() * 20);
        const date = new Date(year, actualMonth, day);
        const customer =
          customers[Math.floor(Math.random() * customers.length)];

        if (revenueArticle && customer) {
          const baseAmount = 150000 + monthOffset * 20000; // Растущий доход
          const amount = baseAmount + Math.floor(Math.random() * 100000);

          operations.push({
            companyId,
            accountId: mainAccount.id,
            articleId: revenueArticle.id,
            counterpartyId: customer.id,
            dealId: mainDeal?.id,
            amount,
            operationDate: date,
            type: 'income',
            currency: 'RUB',
            description: `Оплата за товары/услуги от ${customer.name}`,
          });
        }
      }

      // Зарплата (ежемесячно, 5-е число)
      const salaryArticle = articles.find((a) => a.name === 'Зарплата');
      const employees = counterparties.filter((c) => c.category === 'employee');

      if (salaryArticle && employees.length > 0) {
        const salaryDate = new Date(year, actualMonth, 5);
        const totalSalary = employees.length * 50000;

        operations.push({
          companyId,
          accountId: mainAccount.id,
          articleId: salaryArticle.id,
          counterpartyId: employees[0].id,
          amount: totalSalary,
          operationDate: salaryDate,
          type: 'expense',
          currency: 'RUB',
          description: 'Выплата заработной платы сотрудникам',
        });
      }

      // Аренда офиса (ежемесячно, 10-е число)
      const rentArticle = articles.find((a) => a.name === 'Аренда офиса');
      const suppliers = counterparties.filter((c) => c.category === 'supplier');

      if (rentArticle && suppliers.length > 0) {
        const rentDate = new Date(year, actualMonth, 10);
        const supplier = suppliers[0];

        operations.push({
          companyId,
          accountId: mainAccount.id,
          articleId: rentArticle.id,
          counterpartyId: supplier.id,
          amount: 25000,
          operationDate: rentDate,
          type: 'expense',
          currency: 'RUB',
          description: 'Арендная плата за офисное помещение',
        });
      }

      // Коммунальные услуги (ежемесячно, 12-е число)
      const utilitiesArticle = articles.find(
        (a) => a.name === 'Коммунальные услуги'
      );

      if (utilitiesArticle && suppliers.length > 0) {
        const utilitiesDate = new Date(year, actualMonth, 12);
        const amount = 8000 + Math.floor(Math.random() * 4000);

        operations.push({
          companyId,
          accountId: mainAccount.id,
          articleId: utilitiesArticle.id,
          counterpartyId: suppliers[0].id,
          amount,
          operationDate: utilitiesDate,
          type: 'expense',
          currency: 'RUB',
          description: 'Оплата коммунальных услуг',
        });
      }

      // Маркетинг (1-2 раза в месяц)
      const marketingArticle = articles.find(
        (a) => a.name === 'Реклама и маркетинг'
      );

      if (marketingArticle && suppliers.length > 0) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const day = 15 + Math.floor(Math.random() * 10);
          const date = new Date(year, actualMonth, day);
          const amount = 15000 + Math.floor(Math.random() * 20000);

          operations.push({
            companyId,
            accountId: mainAccount.id,
            articleId: marketingArticle.id,
            counterpartyId: suppliers[0].id,
            amount,
            operationDate: date,
            type: 'expense',
            currency: 'RUB',
            description: 'Расходы на рекламу и маркетинг',
          });
        }
      }

      // Закупка товаров (2-3 раза в месяц)
      const cogsArticle = articles.find((a) => a.name === 'Закупка товаров');

      if (cogsArticle && suppliers.length > 0) {
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const day = 5 + Math.floor(Math.random() * 20);
          const date = new Date(year, actualMonth, day);
          const baseAmount = 30000 + monthOffset * 5000;
          const amount = baseAmount + Math.floor(Math.random() * 30000);
          const supplier =
            suppliers[Math.floor(Math.random() * suppliers.length)];

          operations.push({
            companyId,
            accountId: mainAccount.id,
            articleId: cogsArticle.id,
            counterpartyId: supplier.id,
            amount,
            operationDate: date,
            type: 'expense',
            currency: 'RUB',
            description: `Закупка товаров у ${supplier.name}`,
          });
        }
      }

      // Налоги (ежемесячно, 28-е число)
      const taxArticle = articles.find((a) => a.name === 'Налог на прибыль');
      const gov = counterparties.find((c) => c.name === 'ФНС России');

      if (taxArticle && gov) {
        const taxDate = new Date(year, actualMonth, 28);
        const baseTax = 12000 + monthOffset * 2000;
        const amount = baseTax + Math.floor(Math.random() * 5000);

        operations.push({
          companyId,
          accountId: mainAccount.id,
          articleId: taxArticle.id,
          counterpartyId: gov.id,
          amount,
          operationDate: taxDate,
          type: 'expense',
          currency: 'RUB',
          description: 'Уплата налога на прибыль',
        });
      }

      // Квартальные налоги (каждый 3-й месяц, 15-е число)
      if (actualMonth % 3 === 2) {
        const ndflArticle = articles.find((a) => a.name === 'НДФЛ');

        if (ndflArticle && gov) {
          const ndflDate = new Date(year, actualMonth, 15);
          const amount = 15000 + Math.floor(Math.random() * 10000);

          operations.push({
            companyId,
            accountId: mainAccount.id,
            articleId: ndflArticle.id,
            counterpartyId: gov.id,
            amount,
            operationDate: ndflDate,
            type: 'expense',
            currency: 'RUB',
            description: 'Уплата НДФЛ',
          });
        }
      }

      // Проценты по кредитам (ежемесячно, 15-е число)
      const loanArticle = articles.find(
        (a) => a.name === 'Проценты по кредитам'
      );
      const bank = counterparties.find((c) => c.name === 'ООО "Банк"');

      if (loanArticle && bank) {
        const loanDate = new Date(year, actualMonth, 15);

        operations.push({
          companyId,
          accountId: mainAccount.id,
          articleId: loanArticle.id,
          counterpartyId: bank.id,
          amount: 15000,
          operationDate: loanDate,
          type: 'expense',
          currency: 'RUB',
          description: 'Проценты по банковскому кредиту',
        });
      }

      // Инвестиции (раз в 2-3 месяца)
      if (monthOffset % 2 === 0 || Math.random() > 0.5) {
        const equipmentArticle = articles.find(
          (a) => a.name === 'Покупка оборудования'
        );

        if (equipmentArticle && suppliers.length > 0) {
          const day = 10 + Math.floor(Math.random() * 10);
          const date = new Date(year, actualMonth, day);
          const amount = 80000 + Math.floor(Math.random() * 70000);

          operations.push({
            companyId,
            accountId: mainAccount.id,
            articleId: equipmentArticle.id,
            counterpartyId: suppliers[0].id,
            amount,
            operationDate: date,
            type: 'expense',
            currency: 'RUB',
            description: 'Покупка оборудования',
          });
        }
      }

      // Переводы в кассу (1-2 раза в месяц)
      if (cashAccount) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const day = 5 + Math.floor(Math.random() * 20);
          const date = new Date(year, actualMonth, day);
          const amount = 10000 + Math.floor(Math.random() * 20000);

          operations.push({
            companyId,
            sourceAccountId: mainAccount.id,
            targetAccountId: cashAccount.id,
            amount,
            operationDate: date,
            type: 'transfer',
            currency: 'RUB',
            description: 'Снятие наличных в кассу',
          });
        }
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

    const mainAccount = accounts.find(
      (a) => a.name === 'Расчетный счет в банке'
    );
    if (!mainAccount) {
      logger.warn('Main account not found, skipping plans generation');
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    // Создаем бюджет на текущий год
    const budget = await prisma.budget.create({
      data: {
        companyId,
        name: `Бюджет ${currentYear} года`,
        startDate,
        endDate,
        status: 'active',
      },
    });

    logger.info('Demo budget created', {
      budgetId: budget.id,
      companyId,
      name: budget.name,
    });

    const plans = [];

    // План доходов (ежемесячно)
    const revenueArticle = articles.find((a) => a.name === 'Выручка от продаж');
    const customer = counterparties.find((c) => c.category === 'customer');

    if (revenueArticle && customer) {
      plans.push({
        companyId,
        type: 'income',
        startDate,
        endDate,
        amount: 400000,
        currency: 'RUB',
        articleId: revenueArticle.id,
        accountId: mainAccount.id,
        repeat: 'monthly',
        status: 'active',
        description: 'Плановая ежемесячная выручка',
      });
    }

    // План зарплаты (ежемесячно)
    const salaryArticle = articles.find((a) => a.name === 'Зарплата');
    const employee = counterparties.find((c) => c.category === 'employee');

    if (salaryArticle && employee) {
      plans.push({
        companyId,
        type: 'expense',
        startDate,
        endDate,
        amount: 150000,
        currency: 'RUB',
        articleId: salaryArticle.id,
        accountId: mainAccount.id,
        repeat: 'monthly',
        status: 'active',
        description: 'Ежемесячная выплата заработной платы',
      });
    }

    // План аренды (ежемесячно)
    const rentArticle = articles.find((a) => a.name === 'Аренда офиса');
    const supplier = counterparties.find((c) => c.category === 'supplier');

    if (rentArticle && supplier) {
      plans.push({
        companyId,
        type: 'expense',
        startDate,
        endDate,
        amount: 25000,
        currency: 'RUB',
        articleId: rentArticle.id,
        accountId: mainAccount.id,
        repeat: 'monthly',
        status: 'active',
        description: 'Ежемесячная арендная плата',
      });
    }

    // План коммунальных услуг (ежемесячно)
    const utilitiesArticle = articles.find(
      (a) => a.name === 'Коммунальные услуги'
    );

    if (utilitiesArticle) {
      plans.push({
        companyId,
        type: 'expense',
        startDate,
        endDate,
        amount: 10000,
        currency: 'RUB',
        articleId: utilitiesArticle.id,
        accountId: mainAccount.id,
        repeat: 'monthly',
        status: 'active',
        description: 'Ежемесячные коммунальные услуги',
      });
    }

    // План маркетинга (ежемесячно)
    const marketingArticle = articles.find(
      (a) => a.name === 'Реклама и маркетинг'
    );

    if (marketingArticle) {
      plans.push({
        companyId,
        type: 'expense',
        startDate,
        endDate,
        amount: 30000,
        currency: 'RUB',
        articleId: marketingArticle.id,
        accountId: mainAccount.id,
        repeat: 'monthly',
        status: 'active',
        description: 'Ежемесячные расходы на маркетинг',
      });
    }

    // План закупок (ежемесячно)
    const cogsArticle = articles.find((a) => a.name === 'Закупка товаров');

    if (cogsArticle) {
      plans.push({
        companyId,
        type: 'expense',
        startDate,
        endDate,
        amount: 50000,
        currency: 'RUB',
        articleId: cogsArticle.id,
        accountId: mainAccount.id,
        repeat: 'monthly',
        status: 'active',
        description: 'Ежемесячные закупки товаров',
      });
    }

    // План налогов (ежемесячно)
    const taxArticle = articles.find((a) => a.name === 'Налог на прибыль');
    const gov = counterparties.find((c) => c.name === 'ФНС России');

    if (taxArticle && gov) {
      plans.push({
        companyId,
        type: 'expense',
        startDate,
        endDate,
        amount: 20000,
        currency: 'RUB',
        articleId: taxArticle.id,
        accountId: mainAccount.id,
        repeat: 'monthly',
        status: 'active',
        description: 'Ежемесячные налоги',
      });
    }

    // Квартальные налоги
    const ndflArticle = articles.find((a) => a.name === 'НДФЛ');

    if (ndflArticle && gov) {
      plans.push({
        companyId,
        type: 'expense',
        startDate,
        endDate,
        amount: 50000,
        currency: 'RUB',
        articleId: ndflArticle.id,
        accountId: mainAccount.id,
        repeat: 'quarterly',
        status: 'active',
        description: 'Квартальный НДФЛ',
      });
    }

    // Годовые инвестиции
    const equipmentArticle = articles.find(
      (a) => a.name === 'Покупка оборудования'
    );

    if (equipmentArticle && supplier) {
      plans.push({
        companyId,
        type: 'expense',
        startDate,
        endDate,
        amount: 500000,
        currency: 'RUB',
        articleId: equipmentArticle.id,
        accountId: mainAccount.id,
        repeat: 'annual',
        status: 'active',
        description: 'Годовые инвестиции в оборудование',
      });
    }

    // Создаем планы и связываем их с бюджетом
    for (const plan of plans) {
      await prisma.planItem.create({
        data: {
          ...plan,
          budgetId: budget.id,
        },
      });
    }

    logger.info('Demo plans created', {
      count: plans.length,
      companyId,
      budgetId: budget.id,
    });
  }
}

export default new DemoDataGeneratorService();
