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
          name: 'Расчетный счет в банке',
          currency: 'RUB',
          openingBalance: 1500000,
          isActive: true,
        },
        {
          companyId,
          name: 'Касса',
          currency: 'RUB',
          openingBalance: 50000,
          isActive: true,
        },
        {
          companyId,
          name: 'Корпоративная карта',
          currency: 'RUB',
          openingBalance: 0,
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
        // Клиенты
        {
          companyId,
          name: 'ООО "Клиент-1"',
          category: 'customer',
          inn: '7701234567',
          description: 'Основной клиент компании',
        },
        {
          companyId,
          name: 'ООО "Торговый дом Альтаир"',
          category: 'customer',
          inn: '7702345678',
          description: 'Крупный оптовый покупатель',
        },
        {
          companyId,
          name: 'ИП Петров Петр Петрович',
          category: 'customer',
          inn: '7703456789',
          description: 'Частный предприниматель',
        },
        // Поставщики
        {
          companyId,
          name: 'ООО "Поставщик-1"',
          category: 'supplier',
          inn: '7704567890',
          description: 'Основной поставщик материалов',
        },
        {
          companyId,
          name: 'ООО "Снабжение Плюс"',
          category: 'supplier',
          inn: '7705678901',
          description: 'Поставщик оборудования',
        },
        // Сотрудники
        {
          companyId,
          name: 'Иванов Иван Иванович',
          category: 'employee',
          inn: null,
          description: 'Менеджер по продажам',
        },
        {
          companyId,
          name: 'Сидорова Мария Сергеевна',
          category: 'employee',
          inn: null,
          description: 'Бухгалтер',
        },
        {
          companyId,
          name: 'Козлов Алексей Викторович',
          category: 'employee',
          inn: null,
          description: 'Разработчик',
        },
        // Государственные организации
        {
          companyId,
          name: 'ФНС России',
          category: 'other',
          inn: '7707081643',
          description: 'Федеральная налоговая служба',
        },
        {
          companyId,
          name: 'ПФР',
          category: 'other',
          inn: '770801001',
          description: 'Пенсионный фонд России',
        },
        // Банки
        {
          companyId,
          name: 'ООО "Банк"',
          category: 'other',
          inn: '7709012345',
          description: 'Банковское обслуживание',
        },
      ],
    });

    logger.info('Demo counterparties created', { companyId });
  }

  /**
   * Создает статьи для демо-компании
   */
  private async createArticles(companyId: string): Promise<void> {
    // Создаем статьи доходов
    await prisma.article.createMany({
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
          name: 'Прочие доходы',
          type: 'income',
          activity: 'operating',
          isActive: true,
        },
      ],
    });

    // Создаем статьи расходов
    await prisma.article.createMany({
      data: [
        // Операционные расходы
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
          name: 'Коммунальные услуги',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        {
          companyId,
          name: 'Реклама и маркетинг',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        {
          companyId,
          name: 'Закупка товаров',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        {
          companyId,
          name: 'Налог на прибыль',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        {
          companyId,
          name: 'НДФЛ',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        {
          companyId,
          name: 'Страховые взносы',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        {
          companyId,
          name: 'Связь и интернет',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        {
          companyId,
          name: 'Канцтовары',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        {
          companyId,
          name: 'Сырье и материалы',
          type: 'expense',
          activity: 'operating',
          isActive: true,
        },
        // Инвестиционные расходы
        {
          companyId,
          name: 'Покупка оборудования',
          type: 'expense',
          activity: 'investing',
          isActive: true,
        },
        {
          companyId,
          name: 'Нематериальные активы',
          type: 'expense',
          activity: 'investing',
          isActive: true,
        },
        {
          companyId,
          name: 'Капитальный ремонт',
          type: 'expense',
          activity: 'investing',
          isActive: true,
        },
        // Финансовые расходы
        {
          companyId,
          name: 'Проценты по кредитам',
          type: 'expense',
          activity: 'financing',
          isActive: true,
        },
        {
          companyId,
          name: 'Дивиденды',
          type: 'expense',
          activity: 'financing',
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
    const departments = await prisma.department.findMany({
      where: { companyId },
      take: 1,
    });
    const customers = await prisma.counterparty.findMany({
      where: { companyId, category: 'customer' },
      take: 2,
    });

    if (departments.length > 0 && customers.length > 0) {
      await prisma.deal.createMany({
        data: [
          {
            companyId,
            name: 'Проект А',
            description: 'Крупный проект с основным клиентом',
            departmentId: departments[0].id,
            counterpartyId: customers[0].id,
            amount: 5000000,
          },
          {
            companyId,
            name: 'Долгосрочный контракт',
            description: 'Годовой контракт на поставку товаров',
            departmentId: departments[0].id,
            counterpartyId: customers[1]?.id || customers[0].id,
            amount: 3000000,
          },
          {
            companyId,
            name: 'Разовый заказ',
            description: 'Разовый заказ от клиента',
            departmentId: departments[0].id,
            counterpartyId: customers[0].id,
            amount: 500000,
          },
        ],
      });

      logger.info('Demo deals created', { companyId });
    }
  }
}

export default new DemoCatalogsService();
