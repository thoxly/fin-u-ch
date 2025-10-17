import prisma from '../../config/db';
import bcrypt from 'bcryptjs';
import demoCatalogsService from './demo-catalogs.service';
import demoDataGeneratorService from './demo-data-generator.service';
import logger from '../../config/logger';

export interface DemoUserCredentials {
  email: string;
  password: string;
  companyName: string;
}

export interface DemoUserData {
  user: {
    id: string;
    email: string;
    isActive: boolean;
  };
  company: {
    id: string;
    name: string;
    currencyBase: string;
  };
  operationsCount: number;
  plansCount: number;
  accountsCount: number;
  articlesCount: number;
  counterpartiesCount: number;
}

/**
 * Сервис для управления демо-пользователем
 * Обеспечивает создание и управление демо-пользователем с моковыми данными
 */
export class DemoUserService {
  private static readonly DEMO_EMAIL = 'demo@example.com';
  private static readonly DEMO_PASSWORD = 'demo123';
  private static readonly DEMO_COMPANY_NAME = 'Демо Компания ООО';

  /**
   * Получает учетные данные демо-пользователя
   */
  getCredentials(): DemoUserCredentials {
    return {
      email: DemoUserService.DEMO_EMAIL,
      password: DemoUserService.DEMO_PASSWORD,
      companyName: DemoUserService.DEMO_COMPANY_NAME,
    };
  }

  /**
   * Проверяет, существует ли демо-пользователь
   */
  async exists(): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email: DemoUserService.DEMO_EMAIL },
      include: { company: true },
    });
    return !!user;
  }

  /**
   * Получает информацию о демо-пользователе
   */
  async getInfo(): Promise<DemoUserData | null> {
    const user = await prisma.user.findUnique({
      where: { email: DemoUserService.DEMO_EMAIL },
      include: { company: true },
    });

    if (!user) {
      return null;
    }

    const [
      operationsCount,
      plansCount,
      accountsCount,
      articlesCount,
      counterpartiesCount,
    ] = await Promise.all([
      prisma.operation.count({ where: { companyId: user.companyId } }),
      prisma.planItem.count({ where: { companyId: user.companyId } }),
      prisma.account.count({ where: { companyId: user.companyId } }),
      prisma.article.count({ where: { companyId: user.companyId } }),
      prisma.counterparty.count({ where: { companyId: user.companyId } }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        currencyBase: user.company.currencyBase,
      },
      operationsCount,
      plansCount,
      accountsCount,
      articlesCount,
      counterpartiesCount,
    };
  }

  /**
   * Создает демо-пользователя с начальными данными
   */
  async create(): Promise<DemoUserData> {
    logger.info('Creating demo user...');

    // Проверяем, не существует ли уже демо-пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email: DemoUserService.DEMO_EMAIL },
      include: { company: true },
    });

    if (existingUser) {
      logger.info('Demo user already exists, returning existing data');
      return this.getInfo() as Promise<DemoUserData>;
    }

    // Создаем компанию
    const company = await prisma.company.create({
      data: {
        name: DemoUserService.DEMO_COMPANY_NAME,
        currencyBase: 'RUB',
      },
    });

    logger.info('Demo company created', { companyId: company.id });

    // Создаем пользователя
    const hashedPassword = await bcrypt.hash(DemoUserService.DEMO_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: DemoUserService.DEMO_EMAIL,
        passwordHash: hashedPassword,
        isActive: true,
      },
    });

    logger.info('Demo user created', { userId: user.id });

    // Создаем начальные справочники
    await demoCatalogsService.createInitialCatalogs(company.id);
    logger.info('Initial catalogs created');

    // Создаем моковые данные
    await demoDataGeneratorService.createSampleData(company.id);
    logger.info('Sample data created');

    return this.getInfo() as Promise<DemoUserData>;
  }

  /**
   * Удаляет демо-пользователя и все связанные данные
   */
  async delete(): Promise<void> {
    logger.info('Deleting demo user...');

    const user = await prisma.user.findUnique({
      where: { email: DemoUserService.DEMO_EMAIL },
      include: { company: true },
    });

    if (!user) {
      logger.warn('Demo user not found for deletion');
      return;
    }

    // Удаляем все данные компании
    await prisma.$transaction([
      prisma.operation.deleteMany({
        where: { companyId: user.companyId },
      }),
      prisma.planItem.deleteMany({ where: { companyId: user.companyId } }),
      prisma.salary.deleteMany({ where: { companyId: user.companyId } }),
      prisma.deal.deleteMany({ where: { companyId: user.companyId } }),
      prisma.counterparty.deleteMany({
        where: { companyId: user.companyId },
      }),
      prisma.department.deleteMany({
        where: { companyId: user.companyId },
      }),
      prisma.article.deleteMany({ where: { companyId: user.companyId } }),
      prisma.account.deleteMany({ where: { companyId: user.companyId } }),
      prisma.user.deleteMany({ where: { companyId: user.companyId } }),
      prisma.company.delete({ where: { id: user.companyId } }),
    ]);

    logger.info('Demo user and all related data deleted');
  }

  /**
   * Создает начальные справочники для демо-компании
   */
  private async createInitialCatalogs(companyId: string): Promise<void> {
    // Создаем счета
    await prisma.account.createMany({
      data: [
        {
          companyId,
          name: 'Расчетный счет в банке',
          number: '40702810000000000001',
          currency: 'RUB',
          openingBalance: 100000,
          isActive: true,
        },
        {
          companyId,
          name: 'Касса',
          number: null,
          currency: 'RUB',
          openingBalance: 10000,
          isActive: true,
        },
        {
          companyId,
          name: 'Валютный счет',
          number: '40702840000000000001',
          currency: 'USD',
          openingBalance: 5000,
          isActive: true,
        },
        {
          companyId,
          name: 'Корпоративная карта',
          number: null,
          currency: 'RUB',
          openingBalance: 20000,
          isActive: true,
        },
      ],
    });

    // Создаем подразделения
    await prisma.department.createMany({
      data: [
        {
          companyId,
          name: 'Администрация',
          description: 'Общее управление компанией',
        },
        {
          companyId,
          name: 'Отдел продаж',
          description: 'Продажи и развитие бизнеса',
        },
        {
          companyId,
          name: 'Производство/Операции',
          description: 'Основная операционная деятельность',
        },
        {
          companyId,
          name: 'Финансы и бухгалтерия',
          description: 'Финансовый учет и отчетность',
        },
        {
          companyId,
          name: 'IT',
          description: 'Техническая поддержка и разработка',
        },
      ],
    });

    // Создаем контрагентов
    await prisma.counterparty.createMany({
      data: [
        {
          companyId,
          name: 'ООО "Поставщик-1"',
          inn: '7701234567',
          category: 'supplier',
          description: 'Основной поставщик товаров и услуг',
        },
        {
          companyId,
          name: 'ООО "Аренда-Сервис"',
          inn: '7702345678',
          category: 'supplier',
          description: 'Аренда офисных помещений',
        },
        {
          companyId,
          name: 'ООО "Клиент-1"',
          inn: '7703456789',
          category: 'customer',
          description: 'Крупный корпоративный клиент',
        },
        {
          companyId,
          name: 'ИП Иванов А.А.',
          inn: '770123456789',
          category: 'customer',
          description: 'Индивидуальный предприниматель',
        },
        {
          companyId,
          name: 'Иванов Иван Иванович',
          inn: null,
          category: 'employee',
          description: 'Директор',
        },
        {
          companyId,
          name: 'Петров Петр Петрович',
          inn: null,
          category: 'employee',
          description: 'Менеджер по продажам',
        },
        {
          companyId,
          name: 'ФНС России',
          inn: '7707329152',
          category: 'gov',
          description: 'Федеральная налоговая служба',
        },
        {
          companyId,
          name: 'ПФР',
          inn: '7707049156',
          category: 'gov',
          description: 'Пенсионный фонд РФ',
        },
        {
          companyId,
          name: 'ФСС',
          inn: '7736056649',
          category: 'gov',
          description: 'Фонд социального страхования',
        },
        {
          companyId,
          name: 'ООО "Банк"',
          inn: '7707123456',
          category: 'other',
          description: 'Обслуживающий банк',
        },
      ],
    });

    // Создаем статьи доходов и расходов
    const incomeOperating = await prisma.article.create({
      data: {
        companyId,
        name: 'Операционная деятельность (доходы)',
        type: 'income',
        activity: 'operating',
        isActive: true,
      },
    });

    await prisma.article.createMany({
      data: [
        {
          companyId,
          name: 'Выручка от продаж',
          parentId: incomeOperating.id,
          type: 'income',
          activity: 'operating',
          indicator: 'revenue',
          isActive: true,
        },
        {
          companyId,
          name: 'Прочие доходы',
          parentId: incomeOperating.id,
          type: 'income',
          activity: 'operating',
          indicator: 'other_income',
          isActive: true,
        },
      ],
    });

    // Создаем статьи расходов
    const expenseOperating = await prisma.article.create({
      data: {
        companyId,
        name: 'Операционная деятельность (расходы)',
        type: 'expense',
        activity: 'operating',
        isActive: true,
      },
    });

    const fot = await prisma.article.create({
      data: {
        companyId,
        name: 'ФОТ',
        parentId: expenseOperating.id,
        type: 'expense',
        activity: 'operating',
        indicator: 'payroll',
        isActive: true,
      },
    });

    await prisma.article.createMany({
      data: [
        {
          companyId,
          name: 'Зарплата',
          parentId: fot.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'payroll',
          isActive: true,
        },
        {
          companyId,
          name: 'Страховые взносы',
          parentId: fot.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'payroll',
          isActive: true,
        },
        {
          companyId,
          name: 'НДФЛ',
          parentId: fot.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'payroll',
          isActive: true,
        },
      ],
    });

    // Операционные расходы
    const opex = await prisma.article.create({
      data: {
        companyId,
        name: 'Операционные расходы',
        parentId: expenseOperating.id,
        type: 'expense',
        activity: 'operating',
        indicator: 'opex',
        isActive: true,
      },
    });

    await prisma.article.createMany({
      data: [
        {
          companyId,
          name: 'Аренда офиса',
          parentId: opex.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'opex',
          isActive: true,
        },
        {
          companyId,
          name: 'Коммунальные услуги',
          parentId: opex.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'opex',
          isActive: true,
        },
        {
          companyId,
          name: 'Канцтовары',
          parentId: opex.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'opex',
          isActive: true,
        },
        {
          companyId,
          name: 'Связь и интернет',
          parentId: opex.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'opex',
          isActive: true,
        },
        {
          companyId,
          name: 'Реклама и маркетинг',
          parentId: opex.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'opex',
          isActive: true,
        },
      ],
    });

    // Себестоимость
    const cogs = await prisma.article.create({
      data: {
        companyId,
        name: 'Себестоимость',
        parentId: expenseOperating.id,
        type: 'expense',
        activity: 'operating',
        indicator: 'cogs',
        isActive: true,
      },
    });

    await prisma.article.createMany({
      data: [
        {
          companyId,
          name: 'Закупка товаров',
          parentId: cogs.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'cogs',
          isActive: true,
        },
        {
          companyId,
          name: 'Сырье и материалы',
          parentId: cogs.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'cogs',
          isActive: true,
        },
      ],
    });

    // Налоги
    const taxes = await prisma.article.create({
      data: {
        companyId,
        name: 'Налоги',
        parentId: expenseOperating.id,
        type: 'expense',
        activity: 'operating',
        indicator: 'taxes',
        isActive: true,
      },
    });

    await prisma.article.createMany({
      data: [
        {
          companyId,
          name: 'Налог на прибыль',
          parentId: taxes.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'taxes',
          isActive: true,
        },
        {
          companyId,
          name: 'НДС',
          parentId: taxes.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'taxes',
          isActive: true,
        },
        {
          companyId,
          name: 'Прочие налоги',
          parentId: taxes.id,
          type: 'expense',
          activity: 'operating',
          indicator: 'taxes',
          isActive: true,
        },
      ],
    });

    // Инвестиционная деятельность
    const investing = await prisma.article.create({
      data: {
        companyId,
        name: 'Инвестиционная деятельность',
        type: 'expense',
        activity: 'investing',
        isActive: true,
      },
    });

    await prisma.article.createMany({
      data: [
        {
          companyId,
          name: 'Покупка оборудования',
          parentId: investing.id,
          type: 'expense',
          activity: 'investing',
          indicator: 'other',
          isActive: true,
        },
        {
          companyId,
          name: 'Нематериальные активы',
          parentId: investing.id,
          type: 'expense',
          activity: 'investing',
          indicator: 'other',
          isActive: true,
        },
        {
          companyId,
          name: 'Капитальный ремонт',
          parentId: investing.id,
          type: 'expense',
          activity: 'investing',
          indicator: 'other',
          isActive: true,
        },
      ],
    });

    // Финансовая деятельность
    const financing = await prisma.article.create({
      data: {
        companyId,
        name: 'Финансовая деятельность',
        type: 'expense',
        activity: 'financing',
        isActive: true,
      },
    });

    await prisma.article.createMany({
      data: [
        {
          companyId,
          name: 'Проценты по кредитам',
          parentId: financing.id,
          type: 'expense',
          activity: 'financing',
          indicator: 'interest',
          isActive: true,
        },
        {
          companyId,
          name: 'Погашение кредитов',
          parentId: financing.id,
          type: 'expense',
          activity: 'financing',
          indicator: 'loan_principal',
          isActive: true,
        },
        {
          companyId,
          name: 'Дивиденды',
          parentId: financing.id,
          type: 'expense',
          activity: 'financing',
          indicator: 'dividends',
          isActive: true,
        },
      ],
    });

    // Создаем сделки
    const customer1 = await prisma.counterparty.findFirst({
      where: { companyId, name: 'ООО "Клиент-1"' },
    });

    const salesDept = await prisma.department.findFirst({
      where: { companyId, name: 'Отдел продаж' },
    });

    if (customer1 && salesDept) {
      await prisma.deal.createMany({
        data: [
          {
            companyId,
            name: 'Проект А',
            amount: 500000,
            counterpartyId: customer1.id,
            departmentId: salesDept.id,
            description: 'Крупный контракт на поставку услуг',
          },
          {
            companyId,
            name: 'Годовой договор с Клиент-1',
            amount: 1200000,
            counterpartyId: customer1.id,
            departmentId: salesDept.id,
            description: 'Долгосрочное сотрудничество на год',
          },
        ],
      });
    }
  }

  /**
   * Создает моковые данные для демо-пользователя
   */
  private async createSampleData(companyId: string): Promise<void> {
    // Получаем нужные ID
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

    if (!mainAccount || !cashAccount) {
      throw new Error('Required accounts not found');
    }

    const revenueArticle = articles.find((a) => a.name === 'Выручка от продаж');
    const salaryArticle = articles.find((a) => a.name === 'Зарплата');
    const rentArticle = articles.find((a) => a.name === 'Аренда офиса');
    const utilitiesArticle = articles.find(
      (a) => a.name === 'Коммунальные услуги'
    );
    const marketingArticle = articles.find(
      (a) => a.name === 'Реклама и маркетинг'
    );
    const cogsArticle = articles.find((a) => a.name === 'Закупка товаров');
    const taxArticle = articles.find((a) => a.name === 'Налог на прибыль');
    const equipmentArticle = articles.find(
      (a) => a.name === 'Покупка оборудования'
    );
    const loanArticle = articles.find((a) => a.name === 'Проценты по кредитам');

    const customer = counterparties.find((c) => c.name === 'ООО "Клиент-1"');
    const supplier = counterparties.find((c) => c.name === 'ООО "Поставщик-1"');
    const employee = counterparties.find(
      (c) => c.name === 'Иванов Иван Иванович'
    );
    const gov = counterparties.find((c) => c.name === 'ФНС России');
    const bank = counterparties.find((c) => c.name === 'ООО "Банк"');

    const deal = deals.find((d) => d.name === 'Проект А');

    // Проверяем, что все необходимые данные найдены
    if (
      !revenueArticle ||
      !salaryArticle ||
      !rentArticle ||
      !utilitiesArticle ||
      !marketingArticle ||
      !cogsArticle ||
      !taxArticle ||
      !equipmentArticle ||
      !loanArticle ||
      !customer ||
      !supplier ||
      !employee ||
      !gov ||
      !bank ||
      !deal
    ) {
      throw new Error(
        'Required demo data not found. Please ensure initial catalogs are created.'
      );
    }

    // Создаем операции за последние 6 месяцев
    const operations = this.generateSampleOperations({
      mainAccount,
      cashAccount,
      revenueArticle,
      salaryArticle,
      rentArticle,
      utilitiesArticle,
      marketingArticle,
      cogsArticle,
      taxArticle,
      equipmentArticle,
      loanArticle,
      customer,
      supplier,
      employee,
      gov,
      bank,
      deal,
    });

    // Создаем операции в базе
    if (operations.length > 0) {
      await prisma.operation.createMany({
        data: operations.map((op) => ({
          companyId,
          type: op.type,
          operationDate: op.date,
          amount: op.amount,
          currency: 'RUB',
          accountId: op.account?.id,
          sourceAccountId: op.sourceAccount?.id,
          targetAccountId: op.targetAccount?.id,
          articleId: op.article?.id,
          counterpartyId: op.counterparty?.id,
          dealId: op.deal?.id,
          description: `Sample operation for ${op.date.toISOString().split('T')[0]}`,
        })),
      });
    }

    // Создаем плановые операции
    await this.createSamplePlans(companyId, {
      accounts,
      articles,
      counterparties,
    });

    // Создаем зарплатные правила
    await this.createSampleSalaries(companyId, { counterparties });
  }

  /**
   * Генерирует моковые операции
   */
  private generateSampleOperations(dependencies: {
    mainAccount: { id: string; name: string };
    cashAccount: { id: string; name: string };
    revenueArticle: { id: string; name: string };
    salaryArticle: { id: string; name: string };
    rentArticle: { id: string; name: string };
    utilitiesArticle: { id: string; name: string };
    marketingArticle: { id: string; name: string };
    cogsArticle: { id: string; name: string };
    taxArticle: { id: string; name: string };
    equipmentArticle: { id: string; name: string };
    loanArticle: { id: string; name: string };
    customer: { id: string; name: string };
    supplier: { id: string; name: string };
    employee: { id: string; name: string };
    gov: { id: string; name: string };
    bank: { id: string; name: string };
    deal: { id: string; name: string };
  }) {
    const operations = [];
    const currentDate = new Date();
    const sixMonthsAgo = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 6,
      1
    );

    // Генерируем операции за каждый месяц
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const monthDate = new Date(
        sixMonthsAgo.getFullYear(),
        sixMonthsAgo.getMonth() + monthOffset,
        1
      );

      // Доходы (2-3 операции в месяц)
      const incomeCount = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < incomeCount; i++) {
        const day = Math.floor(Math.random() * 28) + 1;
        const amount = Math.floor(Math.random() * 100000) + 50000; // 50k-150k

        operations.push({
          type: 'income',
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          amount,
          account: dependencies.mainAccount,
          article: dependencies.revenueArticle,
          counterparty: dependencies.customer,
          deal: Math.random() > 0.5 ? dependencies.deal : undefined,
        });
      }

      // Расходы (5-8 операций в месяц)
      const expenseCount = Math.floor(Math.random() * 4) + 5;
      for (let i = 0; i < expenseCount; i++) {
        const day = Math.floor(Math.random() * 28) + 1;
        const expenseTypes = [
          {
            article: dependencies.salaryArticle,
            amount: 50000,
            counterparty: dependencies.employee,
          },
          {
            article: dependencies.rentArticle,
            amount: 25000,
            counterparty: dependencies.supplier,
          },
          {
            article: dependencies.utilitiesArticle,
            amount: Math.floor(Math.random() * 5000) + 5000,
            counterparty: dependencies.supplier,
          },
          {
            article: dependencies.marketingArticle,
            amount: Math.floor(Math.random() * 20000) + 10000,
            counterparty: dependencies.supplier,
          },
          {
            article: dependencies.cogsArticle,
            amount: Math.floor(Math.random() * 50000) + 20000,
            counterparty: dependencies.supplier,
          },
          {
            article: dependencies.taxArticle,
            amount: Math.floor(Math.random() * 20000) + 10000,
            counterparty: dependencies.gov,
          },
        ];

        const expenseType =
          expenseTypes[Math.floor(Math.random() * expenseTypes.length)];

        operations.push({
          type: 'expense',
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          amount: expenseType.amount,
          account: dependencies.mainAccount,
          article: expenseType.article,
          counterparty: expenseType.counterparty,
        });
      }

      // Инвестиционные расходы (1-2 раза в квартал)
      if (monthOffset % 3 === 0 && Math.random() > 0.5) {
        const day = Math.floor(Math.random() * 28) + 1;
        operations.push({
          type: 'expense',
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          amount: Math.floor(Math.random() * 100000) + 50000,
          account: dependencies.mainAccount,
          article: dependencies.equipmentArticle,
          counterparty: dependencies.supplier,
        });
      }

      // Финансовые расходы (1 раз в месяц)
      if (Math.random() > 0.3) {
        const day = Math.floor(Math.random() * 28) + 1;
        operations.push({
          type: 'expense',
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          amount: Math.floor(Math.random() * 10000) + 5000,
          account: dependencies.mainAccount,
          article: dependencies.loanArticle,
          counterparty: dependencies.bank,
        });
      }

      // Переводы между счетами (1-2 раза в месяц)
      if (Math.random() > 0.5) {
        const day = Math.floor(Math.random() * 28) + 1;
        operations.push({
          type: 'transfer',
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
          amount: Math.floor(Math.random() * 20000) + 5000,
          sourceAccount: dependencies.mainAccount,
          targetAccount: dependencies.cashAccount,
        });
      }
    }

    return operations;
  }

  /**
   * Создает плановые операции
   */
  private async createSamplePlans(
    companyId: string,
    dependencies: {
      accounts: Array<{ id: string; name: string }>;
      articles: Array<{ id: string; name: string }>;
      counterparties: Array<{ id: string; name: string }>;
    }
  ): Promise<void> {
    const { accounts, articles, counterparties } = dependencies;

    const mainAccount = accounts.find(
      (a) => a.name === 'Расчетный счет в банке'
    );
    const salaryArticle = articles.find((a) => a.name === 'Зарплата');
    const rentArticle = articles.find((a) => a.name === 'Аренда офиса');
    const utilitiesArticle = articles.find(
      (a) => a.name === 'Коммунальные услуги'
    );
    const marketingArticle = articles.find(
      (a) => a.name === 'Реклама и маркетинг'
    );
    const cogsArticle = articles.find((a) => a.name === 'Закупка товаров');
    const taxArticle = articles.find((a) => a.name === 'Налог на прибыль');
    const revenueArticle = articles.find((a) => a.name === 'Выручка от продаж');

    const employee = counterparties.find(
      (c) => c.name === 'Иванов Иван Иванович'
    );
    const supplier = counterparties.find((c) => c.name === 'ООО "Поставщик-1"');
    const gov = counterparties.find((c) => c.name === 'ФНС России');
    const customer = counterparties.find((c) => c.name === 'ООО "Клиент-1"');

    const plans = [
      {
        type: 'expense',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        amount: 50000,
        article: salaryArticle,
        account: mainAccount,
        counterparty: employee,
        repeat: 'monthly',
        description: 'Ежемесячная зарплата',
      },
      {
        type: 'expense',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        amount: 25000,
        article: rentArticle,
        account: mainAccount,
        counterparty: supplier,
        repeat: 'monthly',
        description: 'Ежемесячная аренда офиса',
      },
      {
        type: 'expense',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        amount: 10000,
        article: utilitiesArticle,
        account: mainAccount,
        counterparty: supplier,
        repeat: 'monthly',
        description: 'Ежемесячные коммунальные услуги',
      },
      {
        type: 'expense',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        amount: 20000,
        article: marketingArticle,
        account: mainAccount,
        counterparty: supplier,
        repeat: 'monthly',
        description: 'Ежемесячный маркетинг',
      },
      {
        type: 'expense',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        amount: 40000,
        article: cogsArticle,
        account: mainAccount,
        counterparty: supplier,
        repeat: 'monthly',
        description: 'Ежемесячные закупки товаров',
      },
      {
        type: 'expense',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        amount: 15000,
        article: taxArticle,
        account: mainAccount,
        counterparty: gov,
        repeat: 'monthly',
        description: 'Ежемесячные налоги',
      },
      {
        type: 'income',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        amount: 150000,
        article: revenueArticle,
        account: mainAccount,
        counterparty: customer,
        repeat: 'monthly',
        description: 'Ежемесячная выручка',
      },
    ];

    for (const plan of plans) {
      if (!plan.article || !plan.account) {
        logger.warn('Skipping plan due to missing article or account', {
          plan,
        });
        continue;
      }

      await prisma.planItem.create({
        data: {
          companyId,
          type: plan.type,
          startDate: new Date(plan.startDate),
          endDate: new Date(plan.endDate),
          amount: plan.amount,
          currency: 'RUB',
          articleId: plan.article.id,
          accountId: plan.account.id,
          // counterpartyId: plan.counterparty.id, // PlanItem doesn't have counterpartyId field
          repeat: plan.repeat,
          status: 'active',
          description: plan.description,
        },
      });
    }
  }

  /**
   * Создает зарплатные правила
   */
  private async createSampleSalaries(
    companyId: string,
    dependencies: { counterparties: Array<{ id: string; name: string }> }
  ): Promise<void> {
    const { counterparties } = dependencies;

    const employee = counterparties.find(
      (c) => c.name === 'Иванов Иван Иванович'
    );
    const salesDept = await prisma.department.findFirst({
      where: { companyId, name: 'Отдел продаж' },
    });

    if (employee && salesDept) {
      await prisma.salary.create({
        data: {
          companyId,
          employeeCounterpartyId: employee.id,
          departmentId: salesDept.id,
          baseWage: 50000,
          contributionsPct: 30,
          incomeTaxPct: 13,
          periodicity: 'monthly',
          effectiveFrom: new Date('2025-01-01'),
          effectiveTo: new Date('2025-12-31'),
        },
      });
    }
  }
}

export default new DemoUserService();
