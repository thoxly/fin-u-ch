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
          companyId,
          name: 'Отдел продаж',
          description: 'Отдел продаж и маркетинга',
        },
        {
          companyId,
          name: 'Финансовый отдел',
          description: 'Финансовый отдел и бухгалтерия',
        },
        {
          companyId,
          name: 'HR отдел',
          description: 'Отдел кадров',
        },
        {
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
          companyId,
          name: 'ООО "Клиент 1"',
          category: 'customer',
          inn: '1234567890',
        },
        {
          companyId,
          name: 'ИП Иванов И.И.',
          category: 'customer',
          inn: '0987654321',
        },
        {
          companyId,
          name: 'ООО "Поставщик 1"',
          category: 'supplier',
          inn: '1122334455',
        },
        {
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
          companyId,
          name: 'Доходы',
          type: 'income',
          parentId: null,
        },
        {
          companyId,
          name: 'Расходы',
          type: 'expense',
          parentId: null,
        },
      ],
    });

    // Получаем созданные родительские статьи
    const revenueParent = await prisma.article.findFirst({
      where: { companyId, name: 'Доходы' },
    });
    const expenseParent = await prisma.article.findFirst({
      where: { companyId, name: 'Расходы' },
    });

    // Создаем дочерние статьи доходов
    if (revenueParent) {
      await prisma.article.createMany({
        data: [
          {
            companyId,
            name: 'Продажи товаров',
            type: 'income',
            parentId: revenueParent.id,
          },
          {
            companyId,
            name: 'Оказание услуг',
            type: 'income',
            parentId: revenueParent.id,
          },
        ],
      });
    }

    // Создаем дочерние статьи расходов
    if (expenseParent) {
      await prisma.article.createMany({
        data: [
          {
            companyId,
            name: 'Материалы',
            type: 'expense',
            parentId: expenseParent.id,
          },
          {
            companyId,
            name: 'Зарплата',
            type: 'expense',
            parentId: expenseParent.id,
          },
          {
            companyId,
            name: 'Аренда',
            type: 'expense',
            parentId: expenseParent.id,
          },
          {
            companyId,
            name: 'Коммунальные услуги',
            type: 'expense',
            parentId: expenseParent.id,
          },
        ],
      });
    }

    logger.info('Demo articles created', { companyId });
  }

  /**
   * Создает сделки для демо-компании
   */
  private async createDeals(companyId: string): Promise<void> {
    await prisma.deal.createMany({
      data: [
        {
          companyId,
          name: 'Поставка товаров клиенту 1',
          description: 'Регулярная поставка товаров',
          amount: 500000,
        },
        {
          companyId,
          name: 'Оказание услуг клиенту 2',
          description: 'Консультационные услуги',
          amount: 300000,
        },
        {
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
