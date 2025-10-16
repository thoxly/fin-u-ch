import { PrismaClient } from '@prisma/client';
import logger from '../apps/api/src/config/logger';

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

  // 2. ПОДРАЗДЕЛЕНИЯ
  const departments = await tx.department.createMany({
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

  // 3. КОНТРАГЕНТЫ
  const counterparties = await tx.counterparty.createMany({
    data: [
      // Поставщики
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
      // Клиенты
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
      // Сотрудники
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
      // Госорганы
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
      // Прочие
      {
        companyId,
        name: 'ООО "Банк"',
        inn: '7707123456',
        category: 'other',
        description: 'Обслуживающий банк',
      },
    ],
  });

  // 4. СТАТЬИ ДОХОДОВ
  const incomeOperating = await tx.article.create({
    data: {
      companyId,
      name: 'Операционная деятельность (доходы)',
      type: 'income',
      activity: 'operating',
      isActive: true,
    },
  });

  await tx.article.createMany({
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

  // 5. СТАТЬИ РАСХОДОВ - Операционная деятельность
  const expenseOperating = await tx.article.create({
    data: {
      companyId,
      name: 'Операционная деятельность (расходы)',
      type: 'expense',
      activity: 'operating',
      isActive: true,
    },
  });

  // ФОТ
  const fot = await tx.article.create({
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

  await tx.article.createMany({
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
  const opex = await tx.article.create({
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

  await tx.article.createMany({
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
  const cogs = await tx.article.create({
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

  await tx.article.createMany({
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
  const taxes = await tx.article.create({
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

  await tx.article.createMany({
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

  // 6. ИНВЕСТИЦИОННАЯ ДЕЯТЕЛЬНОСТЬ
  const investing = await tx.article.create({
    data: {
      companyId,
      name: 'Инвестиционная деятельность',
      type: 'expense',
      activity: 'investing',
      isActive: true,
    },
  });

  await tx.article.createMany({
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

  // 7. ФИНАНСОВАЯ ДЕЯТЕЛЬНОСТЬ
  const financing = await tx.article.create({
    data: {
      companyId,
      name: 'Финансовая деятельность',
      type: 'expense',
      activity: 'financing',
      isActive: true,
    },
  });

  await tx.article.createMany({
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

  // 8. ПРИМЕРЫ СДЕЛОК
  // Получаем ID созданных контрагентов и подразделений для связи
  const customer1 = await tx.counterparty.findFirst({
    where: { companyId, name: 'ООО "Клиент-1"' },
  });

  const salesDept = await tx.department.findFirst({
    where: { companyId, name: 'Отдел продаж' },
  });

  if (customer1 && salesDept) {
    await tx.deal.createMany({
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

  logger.info('Initial data seeded successfully', {
    companyId,
    accounts: accounts.count,
    departments: departments.count,
    counterparties: counterparties.count,
  });
}
