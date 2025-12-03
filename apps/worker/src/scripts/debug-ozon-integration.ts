// apps/worker/src/scripts/debug-ozon-integration.ts
import { ozonOperationService } from '../jobs/ozon.generate.operations';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

interface DebugResult {
  success: boolean;
  mode: 'api' | 'direct';
  integration?: any;
  cashFlowData?: any;
  amount?: number;
  operation?: any;
  errors: string[];
  apiAvailable?: boolean;
}

class OzonIntegrationDebugger {
  private integrationId: string;
  private result: DebugResult;
  private useApiMode: boolean = false;

  constructor(integrationId: string) {
    this.integrationId = integrationId;
    this.result = {
      success: false,
      mode: 'direct',
      errors: [],
    };
  }

  async run(): Promise<DebugResult> {
    console.log(
      `🔍 Детальная отладка Ozon интеграции: ${this.integrationId}\n`
    );

    try {
      const today = new Date().getDay();
      const weekdayNames = [
        'воскресенье',
        'понедельник',
        'вторник',
        'среда',
        'четверг',
        'пятница',
        'суббота',
      ];
      if (today !== 3) {
        console.log(
          `⚠️  ВНИМАНИЕ: Сегодня ${weekdayNames[today]}, а не среда.`
        );
        console.log(
          `   В production интеграция работает только по средам, но для отладки продолжаем...`
        );
      } else {
        console.log(
          `✅ Сегодня ${weekdayNames[today]} - подходящий день для работы интеграции`
        );
      }

      // Определяем режим работы
      await this.determineMode();

      if (this.useApiMode) {
        await this.runApiMode();
      } else {
        await this.runDirectMode();
      }

      this.result.success = this.result.errors.length === 0;
    } catch (error: any) {
      this.result.errors.push(`Критическая ошибка: ${error.message}`);
      console.error('Критическая ошибка:', error);
    } finally {
      if (!this.useApiMode) {
        await prisma.$disconnect();
      }
    }

    this.printSummary();
    return this.result;
  }

  private async determineMode(): Promise<void> {
    console.log('1. Определяем режим работы...');

    // Простая проверка доступности API
    this.result.apiAvailable = await this.checkApiAvailability();

    if (this.result.apiAvailable) {
      this.useApiMode = true;
      this.result.mode = 'api';
      console.log('API доступен, используем API режим');
    } else {
      this.useApiMode = false;
      this.result.mode = 'direct';
      console.log(
        'API недоступен, используем прямой режим (прямой доступ к БД и Ozon API)'
      );
      console.log('Запустите API сервер для использования нового режима:');
      console.log('   pnpm --filter api dev');
    }
  }

  private async checkApiAvailability(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Используем API_URL из конфигурации worker
      const apiUrl = env.API_URL || 'http://localhost:4000';

      // Подготавливаем headers с аутентификацией, если есть WORKER_API_KEY
      const headers: Record<string, string> = {};
      if (env.WORKER_API_KEY) {
        headers['Authorization'] = `Bearer ${env.WORKER_API_KEY}`;
      }

      const response = await fetch(`${apiUrl}/api/integrations/ozon`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async runApiMode(): Promise<void> {
    console.log('\n2. Работаем через API...');

    await this.testApiHealth();
    await this.testOzonApi();

    if (this.result.errors.length === 0) {
      await this.createOperationViaApi();
    }
  }

  private async runDirectMode(): Promise<void> {
    console.log('\n2. 🔧 Работаем напрямую (прямой доступ к БД и Ozon API)...');

    await this.checkIntegrationDirect();
    await this.checkExistingOperationsDirect();
    await this.testOzonApiDirect();

    const integration = this.result.integration;
    const period = this.getQueryPeriod(
      integration.paymentSchedule as 'next_week' | 'week_after'
    );
    const paymentDates = this.calculatePaymentDates(
      period.to,
      integration.paymentSchedule as 'next_week' | 'week_after'
    );

    console.log(
      `   Дата операции: ${paymentDates.paymentDate.toLocaleDateString('ru-RU')}`
    );
    console.log(
      `   Период данных: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
    );

    if (this.result.errors.length === 0 && this.result.amount !== undefined) {
      await this.createOperationDirect();
    }
  }

  // === API MODE METHODS ===

  private async testApiHealth(): Promise<void> {
    console.log('   🏥 Проверяем доступность API...');

    try {
      const isHealthy = await ozonOperationService.healthCheck();

      if (isHealthy) {
        console.log('   API работает корректно');
      } else {
        this.result.errors.push('API недоступен или работает некорректно');
        console.log('   Проблемы с API');
      }
    } catch (error: any) {
      this.result.errors.push(`Ошибка проверки API: ${error.message}`);
      console.log(`   Ошибка проверки API: ${error.message}`);
    }
  }

  private async testOzonApi(): Promise<void> {
    console.log('   Тестируем Ozon API через наш API...');

    try {
      const operationCreated = await ozonOperationService.createTestOperation(
        this.integrationId
      );

      if (operationCreated) {
        console.log('   Тестовая операция успешно создана через API');
        this.result.amount = 1;
      } else {
        console.log(
          '   Операция не создана (сумма 0 или операция уже существует)'
        );
        this.result.errors.push('Операция не создана (сумма 0 или дубликат)');
      }
    } catch (apiError: any) {
      const errorMsg = `Ошибка при тестировании через API: ${apiError.message}`;
      this.result.errors.push(errorMsg);
      console.log(`   ${errorMsg}`);
    }
  }

  private async createOperationViaApi(): Promise<void> {
    console.log('   🚀 Создаем операцию через API...');

    try {
      const operationCreated =
        await ozonOperationService.createOperationForIntegration(
          this.integrationId
        );

      if (operationCreated) {
        console.log('   Операция успешно создана через API');
        this.result.operation = { id: 'created-via-api', created: true };
      } else {
        console.log(
          '   Операция не создана (сумма 0 или операция уже существует)'
        );
        this.result.errors.push('Операция не создана через API');
      }
    } catch (error: any) {
      const errorMsg = `Ошибка при создании операции через API: ${error.message}`;
      this.result.errors.push(errorMsg);
      console.log(`    ${errorMsg}`);
    }
  }

  // === DIRECT MODE METHODS ===

  private async checkIntegrationDirect(): Promise<void> {
    console.log('    Проверяем интеграцию в базе данных...');

    const integration = await prisma.integration.findFirst({
      where: {
        id: this.integrationId,
        type: 'ozon',
      },
      include: {
        company: true,
        article: true,
        account: true,
      },
    });

    if (!integration) {
      this.result.errors.push('Интеграция не найдена');
      throw new Error('Integration not found');
    }

    this.result.integration = integration;

    console.log('   Интеграция найдена:');
    this.printIntegrationInfo(integration);

    // Дополнительная проверка articleId
    console.log('   Проверка данных интеграции:');
    console.log(`     - articleId: ${integration.articleId || 'ОТСУТСТВУЕТ!'}`);
    console.log(`     - articleName: ${integration.article?.name || 'N/A'}`);
    console.log(`     - accountId: ${integration.accountId || 'ОТСУТСТВУЕТ!'}`);
    console.log(`     - accountName: ${integration.account?.name || 'N/A'}`);

    if (!integration.articleId) {
      this.result.errors.push('articleId отсутствует в интеграции');
      console.log('   ❌ ОШИБКА: articleId отсутствует в интеграции!');
    }

    if (!integration.isActive) {
      this.result.errors.push('Интеграция не активна');
      throw new Error('Integration not active');
    }

    if (!integration.clientKey || !integration.apiKey) {
      this.result.errors.push('Отсутствуют API ключи');
      throw new Error('Missing API keys');
    }
  }

  private async checkExistingOperationsDirect(): Promise<void> {
    console.log('   Проверяем существующие операции Ozon...');

    const operations = await prisma.operation.findMany({
      where: {
        companyId: this.result.integration.companyId,
        articleId: this.result.integration.articleId,
        accountId: this.result.integration.accountId,
        description: {
          contains: 'Ozon выплата',
        },
      },
      orderBy: {
        operationDate: 'desc',
      },
      take: 5,
    });

    console.log(`   Найдено операций: ${operations.length}`);
    operations.forEach((op: (typeof operations)[0], index: number) => {
      console.log(
        `   ${index + 1}. ${op.operationDate.toLocaleDateString('ru-RU')} - ${op.amount} ${op.currency} - ${op.description?.substring(0, 50)}...`
      );
    });
  }

  private async testOzonApiDirect(): Promise<void> {
    console.log('   Тестируем прямой запрос к Ozon API...');

    const integration = this.result.integration;

    // Получаем период для запроса
    const period = this.getQueryPeriod(
      integration.paymentSchedule as 'next_week' | 'week_after'
    );
    console.log(
      `   Период запроса: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
    );

    // Проверяем дубликаты операций
    const duplicateOperation = await prisma.operation.findFirst({
      where: {
        companyId: integration.companyId,
        articleId: integration.articleId,
        accountId: integration.accountId,
        operationDate: {
          gte: period.from,
          lte: period.to,
        },
        description: {
          contains: `Ozon выплата`,
        },
      },
    });

    if (duplicateOperation) {
      this.result.errors.push(
        `Операция за этот период уже существует: ${duplicateOperation.id}`
      );
      console.log(
        `   Операция за этот период уже существует: ${duplicateOperation.id}`
      );
      return;
    }

    console.log('   Дубликатов не найдено, можно создавать новую операцию');

    // Тестируем API запрос
    try {
      const fromISO = period.from.toISOString();
      const toISO = period.to.toISOString();

      console.log(`    Запрос данных за: ${fromISO} - ${toISO}`);

      // Временно используем старый метод для прямого доступа
      const cashFlowData = await this.getCashFlowStatementDirect(
        integration.clientKey,
        integration.apiKey,
        fromISO,
        toISO
      );

      this.result.cashFlowData = cashFlowData;

      console.log(`   Ozon API ответил успешно`);
      console.log(
        `    Найдено cash_flows: ${cashFlowData.result.cash_flows.length}`
      );

      if (cashFlowData.result.cash_flows.length > 0) {
        await this.analyzeCashFlowData(cashFlowData);
      } else {
        console.log('   Нет данных за указанный период');
        this.result.errors.push('Нет данных за указанный период');
      }
    } catch (apiError: any) {
      const errorMsg = `Ошибка Ozon API: ${apiError.message}`;
      this.result.errors.push(errorMsg);
      console.log(`   ${errorMsg}`);
    }
  }

  private async createOperationDirect(): Promise<void> {
    console.log('   Создаем операцию напрямую...');

    try {
      const integration = this.result.integration;
      const cashFlowData = this.result.cashFlowData;
      const calculatedAmount = this.result.amount!;

      // Проверяем, что payment < 0 для создания операции
      if (calculatedAmount >= 0) {
        console.log(
          `    Операция не создана (payment ${calculatedAmount} >= 0, создаем только при payment < 0)`
        );
        return;
      }

      if (calculatedAmount === 0) {
        console.log('    Операция не создана (сумма 0)');
        return;
      }

      const period = this.getQueryPeriod(
        integration.paymentSchedule as 'next_week' | 'week_after'
      );

      const paymentDates = this.calculatePaymentDates(
        period.to,
        integration.paymentSchedule as 'next_week' | 'week_after'
      );
      console.log(`    Сумма операции: ${calculatedAmount}`);
      console.log(
        `    Дата операции: ${paymentDates.paymentDate.toLocaleDateString('ru-RU')}`
      );
      console.log(
        `    Период данных: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
      );

      const currency =
        cashFlowData.result.details?.[0]?.payments?.[0]?.currency_code ||
        cashFlowData.result.cash_flows[0]?.currency_code ||
        'RUB';

      // Проверяем наличие обязательных полей
      if (!integration.articleId) {
        const errorMsg = 'Article ID отсутствует в интеграции';
        this.result.errors.push(errorMsg);
        console.log(`    ${errorMsg}`);
        return;
      }
      if (!integration.accountId) {
        const errorMsg = 'Account ID отсутствует в интеграции';
        this.result.errors.push(errorMsg);
        console.log(`    ${errorMsg}`);
        return;
      }

      const operationType = calculatedAmount < 0 ? 'expense' : 'income';
      const operationAmount = Math.abs(calculatedAmount);

      // Создаем операцию - явно указываем все поля
      const operationData = {
        type: operationType,
        operationDate: paymentDates.paymentDate,
        amount: operationAmount,
        currency,
        articleId: integration.articleId, // Явно указываем articleId
        accountId: integration.accountId, // Явно указываем accountId
        description: this.generateOperationDescription(
          period.from,
          period.to,
          operationAmount,
          operationType,
          integration.paymentSchedule as 'next_week' | 'week_after'
        ),
        isConfirmed: true,
      };

      console.log(`    Создаем операцию:`, {
        type: operationData.type,
        amount: operationData.amount,
        currency: operationData.currency,
        date: operationData.operationDate.toLocaleDateString('ru-RU'),
        articleId: operationData.articleId,
        article: integration.article?.name || 'N/A',
        accountId: operationData.accountId,
        account: integration.account?.name || 'N/A',
      });

      // Явно указываем все поля при создании, не используем spread
      const createdOperation = await prisma.operation.create({
        data: {
          type: operationData.type,
          operationDate: operationData.operationDate,
          amount: operationData.amount,
          currency: operationData.currency,
          articleId: operationData.articleId, // Явно указываем articleId
          accountId: operationData.accountId, // Явно указываем accountId
          description: operationData.description,
          isConfirmed: operationData.isConfirmed,
          companyId: integration.companyId,
        },
        include: {
          article: true,
          account: true,
        },
      });

      this.result.operation = createdOperation;
      console.log(`    Операция успешно создана: ${createdOperation.id}`);
      console.log(`    Проверка сохраненных данных:`, {
        articleId: createdOperation.articleId,
        articleName: createdOperation.article?.name || 'N/A',
        accountId: createdOperation.accountId,
        accountName: createdOperation.account?.name || 'N/A',
      });

      if (!createdOperation.articleId) {
        const errorMsg = 'ВНИМАНИЕ: articleId не сохранился в операции!';
        this.result.errors.push(errorMsg);
        console.log(`    ${errorMsg}`);
      }
    } catch (error: any) {
      const errorMsg = `Ошибка при создании операции: ${error.message}`;
      this.result.errors.push(errorMsg);
      console.log(`    ${errorMsg}`);
    }
  }

  // === DIRECT MODE HELPERS ===

  private async getCashFlowStatementDirect(
    clientKey: string,
    apiKey: string,
    dateFrom: string,
    dateTo: string
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        'https://api-seller.ozon.ru/v1/finance/cash-flow-statement/list',
        {
          method: 'POST',
          headers: {
            'Client-Id': clientKey,
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: {
              from: dateFrom,
              to: dateTo,
            },
            with_details: true,
            page: 1,
            page_size: 100,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Ozon API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getQueryPeriod(paymentSchedule: 'next_week' | 'week_after'): {
    from: Date;
    to: Date;
  } {
    const now = new Date();

    if (paymentSchedule === 'next_week') {
      // Для "next_week" - текущая неделя (понедельник - воскресенье текущей недели)
      const to = new Date(now);
      // now.getDate() - now.getDay() дает воскресенье текущей недели
      // Если сегодня воскресенье (getDay() = 0), то это и есть воскресенье текущей недели
      if (now.getDay() === 0) {
        to.setDate(now.getDate());
      } else {
        to.setDate(now.getDate() - now.getDay());
      }
      to.setHours(23, 59, 59, 999);

      const from = new Date(to);
      from.setDate(to.getDate() - 6); // Понедельник текущей недели
      from.setHours(0, 0, 0, 0);

      console.log(
        `    Период запроса данных Ozon (next_week - текущая неделя):`
      );
      console.log(`      с: ${from.toLocaleDateString('ru-RU')}`);
      console.log(`      по: ${to.toLocaleDateString('ru-RU')}`);
      console.log(`    График выплат: следующая неделя`);

      return { from, to };
    } else {
      // Для "week_after" - прошлая неделя (понедельник - воскресенье прошлой недели)
      const to = new Date(now);
      // Находим воскресенье прошлой недели
      if (now.getDay() === 0) {
        // Если сегодня воскресенье, то прошлое воскресенье - это 7 дней назад
        to.setDate(now.getDate() - 7);
      } else {
        // Иначе находим воскресенье текущей недели и отнимаем 7 дней
        to.setDate(now.getDate() - now.getDay() - 7);
      }
      to.setHours(23, 59, 59, 999);

      const from = new Date(to);
      from.setDate(to.getDate() - 6); // Понедельник прошлой недели
      from.setHours(0, 0, 0, 0);

      console.log(
        `    Период запроса данных Ozon (week_after - прошлая неделя):`
      );
      console.log(`      с: ${from.toLocaleDateString('ru-RU')}`);
      console.log(`      по: ${to.toLocaleDateString('ru-RU')}`);
      console.log(`    График выплат: через неделю`);

      return { from, to };
    }
  }

  private calculatePaymentDates(
    periodEndDate: Date,
    paymentSchedule: 'next_week' | 'week_after'
  ): { calculationDate: Date; paymentDate: Date } {
    const periodEnd = new Date(periodEndDate);

    // Базовая дата расчета - понедельник после окончания периода
    const baseCalculationDate = new Date(periodEnd);
    baseCalculationDate.setDate(
      periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7
    );

    if (paymentSchedule === 'next_week') {
      // Выплата на следующей неделе
      const paymentDate = new Date(baseCalculationDate);
      paymentDate.setDate(baseCalculationDate.getDate() + 2); // +2 дня = среда
      return { calculationDate: baseCalculationDate, paymentDate };
    } else {
      // Выплата через неделю (week_after)
      const calculationDate = new Date(baseCalculationDate);
      calculationDate.setDate(baseCalculationDate.getDate() + 7); // +7 дней от базовой даты
      const paymentDate = new Date(calculationDate);
      paymentDate.setDate(calculationDate.getDate() + 2); // +2 дня = среда
      return { calculationDate, paymentDate };
    }
  }

  private async analyzeCashFlowData(cashFlowData: any): Promise<void> {
    const cashFlow = cashFlowData.result.cash_flows[0];

    console.log(`    Данные из cash_flows:`);
    console.log(`     - orders_amount: ${cashFlow.orders_amount}`);
    console.log(`     - services_amount: ${cashFlow.services_amount}`);
    console.log(`     - commission_amount: ${cashFlow.commission_amount}`);
    console.log(`     - returns_amount: ${cashFlow.returns_amount}`);
    console.log(`     - currency_code: ${cashFlow.currency_code}`);

    const details = cashFlowData.result.details;
    if (details && details.length > 0) {
      const detail = details[0];
      console.log(`    Данные из details:`);
      console.log(`     - begin_balance: ${detail.begin_balance_amount}`);
      console.log(`     - end_balance: ${detail.end_balance_amount}`);

      const payments = detail.payments;
      if (payments && payments.length > 0) {
        console.log(`    Платежи (payments):`);
        payments.forEach((payment: any, index: number) => {
          console.log(
            `     ${index + 1}. payment: ${payment.payment} ${payment.currency_code}`
          );
        });

        // Используем payment из details если есть
        const paymentAmount = payments[0].payment;
        this.result.amount = paymentAmount;
        console.log(`    Сумма из payment: ${paymentAmount}`);

        // Проверяем, что payment < 0 для создания операции
        if (paymentAmount >= 0) {
          console.log(
            `     Payment ${paymentAmount} >= 0, операция не будет создана (создаем только при payment < 0)`
          );
          this.result.errors.push(
            `Payment ${paymentAmount} >= 0, операция не создается (создаем только при payment < 0)`
          );
        } else {
          console.log(
            `    Payment ${paymentAmount} < 0, операция будет создана`
          );
        }
      } else {
        console.log(`    Поле payments не найдено в details`);
        // Fallback расчет
        const calculatedAmount =
          cashFlow.orders_amount +
          cashFlow.services_amount -
          cashFlow.commission_amount -
          Math.abs(cashFlow.returns_amount);
        this.result.amount = calculatedAmount;
        console.log(`    Расчетная сумма: ${calculatedAmount}`);

        // Для fallback также проверяем, что сумма < 0
        if (calculatedAmount >= 0) {
          console.log(
            `     Расчетная сумма ${calculatedAmount} >= 0, операция не будет создана (создаем только при payment < 0)`
          );
          this.result.errors.push(
            `Расчетная сумма ${calculatedAmount} >= 0, операция не создается (создаем только при payment < 0)`
          );
        } else {
          console.log(
            `    Расчетная сумма ${calculatedAmount} < 0, операция будет создана`
          );
        }
      }
    } else {
      console.log(`    Поле details не найдено в ответе`);
      // Fallback расчет
      const calculatedAmount =
        cashFlow.orders_amount +
        cashFlow.services_amount -
        cashFlow.commission_amount -
        Math.abs(cashFlow.returns_amount);
      this.result.amount = calculatedAmount;
      console.log(`    Расчетная сумма: ${calculatedAmount}`);

      // Для fallback также проверяем, что сумма < 0
      if (calculatedAmount >= 0) {
        console.log(
          `     Расчетная сумма ${calculatedAmount} >= 0, операция не будет создана (создаем только при payment < 0)`
        );
        this.result.errors.push(
          `Расчетная сумма ${calculatedAmount} >= 0, операция не создается (создаем только при payment < 0)`
        );
      } else {
        console.log(
          `    Расчетная сумма ${calculatedAmount} < 0, операция будет создана`
        );
      }
    }

    if (this.result.amount === undefined) {
      console.log(`    Сумма не определена`);
      this.result.errors.push(`Сумма выплаты не определена`);
    } else if (this.result.amount === 0) {
      console.log(`    Сумма: ${this.result.amount} (не создаем операцию)`);
      this.result.errors.push(`Сумма выплаты ${this.result.amount} = 0`);
    } else if (this.result.amount > 0) {
      console.log(
        `     Сумма: ${this.result.amount} > 0 (не создаем операцию, создаем только при payment < 0)`
      );
      this.result.errors.push(
        `Сумма выплаты ${this.result.amount} > 0, операция не создается (создаем только при payment < 0)`
      );
    } else {
      console.log(
        `    Сумма: ${this.result.amount} < 0 (можно создавать операцию)`
      );
    }
  }

  private generateOperationDescription(
    periodFrom: Date,
    periodTo: Date,
    amount: number,
    operationType: 'income' | 'expense',
    paymentSchedule: 'next_week' | 'week_after'
  ): string {
    const formatDate = (date: Date) => date.toLocaleDateString('ru-RU');
    const scheduleText =
      paymentSchedule === 'next_week'
        ? 'выплата на следующей неделе'
        : 'выплата через неделю';

    const typeText = operationType === 'income' ? 'доход' : 'расход';

    return `Ozon ${typeText} (${scheduleText}) за период ${formatDate(periodFrom)} - ${formatDate(periodTo)}. Сумма: ${amount.toLocaleString('ru-RU')} RUB`;
  }

  private printIntegrationInfo(integration: any): void {
    console.log(`   - ID: ${integration.id}`);
    console.log(`   - Активна: ${integration.isActive}`);
    console.log(`   - Компания: ${integration.company.name}`);
    console.log(
      `   - Статья: ${integration.article.name} (${integration.articleId})`
    );
    console.log(
      `   - Счет: ${integration.account.name} (${integration.accountId})`
    );
    console.log(
      `   - Client-Key: ${integration.clientKey ? '***' + integration.clientKey.slice(-4) : 'не указан'}`
    );
    console.log(
      `   - Api-Key: ${integration.apiKey ? '***' + integration.apiKey.slice(-4) : 'не указан'}`
    );
    console.log(`   - График выплат: ${integration.paymentSchedule}`);
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(50));
    console.log(' ИТОГИ ОТЛАДКИ');
    console.log('='.repeat(50));

    console.log(` Режим работы: ${this.result.mode.toUpperCase()}`);
    console.log(` API доступен: ${this.result.apiAvailable ? ' Да' : ' Нет'}`);

    if (this.result.success) {
      console.log(' ОТЛАДКА ЗАВЕРШЕНА УСПЕШНО!');
      if (this.result.operation) {
        console.log(' Операция успешно создана');
      }
    } else {
      console.log(' ОТЛАДКА ЗАВЕРШЕНА С ОШИБКАМИ:');
      this.result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n РЕКОМЕНДАЦИИ:');
    if (this.result.mode === 'direct') {
      console.log(
        '   - Для использования нового API режима запустите API сервер:'
      );
      console.log('     pnpm --filter api dev');
    }
    if (this.result.errors.length > 0) {
      if (this.result.errors.some((e) => e.includes('Ozon API'))) {
        console.log('   - Проверьте API ключи Ozon в настройках интеграции');
        console.log(
          '   - Убедитесь, что API ключи имеют права на финансовые данные'
        );
      }
      if (this.result.errors.some((e) => e.includes('не найдена'))) {
        console.log('   - Проверьте правильность ID интеграции');
      }
    }

    console.log('\n Отладка завершена');
  }
}

// Запуск отладки
async function main() {
  const integrationId = process.argv[2];

  if (!integrationId) {
    console.error(' Укажите ID интеграции:');
    console.error('   pnpm run debug-ozon <integration-id>');
    console.error('\nПример:');
    console.error('   pnpm run debug-ozon cmi4lbmtg0001s9u7kbnin98p');
    process.exit(1);
  }

  const debuggerInstance = new OzonIntegrationDebugger(integrationId);
  const result = await debuggerInstance.run();

  process.exit(result.success ? 0 : 1);
}

// Обработка ошибок верхнего уровня
process.on('unhandledRejection', (reason, promise) => {
  console.error(' Необработанное исключение:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(' Непойманное исключение:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error(' Фатальная ошибка:', error);
  process.exit(1);
});
