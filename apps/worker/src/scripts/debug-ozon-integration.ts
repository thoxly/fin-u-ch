// apps/worker/src/scripts/debug-ozon-integration.ts
import { prisma } from '../config/prisma';
import { ozonOperationService } from '../jobs/ozon.generate.operations';

interface DebugResult {
  success: boolean;
  integration?: any;
  cashFlowData?: any;
  amount?: number;
  operation?: any;
  errors: string[];
}

class OzonIntegrationDebugger {
  private integrationId: string;
  private result: DebugResult;

  constructor(integrationId: string) {
    this.integrationId = integrationId;
    this.result = {
      success: false,
      errors: [],
    };
  }

  async run(): Promise<DebugResult> {
    console.log(
      `🔍 Детальная отладка Ozon интеграции: ${this.integrationId}\n`
    );

    try {
      await this.checkIntegration();
      await this.checkExistingOperations();
      await this.testOzonApi();

      // Если нет ошибок после тестирования API, пробуем создать операцию
      if (this.result.errors.length === 0 && this.result.amount !== undefined) {
        await this.createOperation();
      }

      this.result.success = this.result.errors.length === 0;
    } catch (error: any) {
      this.result.errors.push(`Критическая ошибка: ${error.message}`);
      console.error('💥 Критическая ошибка:', error);
    } finally {
      await this.cleanup();
    }

    this.printSummary();
    return this.result;
  }

  private async checkIntegration(): Promise<void> {
    console.log('1. 🔎 Проверяем интеграцию в базе данных...');

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

    console.log('✅ Интеграция найдена:');
    this.printIntegrationInfo(integration);

    if (!integration.isActive) {
      this.result.errors.push('Интеграция не активна');
      throw new Error('Integration not active');
    }

    if (!integration.clientKey || !integration.apiKey) {
      this.result.errors.push('Отсутствуют API ключи');
      throw new Error('Missing API keys');
    }
  }

  private async checkExistingOperations(): Promise<void> {
    console.log('\n2. 📊 Проверяем существующие операции Ozon...');

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
    operations.forEach((op, index) => {
      console.log(
        `   ${index + 1}. ${op.operationDate.toLocaleDateString('ru-RU')} - ${op.amount} ${op.currency} - ${op.description?.substring(0, 50)}...`
      );
    });
  }

  private async testOzonApi(): Promise<void> {
    console.log('\n3. 🌐 Тестируем запрос к Ozon API...');

    const integration = this.result.integration;

    // Получаем период для запроса
    const period = ozonOperationService.getQueryPeriod(
      integration.paymentSchedule as 'next_week' | 'week_after'
    );
    console.log(
      `   📅 Период запроса: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
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
        `   ❌ Операция за этот период уже существует: ${duplicateOperation.id}`
      );
      return;
    }

    console.log('   ✅ Дубликатов не найдено, можно создавать новую операцию');

    // Тестируем API запрос
    try {
      const fromISO = period.from.toISOString();
      const toISO = period.to.toISOString();

      console.log(`   🔄 Запрос данных за: ${fromISO} - ${toISO}`);

      const cashFlowData = await ozonOperationService.getCashFlowStatement(
        integration.clientKey,
        integration.apiKey,
        /* fromISO,
        toISO */
        '2025-08-11T00:00:00.000Z',
        '2025-08-17T00:00:00.000Z'
      );

      this.result.cashFlowData = cashFlowData;

      console.log(`   ✅ Ozon API ответил успешно`);
      console.log(
        `   📦 Найдено cash_flows: ${cashFlowData.result.cash_flows.length}`
      );

      if (cashFlowData.result.cash_flows.length > 0) {
        await this.analyzeCashFlowData(cashFlowData);
      } else {
        console.log('   ❌ Нет данных за указанный период');
        this.result.errors.push('Нет данных за указанный период');
      }
    } catch (apiError: any) {
      const errorMsg = `Ошибка Ozon API: ${apiError.message}`;
      this.result.errors.push(errorMsg);
      console.log(`   ❌ ${errorMsg}`);
      this.handleApiError(apiError);
    }
  }

  private async analyzeCashFlowData(cashFlowData: any): Promise<void> {
    const cashFlow = cashFlowData.result.cash_flows[0];

    console.log(`   📊 Данные из cash_flows:`);
    console.log(`     - orders_amount: ${cashFlow.orders_amount}`);
    console.log(`     - services_amount: ${cashFlow.services_amount}`);
    console.log(`     - commission_amount: ${cashFlow.commission_amount}`);
    console.log(`     - returns_amount: ${cashFlow.returns_amount}`);
    console.log(`     - currency_code: ${cashFlow.currency_code}`);

    // Анализируем details если есть
    const details = cashFlowData.result.details;
    if (details && details.length > 0) {
      const detail = details[0];
      console.log(`   📋 Данные из details:`);
      console.log(`     - begin_balance: ${detail.begin_balance_amount}`);
      console.log(`     - end_balance: ${detail.end_balance_amount}`);

      const payments = detail.payments;
      if (payments && payments.length > 0) {
        console.log(`   💰 Платежи (payments):`);
        payments.forEach((payment: any, index: number) => {
          console.log(
            `     ${index + 1}. payment: ${payment.payment} ${payment.currency_code}`
          );
        });
      } else {
        console.log(`   ❌ Поле payments не найдено в details`);
      }
    } else {
      console.log(`   ❌ Поле details не найдено в ответе`);
    }

    const amount = ozonOperationService.calculatePaymentAmount(cashFlowData);
    this.result.amount = amount;

    console.log(`   🧮 Итоговая сумма: ${amount}`);

    if (amount === 0) {
      console.log(`   ❌ Сумма: ${amount} (не создаем операцию)`);
      this.result.errors.push(`Сумма выплаты ${amount} = 0`);
    } else {
      console.log(`   ✅ Сумма: ${amount} (можно создавать операцию)`);
    }
  }

  private handleApiError(error: any): void {
    if (error.message.includes('401')) {
      console.log('   💡 Возможно, неверные API ключи');
    } else if (error.message.includes('403')) {
      console.log('   💡 Нет доступа к API');
    } else if (error.message.includes('429')) {
      console.log('   💡 Превышен лимит запросов');
    } else if (error.message.includes('timeout')) {
      console.log('   💡 Таймаут подключения');
    } else if (error.message.includes('Client-Id')) {
      console.log('   💡 Проверьте Client-Id и Api-Key');
    }
  }

  private async createOperation(): Promise<void> {
    console.log('\n4. 🚀 Пробуем создать операцию...');

    try {
      // Используем данные, которые уже получили в testOzonApi
      const integration = this.result.integration;
      const cashFlowData = this.result.cashFlowData;
      const calculatedAmount = this.result.amount!;

      if (calculatedAmount === 0) {
        console.log('ℹ️  Операция не создана (сумма 0)');
        return;
      }

      // Получаем период для запроса данных
      const period = ozonOperationService.getQueryPeriod(
        integration.paymentSchedule as 'next_week' | 'week_after'
      );

      // Рассчитываем даты выплаты
      const paymentDates = ozonOperationService.calculatePaymentDates(
        period.to,
        integration.paymentSchedule as 'next_week' | 'week_after'
      );
      console.log(
        `   📆 Дата выплаты: ${paymentDates.paymentDate.toLocaleDateString('ru-RU')}`
      );

      // Получаем валюту из ответа
      const currency =
        cashFlowData.result.details?.[0]?.payments?.[0]?.currency_code ||
        cashFlowData.result.cash_flows[0]?.currency_code ||
        'RUB';

      // Определяем тип операции и сумму
      const operationType = calculatedAmount < 0 ? 'expense' : 'income';
      const operationAmount = Math.abs(calculatedAmount);

      // Создаем операцию
      const operationData = {
        type: operationType,
        operationDate: paymentDates.paymentDate,
        amount: operationAmount,
        currency,
        articleId: integration.articleId,
        accountId: integration.accountId,
        description: this.generateOperationDescription(
          period.from,
          period.to,
          operationAmount,
          operationType,
          integration.paymentSchedule as 'next_week' | 'week_after'
        ),
        isConfirmed: true,
      };

      console.log(`   🔄 Создаем операцию:`, {
        type: operationData.type,
        amount: operationData.amount,
        currency: operationData.currency,
        date: operationData.operationDate.toLocaleDateString('ru-RU'),
        article: integration.article.name,
        account: integration.account.name,
      });

      const createdOperation = await prisma.operation.create({
        data: {
          ...operationData,
          companyId: integration.companyId,
        },
      });

      this.result.operation = createdOperation;
      console.log(`   ✅ Операция успешно создана: ${createdOperation.id}`);
    } catch (error: any) {
      const errorMsg = `Ошибка при создании операции: ${error.message}`;
      this.result.errors.push(errorMsg);
      console.log(`   ❌ ${errorMsg}`);
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

  private async cleanup(): Promise<void> {
    await prisma.$disconnect();
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
    console.log('📊 ИТОГИ ОТЛАДКИ');
    console.log('='.repeat(50));

    if (this.result.success) {
      console.log('🎉 ОТЛАДКА ЗАВЕРШЕНА УСПЕШНО!');
      if (this.result.operation) {
        console.log(
          `✅ Создана операция: ${this.result.operation.amount} ${this.result.operation.currency} (${this.result.operation.type})`
        );
      }
    } else {
      console.log('❌ ОТЛАДКА ЗАВЕРШЕНА С ОШИБКАМИ:');
      this.result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🔚 Отладка завершена');
  }
}

// Запуск отладки
async function main() {
  const integrationId = process.argv[2];

  if (!integrationId) {
    console.error('❌ Укажите ID интеграции:');
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
  console.error('💥 Необработанное исключение:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Непойманное исключение:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('💥 Фатальная ошибка:', error);
  process.exit(1);
});
