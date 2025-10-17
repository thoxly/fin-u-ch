import prisma from '../../config/db';
import logger from '../../config/logger';

/**
 * Сервис для создания начальных каталогов демо-компании
 */
export class DemoCatalogsService {
  /**
   * Создает начальные справочники для демо-компании
   */
  async createInitialCatalogs(companyId: string): Promise<void> {
    await this.createAccounts(companyId);
    await this.createDepartments(companyId);
    await this.createCounterparties(companyId);
    await this.createArticles(companyId);
    await this.createDeals(companyId);
  }

  /**
   * Создает счета для демо-компании
   */
  private async createAccounts(companyId: string): Promise<void> {
    await prisma.account.createMany({
      data: [
        {
          companyId,
          name: 'Касса',
          currency: 'RUB',
          openingBalance: 50000,
          isActive: true,
        },
        {
          companyId,
          name: 'Расчетный счет',
          currency: 'RUB',
          openingBalance: 1000000,
          isActive: true,
        },
        {
          companyId,
          name: 'Выручка',
          currency: 'RUB',
          openingBalance: 0,
          isActive: true,
        },
        {
          companyId,
          name: 'Расходы',
          currency: 'RUB',
          openingBalance: 0,
          isActive: true,
        },
        {
          companyId,
          name: 'Уставный капитал',
          currency: 'RUB',
          openingBalance: 100000,
          isActive: true,
        },
      ],
    });

    logger.info('Demo accounts created', { companyId });
  }

  /**
   * Создает отделы для демо-компании
   */
  private async createDepartments(companyId: string): Promise<void> {
    await prisma.department.createMany({
      data: [
        {
          id: 'demo-dept-sales',
          companyId,
          name: 'Отдел продаж',
          description: 'Отдел продаж и маркетинга',
        },
        {
          id: 'demo-dept-finance',
          companyId,
          name: 'Финансовый отдел',
          description: 'Финансовый отдел и бухгалтерия',
        },
        {
          id: 'demo-dept-hr',
          companyId,
          name: 'HR отдел',
          description: 'Отдел кадров',
        },
        {
          id: 'demo-dept-it',
          companyId,
          name: 'IT отдел',
          description: 'Отдел информационных технологий',
        },
      ],
    });

    logger.info('Demo departments created', { companyId });
  }

  /**
   * Создает контрагентов для демо-компании
   */
  private async createCounterparties(companyId: string): Promise<void> {
    await prisma.counterparty.createMany({
      data: [
        {
          id: 'demo-counterparty-client1',
          companyId,
          name: 'ООО "Клиент 1"',
          category: 'customer',
          inn: '1234567890',
        },
        {
          id: 'demo-counterparty-client2',
          companyId,
          name: 'ИП Иванов И.И.',
          category: 'customer',
          inn: '0987654321',
        },
        {
          id: 'demo-counterparty-supplier1',
          companyId,
          name: 'ООО "Поставщик 1"',
          category: 'supplier',
          inn: '1122334455',
        },
        {
          id: 'demo-counterparty-supplier2',
          companyId,
          name: 'ООО "Поставщик 2"',
          category: 'supplier',
          inn: '5544332211',
        },
      ],
    });

    logger.info('Demo counterparties created', { companyId });
  }

  /**
   * Создает статьи для демо-компании
   */
  private async createArticles(companyId: string): Promise<void> {
    // Создаем родительские статьи
    const parentArticles = await prisma.article.createMany({
      data: [
        {
          id: 'demo-article-revenue',
          companyId,
          name: 'Доходы',
          type: 'income',
          parentId: null,
        },
        {
          id: 'demo-article-expenses',
          companyId,
          name: 'Расходы',
          type: 'expense',
          parentId: null,
        },
      ],
    });

    // Создаем дочерние статьи доходов
    await prisma.article.createMany({
      data: [
        {
          id: 'demo-article-revenue-sales',
          companyId,
          name: 'Продажи товаров',
          type: 'income',
          parentId: 'demo-article-revenue',
        },
        {
          id: 'demo-article-revenue-services',
          companyId,
          name: 'Оказание услуг',
          type: 'income',
          parentId: 'demo-article-revenue',
        },
      ],
    });

    // Создаем дочерние статьи расходов
    await prisma.article.createMany({
      data: [
        {
          id: 'demo-article-expense-materials',
          companyId,
          name: 'Материалы',
          type: 'expense',
          parentId: 'demo-article-expenses',
        },
        {
          id: 'demo-article-expense-salary',
          companyId,
          name: 'Зарплата',
          type: 'expense',
          parentId: 'demo-article-expenses',
        },
        {
          id: 'demo-article-expense-rent',
          companyId,
          name: 'Аренда',
          type: 'expense',
          parentId: 'demo-article-expenses',
        },
        {
          id: 'demo-article-expense-utilities',
          companyId,
          name: 'Коммунальные услуги',
          type: 'expense',
          parentId: 'demo-article-expenses',
        },
      ],
    });

    logger.info('Demo articles created', { companyId });
  }

  /**
   * Создает сделки для демо-компании
   */
  private async createDeals(companyId: string): Promise<void> {
    await prisma.deal.createMany({
      data: [
        {
          id: 'demo-deal-1',
          companyId,
          name: 'Поставка товаров клиенту 1',
          description: 'Регулярная поставка товаров',
          amount: 500000,
        },
        {
          id: 'demo-deal-2',
          companyId,
          name: 'Оказание услуг клиенту 2',
          description: 'Консультационные услуги',
          amount: 300000,
        },
        {
          id: 'demo-deal-3',
          companyId,
          name: 'Закупка материалов',
          description: 'Регулярная закупка материалов',
          amount: 200000,
        },
      ],
    });

    logger.info('Demo deals created', { companyId });
  }
}

export default new DemoCatalogsService();
