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
          id: 'demo-account-cash',
          companyId,
          name: 'Касса',
          type: 'asset',
          currency: 'RUB',
          balance: 50000,
          isActive: true,
        },
        {
          id: 'demo-account-bank',
          companyId,
          name: 'Расчетный счет',
          type: 'asset',
          currency: 'RUB',
          balance: 1000000,
          isActive: true,
        },
        {
          id: 'demo-account-revenue',
          companyId,
          name: 'Выручка',
          type: 'revenue',
          currency: 'RUB',
          balance: 0,
          isActive: true,
        },
        {
          id: 'demo-account-expenses',
          companyId,
          name: 'Расходы',
          type: 'expense',
          currency: 'RUB',
          balance: 0,
          isActive: true,
        },
        {
          id: 'demo-account-equity',
          companyId,
          name: 'Уставный капитал',
          type: 'equity',
          currency: 'RUB',
          balance: 100000,
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
          isActive: true,
        },
        {
          id: 'demo-dept-finance',
          companyId,
          name: 'Финансовый отдел',
          description: 'Финансовый отдел и бухгалтерия',
          isActive: true,
        },
        {
          id: 'demo-dept-hr',
          companyId,
          name: 'HR отдел',
          description: 'Отдел кадров',
          isActive: true,
        },
        {
          id: 'demo-dept-it',
          companyId,
          name: 'IT отдел',
          description: 'Отдел информационных технологий',
          isActive: true,
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
          type: 'client',
          inn: '1234567890',
          email: 'client1@example.com',
          phone: '+7 (495) 123-45-67',
          address: 'г. Москва, ул. Примерная, д. 1',
          isActive: true,
        },
        {
          id: 'demo-counterparty-client2',
          companyId,
          name: 'ИП Иванов И.И.',
          type: 'client',
          inn: '0987654321',
          email: 'ivanov@example.com',
          phone: '+7 (495) 234-56-78',
          address: 'г. Москва, ул. Тестовая, д. 2',
          isActive: true,
        },
        {
          id: 'demo-counterparty-supplier1',
          companyId,
          name: 'ООО "Поставщик 1"',
          type: 'supplier',
          inn: '1122334455',
          email: 'supplier1@example.com',
          phone: '+7 (495) 345-67-89',
          address: 'г. Москва, ул. Поставщиков, д. 3',
          isActive: true,
        },
        {
          id: 'demo-counterparty-supplier2',
          companyId,
          name: 'ООО "Поставщик 2"',
          type: 'supplier',
          inn: '5544332211',
          email: 'supplier2@example.com',
          phone: '+7 (495) 456-78-90',
          address: 'г. Москва, ул. Товаров, д. 4',
          isActive: true,
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
          type: 'revenue',
          parentId: null,
          isActive: true,
        },
        {
          id: 'demo-article-expenses',
          companyId,
          name: 'Расходы',
          type: 'expense',
          parentId: null,
          isActive: true,
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
          type: 'revenue',
          parentId: 'demo-article-revenue',
          isActive: true,
        },
        {
          id: 'demo-article-revenue-services',
          companyId,
          name: 'Оказание услуг',
          type: 'revenue',
          parentId: 'demo-article-revenue',
          isActive: true,
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
          isActive: true,
        },
        {
          id: 'demo-article-expense-salary',
          companyId,
          name: 'Зарплата',
          type: 'expense',
          parentId: 'demo-article-expenses',
          isActive: true,
        },
        {
          id: 'demo-article-expense-rent',
          companyId,
          name: 'Аренда',
          type: 'expense',
          parentId: 'demo-article-expenses',
          isActive: true,
        },
        {
          id: 'demo-article-expense-utilities',
          companyId,
          name: 'Коммунальные услуги',
          type: 'expense',
          parentId: 'demo-article-expenses',
          isActive: true,
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
          status: 'active',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          expectedAmount: 500000,
          currency: 'RUB',
          isActive: true,
        },
        {
          id: 'demo-deal-2',
          companyId,
          name: 'Оказание услуг клиенту 2',
          description: 'Консультационные услуги',
          status: 'active',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-11-30'),
          expectedAmount: 300000,
          currency: 'RUB',
          isActive: true,
        },
        {
          id: 'demo-deal-3',
          companyId,
          name: 'Закупка материалов',
          description: 'Регулярная закупка материалов',
          status: 'active',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-12-15'),
          expectedAmount: 200000,
          currency: 'RUB',
          isActive: true,
        },
      ],
    });

    logger.info('Demo deals created', { companyId });
  }
}

export default new DemoCatalogsService();
