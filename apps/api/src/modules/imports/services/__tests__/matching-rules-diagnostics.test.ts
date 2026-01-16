// Mock env.ts before importing anything that uses it
jest.mock('../../../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    SMTP_HOST: '',
    SMTP_PORT: 465,
    SMTP_USER: '',
    SMTP_PASS: '',
  },
}));

// Mock logger - собираем все логи для анализа
const collectedLogs: Array<{
  level: string;
  message: string;
  data?: any;
}> = [];

const mockLogger = {
  debug: jest.fn((message: string, data?: any) => {
    collectedLogs.push({ level: 'debug', message, data });
  }),
  info: jest.fn((message: string, data?: any) => {
    collectedLogs.push({ level: 'info', message, data });
  }),
  warn: jest.fn((message: string, data?: any) => {
    collectedLogs.push({ level: 'warn', message, data });
  }),
  error: jest.fn((message: string, data?: any) => {
    collectedLogs.push({ level: 'error', message, data });
  }),
};

jest.mock('../../../../config/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));

import prisma from '../../../../config/db';
import {
  determineDirection,
  matchCounterparty,
  matchArticle,
  matchAccount,
  autoMatch,
} from '../matching.service';
import { ParsedDocument } from '../../parsers/clientBankExchange.parser';
import mappingRulesService from '../mapping-rules.service';

describe('Диагностика работы правил и импорта операций', () => {
  let testCompanyId: string;
  let testUserId: string;
  let testArticleId: string;
  let testCounterpartyId: string;
  let testAccountId: string;
  let testCompanyInn: string | null;
  let testAccountNumber: string;

  beforeAll(async () => {
    // Очищаем логи перед тестами
    collectedLogs.length = 0;

    // Создаем тестовую компанию
    const company = await prisma.company.create({
      data: {
        name: 'Тестовая компания для диагностики',
        inn: '1234567890',
      },
    });
    testCompanyId = company.id;
    testCompanyInn = company.inn;

    // Создаем тестового пользователя
    const user = await prisma.user.create({
      data: {
        email: `test-diagnostics-${Date.now()}@test.com`,
        passwordHash: 'hashed',
        companyId: testCompanyId,
        isActive: true,
      },
    });
    testUserId = user.id;

    // Создаем тестовую статью
    const article = await prisma.article.create({
      data: {
        name: 'Тестовая статья для диагностики',
        type: 'expense',
        companyId: testCompanyId,
        isActive: true,
      },
    });
    testArticleId = article.id;

    // Создаем тестового контрагента
    const counterparty = await prisma.counterparty.create({
      data: {
        name: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
        companyId: testCompanyId,
        category: 'other',
      },
    });
    testCounterpartyId = counterparty.id;

    // Создаем тестовый счет
    testAccountNumber = '40702810123456789012';
    const account = await prisma.account.create({
      data: {
        name: 'Тестовый счет',
        number: testAccountNumber,
        currency: 'RUB',
        companyId: testCompanyId,
        isActive: true,
      },
    });
    testAccountId = account.id;
  });

  afterAll(async () => {
    // Очищаем тестовые данные
    await prisma.mappingRule.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prisma.article.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prisma.counterparty.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prisma.account.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prisma.user.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prisma.company.delete({
      where: { id: testCompanyId },
    });
  });

  beforeEach(() => {
    // Очищаем логи перед каждым тестом
    collectedLogs.length = 0;
  });

  describe('1. Диагностика определения направления операции', () => {
    it('должен определить направление по ИНН компании (expense)', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж',
        payerInn: testCompanyInn ?? undefined,
        receiverInn: '9876543210',
        payer: 'ООО "ТЕСТОВАЯ КОМПАНИЯ"',
        receiver: 'ООО "ПОЛУЧАТЕЛЬ"',
      };

      const direction = await determineDirection(
        operation.payerInn,
        operation.receiverInn,
        testCompanyInn,
        operation.purpose,
        operation.payerAccount,
        operation.receiverAccount,
        [testAccountNumber]
      );

      console.log('\n=== ДИАГНОСТИКА: Определение направления (expense) ===');
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('ИНН компании:', testCompanyInn);
      console.log('Результат:', direction);
      console.log(
        'Логи:',
        JSON.stringify(
          collectedLogs.filter((l) =>
            l.message.includes('ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ')
          ),
          null,
          2
        )
      );

      expect(direction).toBe('expense');
    });

    it('должен определить направление по ИНН компании (income)', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж',
        payerInn: '9876543210',
        receiverInn: testCompanyInn ?? undefined,
        payer: 'ООО "ПЛАТЕЛЬЩИК"',
        receiver: 'ООО "ТЕСТОВАЯ КОМПАНИЯ"',
      };

      const direction = await determineDirection(
        operation.payerInn,
        operation.receiverInn,
        testCompanyInn,
        operation.purpose,
        operation.payerAccount,
        operation.receiverAccount,
        [testAccountNumber]
      );

      console.log('\n=== ДИАГНОСТИКА: Определение направления (income) ===');
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('ИНН компании:', testCompanyInn);
      console.log('Результат:', direction);
      console.log(
        'Логи:',
        JSON.stringify(
          collectedLogs.filter((l) =>
            l.message.includes('ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ')
          ),
          null,
          2
        )
      );

      expect(direction).toBe('income');
    });

    it('должен определить направление по номеру счета (expense)', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж',
        payerAccount: testAccountNumber,
        receiverAccount: '40817810098765432109',
        payer: 'ООО "ТЕСТОВАЯ КОМПАНИЯ"',
        receiver: 'ООО "ПОЛУЧАТЕЛЬ"',
      };

      const direction = await determineDirection(
        operation.payerInn,
        operation.receiverInn,
        testCompanyInn,
        operation.purpose,
        operation.payerAccount,
        operation.receiverAccount,
        [testAccountNumber]
      );

      console.log(
        '\n=== ДИАГНОСТИКА: Определение направления по счету (expense) ==='
      );
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('Номер счета компании:', testAccountNumber);
      console.log('Результат:', direction);
      console.log(
        'Логи:',
        JSON.stringify(
          collectedLogs.filter((l) =>
            l.message.includes('ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ')
          ),
          null,
          2
        )
      );

      expect(direction).toBe('expense');
    });

    it('НЕ должен определить направление без ИНН и номеров счетов', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж',
        payer: 'ООО "ПЛАТЕЛЬЩИК"',
        receiver: 'ООО "ПОЛУЧАТЕЛЬ"',
      };

      const direction = await determineDirection(
        operation.payerInn,
        operation.receiverInn,
        null, // Нет ИНН компании
        operation.purpose,
        operation.payerAccount,
        operation.receiverAccount,
        [] // Нет номеров счетов
      );

      console.log('\n=== ДИАГНОСТИКА: Определение направления БЕЗ данных ===');
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('ИНН компании: null');
      console.log('Номера счетов: []');
      console.log('Результат:', direction);
      console.log(
        'Логи:',
        JSON.stringify(
          collectedLogs.filter((l) =>
            l.message.includes('ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ')
          ),
          null,
          2
        )
      );

      expect(direction).toBeNull();
    });
  });

  describe('2. Диагностика работы правил маппинга для контрагентов', () => {
    let ruleId: string;

    beforeEach(async () => {
      // Создаем тестовое правило для контрагента
      const rule = await mappingRulesService.createMappingRule(
        testCompanyId,
        testUserId,
        {
          ruleType: 'contains',
          pattern: 'ТЕСТОВЫЙ КОНТРАГЕНТ',
          targetType: 'counterparty',
          targetId: testCounterpartyId,
          targetName: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
          sourceField: 'receiver',
        }
      );
      ruleId = rule.id;
    });

    afterEach(async () => {
      // Удаляем тестовое правило
      await prisma.mappingRule.deleteMany({
        where: { id: ruleId },
      });
    });

    it('должен применить правило для контрагента при expense', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж',
        payerInn: testCompanyInn ?? undefined,
        receiverInn: '9876543210',
        payer: 'ООО "ТЕСТОВАЯ КОМПАНИЯ"',
        receiver: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
      };

      const direction = await determineDirection(
        operation.payerInn,
        operation.receiverInn,
        testCompanyInn,
        operation.purpose,
        operation.payerAccount,
        operation.receiverAccount,
        [testAccountNumber]
      );

      const result = await matchCounterparty(
        testCompanyId,
        operation,
        direction
      );

      console.log(
        '\n=== ДИАГНОСТИКА: Применение правила для контрагента (expense) ==='
      );
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('Направление:', direction);
      console.log('Результат сопоставления:', JSON.stringify(result, null, 2));
      console.log(
        'Логи правил:',
        JSON.stringify(
          collectedLogs.filter(
            (l) =>
              l.message.includes('ПРАВИЛО') ||
              l.message.includes('ПОИСК ПРАВИЛ')
          ),
          null,
          2
        )
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testCounterpartyId);
      expect(result?.matchedBy).toBe('rule');
      expect(result?.ruleId).toBe(ruleId);
    });

    it('должен применить правило для контрагента при direction = null (пробует оба поля)', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж',
        payer: 'ООО "ТЕСТОВАЯ КОМПАНИЯ"',
        receiver: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
      };

      const result = await matchCounterparty(
        testCompanyId,
        operation,
        null // direction = null
      );

      console.log(
        '\n=== ДИАГНОСТИКА: Применение правила при direction = null ==='
      );
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('Направление: null');
      console.log('Результат сопоставления:', JSON.stringify(result, null, 2));
      console.log(
        'Логи правил:',
        JSON.stringify(
          collectedLogs.filter(
            (l) =>
              l.message.includes('ПРАВИЛО') ||
              l.message.includes('ПОИСК ПРАВИЛ')
          ),
          null,
          2
        )
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testCounterpartyId);
      expect(result?.matchedBy).toBe('rule');
    });
  });

  describe('3. Диагностика работы правил маппинга для статей', () => {
    let ruleId: string;

    beforeEach(async () => {
      // Создаем тестовое правило для статьи
      const rule = await mappingRulesService.createMappingRule(
        testCompanyId,
        testUserId,
        {
          ruleType: 'contains',
          pattern: 'Тестовый платеж',
          targetType: 'article',
          targetId: testArticleId,
          targetName: 'Тестовая статья для диагностики',
          sourceField: 'description',
        }
      );
      ruleId = rule.id;
    });

    afterEach(async () => {
      // Удаляем тестовое правило
      await prisma.mappingRule.deleteMany({
        where: { id: ruleId },
      });
    });

    it('должен применить правило для статьи при expense', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж за услуги',
        payerInn: testCompanyInn ?? undefined,
        receiverInn: '9876543210',
        payer: 'ООО "ТЕСТОВАЯ КОМПАНИЯ"',
        receiver: 'ООО "ПОЛУЧАТЕЛЬ"',
      };

      const direction = await determineDirection(
        operation.payerInn,
        operation.receiverInn,
        testCompanyInn,
        operation.purpose,
        operation.payerAccount,
        operation.receiverAccount,
        [testAccountNumber]
      );

      const result = await matchArticle(testCompanyId, operation, direction);

      console.log(
        '\n=== ДИАГНОСТИКА: Применение правила для статьи (expense) ==='
      );
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('Направление:', direction);
      console.log('Результат сопоставления:', JSON.stringify(result, null, 2));
      console.log(
        'Логи правил:',
        JSON.stringify(
          collectedLogs.filter(
            (l) =>
              l.message.includes('ПРАВИЛО') ||
              l.message.includes('ПОИСК ПРАВИЛ')
          ),
          null,
          2
        )
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testArticleId);
      expect(result?.matchedBy).toBe('rule');
      expect(result?.ruleId).toBe(ruleId);
    });

    it('должен применить правило для статьи при direction = null (пробует оба типа)', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж за услуги',
        payer: 'ООО "ПЛАТЕЛЬЩИК"',
        receiver: 'ООО "ПОЛУЧАТЕЛЬ"',
      };

      const result = await matchArticle(
        testCompanyId,
        operation,
        null // direction = null
      );

      console.log(
        '\n=== ДИАГНОСТИКА: Применение правила для статьи при direction = null ==='
      );
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('Направление: null');
      console.log('Результат сопоставления:', JSON.stringify(result, null, 2));
      console.log(
        'Логи правил:',
        JSON.stringify(
          collectedLogs.filter(
            (l) =>
              l.message.includes('ПРАВИЛО') ||
              l.message.includes('ПОИСК ПРАВИЛ')
          ),
          null,
          2
        )
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testArticleId);
      expect(result?.matchedBy).toBe('rule');
    });
  });

  describe('4. Диагностика полного автосопоставления', () => {
    let counterpartyRuleId: string;
    let articleRuleId: string;

    beforeEach(async () => {
      // Создаем правила для контрагента и статьи
      const counterpartyRule = await mappingRulesService.createMappingRule(
        testCompanyId,
        testUserId,
        {
          ruleType: 'contains',
          pattern: 'ТЕСТОВЫЙ КОНТРАГЕНТ',
          targetType: 'counterparty',
          targetId: testCounterpartyId,
          targetName: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
          sourceField: 'receiver',
        }
      );
      counterpartyRuleId = counterpartyRule.id;

      const articleRule = await mappingRulesService.createMappingRule(
        testCompanyId,
        testUserId,
        {
          ruleType: 'contains',
          pattern: 'Тестовый платеж',
          targetType: 'article',
          targetId: testArticleId,
          targetName: 'Тестовая статья для диагностики',
          sourceField: 'description',
        }
      );
      articleRuleId = articleRule.id;
    });

    afterEach(async () => {
      // Удаляем тестовые правила
      await prisma.mappingRule.deleteMany({
        where: { id: { in: [counterpartyRuleId, articleRuleId] } },
      });
    });

    it('должен полностью сопоставить операцию с правилами (с направлением)', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж за услуги',
        payerInn: testCompanyInn ?? undefined,
        receiverInn: '9876543210',
        payerAccount: testAccountNumber,
        receiverAccount: '40817810098765432109',
        payer: 'ООО "ТЕСТОВАЯ КОМПАНИЯ"',
        receiver: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
      };

      const result = await autoMatch(
        testCompanyId,
        operation,
        testCompanyInn,
        testAccountNumber
      );

      console.log(
        '\n=== ДИАГНОСТИКА: Полное автосопоставление (с направлением) ==='
      );
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('ИНН компании:', testCompanyInn);
      console.log('Номер счета компании:', testAccountNumber);
      console.log('Результат:', JSON.stringify(result, null, 2));
      console.log('Все логи:', JSON.stringify(collectedLogs, null, 2));

      expect(result.direction).toBe('expense');
      expect(result.matchedCounterpartyId).toBe(testCounterpartyId);
      expect(result.matchedArticleId).toBe(testArticleId);
      expect(result.matchedAccountId).toBe(testAccountId);
      expect(result.matchedBy).toBe('rule');
      expect(result.matchedRuleId).toBe(counterpartyRuleId);
    });

    it('должен полностью сопоставить операцию с правилами (без направления)', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж за услуги',
        payer: 'ООО "ПЛАТЕЛЬЩИК"',
        receiver: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
      };

      const result = await autoMatch(
        testCompanyId,
        operation,
        null, // Нет ИНН компании
        undefined // Нет номера счета
      );

      console.log(
        '\n=== ДИАГНОСТИКА: Полное автосопоставление (без направления) ==='
      );
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('ИНН компании: null');
      console.log('Номер счета компании: undefined');
      console.log('Результат:', JSON.stringify(result, null, 2));
      console.log('Все логи:', JSON.stringify(collectedLogs, null, 2));

      // Даже без направления правила должны работать
      expect(result.matchedCounterpartyId).toBe(testCounterpartyId);
      expect(result.matchedArticleId).toBe(testArticleId);
    });
  });

  describe('5. Диагностика приоритетов правил', () => {
    let equalsRuleId: string;
    let containsRuleId: string;

    beforeEach(async () => {
      // Создаем правило типа "equals" (высший приоритет)
      const equalsRule = await mappingRulesService.createMappingRule(
        testCompanyId,
        testUserId,
        {
          ruleType: 'equals',
          pattern: 'ТОЧНОЕ СОВПАДЕНИЕ',
          targetType: 'counterparty',
          targetId: testCounterpartyId,
          targetName: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
          sourceField: 'receiver',
        }
      );
      equalsRuleId = equalsRule.id;

      // Создаем правило типа "contains" (низший приоритет)
      const containsRule = await mappingRulesService.createMappingRule(
        testCompanyId,
        testUserId,
        {
          ruleType: 'contains',
          pattern: 'ТОЧНОЕ',
          targetType: 'counterparty',
          targetId: testCounterpartyId,
          targetName: 'ООО "ТЕСТОВЫЙ КОНТРАГЕНТ"',
          sourceField: 'receiver',
        }
      );
      containsRuleId = containsRule.id;
    });

    afterEach(async () => {
      await prisma.mappingRule.deleteMany({
        where: { id: { in: [equalsRuleId, containsRuleId] } },
      });
    });

    it('должен применить правило с более высоким приоритетом (equals)', async () => {
      const operation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж',
        receiver: 'ТОЧНОЕ СОВПАДЕНИЕ',
      };

      const result = await matchCounterparty(
        testCompanyId,
        operation,
        'expense'
      );

      console.log('\n=== ДИАГНОСТИКА: Приоритет правил ===');
      console.log('Операция:', JSON.stringify(operation, null, 2));
      console.log('Результат:', JSON.stringify(result, null, 2));
      console.log(
        'Логи правил:',
        JSON.stringify(
          collectedLogs.filter((l) => l.message.includes('ПРАВИЛО')),
          null,
          2
        )
      );

      expect(result).not.toBeNull();
      expect(result?.ruleId).toBe(equalsRuleId); // Должно примениться правило "equals"
    });
  });

  describe('6. Сводная диагностика', () => {
    it('должен собрать полную информацию о работе системы', async () => {
      console.log('\n=== СВОДНАЯ ДИАГНОСТИКА СИСТЕМЫ ПРАВИЛ ===\n');

      // Проверяем наличие данных компании
      const company = await prisma.company.findUnique({
        where: { id: testCompanyId },
        select: { inn: true },
      });

      const accounts = await prisma.account.findMany({
        where: { companyId: testCompanyId, isActive: true },
        select: { number: true },
      });

      const rules = await prisma.mappingRule.findMany({
        where: { companyId: testCompanyId },
      });

      const articles = await prisma.article.findMany({
        where: { companyId: testCompanyId, isActive: true },
      });

      const counterparties = await prisma.counterparty.findMany({
        where: { companyId: testCompanyId },
      });

      console.log('1. Данные компании:');
      console.log('   - ИНН:', company?.inn || 'НЕ УКАЗАН');
      console.log('   - Счета:', accounts.length, 'шт.');
      console.log(
        '   - Номера счетов:',
        accounts.map((a) => a.number).join(', ') || 'НЕТ'
      );

      console.log('\n2. Правила маппинга:');
      console.log('   - Всего правил:', rules.length);
      console.log('   - По типам:', {
        article: rules.filter((r) => r.targetType === 'article').length,
        counterparty: rules.filter((r) => r.targetType === 'counterparty')
          .length,
        account: rules.filter((r) => r.targetType === 'account').length,
      });
      console.log('   - По sourceField:', {
        description: rules.filter((r) => r.sourceField === 'description')
          .length,
        payer: rules.filter((r) => r.sourceField === 'payer').length,
        receiver: rules.filter((r) => r.sourceField === 'receiver').length,
      });
      console.log('   - По ruleType:', {
        equals: rules.filter((r) => r.ruleType === 'equals').length,
        contains: rules.filter((r) => r.ruleType === 'contains').length,
        regex: rules.filter((r) => r.ruleType === 'regex').length,
        alias: rules.filter((r) => r.ruleType === 'alias').length,
      });

      console.log('\n3. Справочники:');
      console.log('   - Статей:', articles.length, 'шт.');
      console.log('   - Контрагентов:', counterparties.length, 'шт.');

      console.log('\n4. Тестовая операция:');
      const testOperation: ParsedDocument = {
        date: new Date('2025-01-15'),
        amount: 1000,
        purpose: 'Тестовый платеж',
        payerInn: company?.inn || undefined,
        receiverInn: '9876543210',
        payerAccount: accounts[0]?.number || undefined,
        receiverAccount: '40817810098765432109',
        payer: 'ООО "ТЕСТОВАЯ КОМПАНИЯ"',
        receiver: 'ООО "ПОЛУЧАТЕЛЬ"',
      };

      const direction = await determineDirection(
        testOperation.payerInn,
        testOperation.receiverInn,
        company?.inn || null,
        testOperation.purpose,
        testOperation.payerAccount,
        testOperation.receiverAccount,
        accounts.map((a) => a.number).filter((n): n is string => !!n)
      );

      console.log('   - Направление:', direction || 'НЕ ОПРЕДЕЛЕНО');
      console.log(
        '   - Логи определения направления:',
        JSON.stringify(
          collectedLogs.filter((l) =>
            l.message.includes('ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ')
          ),
          null,
          2
        )
      );

      const autoMatchResult = await autoMatch(
        testCompanyId,
        testOperation,
        company?.inn || null,
        accounts[0]?.number || undefined
      );

      console.log('\n5. Результат автосопоставления:');
      console.log(
        '   - Направление:',
        autoMatchResult.direction || 'НЕ ОПРЕДЕЛЕНО'
      );
      console.log(
        '   - Контрагент:',
        autoMatchResult.matchedCounterpartyId || 'НЕ СОПОСТАВЛЕН'
      );
      console.log(
        '   - Статья:',
        autoMatchResult.matchedArticleId || 'НЕ СОПОСТАВЛЕНА'
      );
      console.log(
        '   - Счет:',
        autoMatchResult.matchedAccountId || 'НЕ СОПОСТАВЛЕН'
      );
      console.log(
        '   - Метод сопоставления:',
        autoMatchResult.matchedBy || 'НЕТ'
      );
      console.log('   - ID правила:', autoMatchResult.matchedRuleId || 'НЕТ');

      console.log('\n6. Все логи автосопоставления:');
      console.log(JSON.stringify(collectedLogs, null, 2));

      // Выводы
      console.log('\n=== ВЫВОДЫ ===');
      if (!company?.inn) {
        console.log(
          '⚠️  ИНН компании НЕ указан - направление может не определяться'
        );
      }
      if (accounts.length === 0) {
        console.log(
          '⚠️  Счета компании НЕ созданы - направление может не определяться'
        );
      }
      if (rules.length === 0) {
        console.log(
          '⚠️  Правила маппинга НЕ созданы - автоматическое сопоставление не работает'
        );
      }
      if (!autoMatchResult.direction) {
        console.log(
          '⚠️  Направление НЕ определяется - правила могут работать некорректно'
        );
      }
      if (!autoMatchResult.matchedBy) {
        console.log(
          '⚠️  Автосопоставление НЕ работает - проверьте правила и данные'
        );
      } else {
        console.log('✅ Автосопоставление работает');
      }
    });
  });
});
