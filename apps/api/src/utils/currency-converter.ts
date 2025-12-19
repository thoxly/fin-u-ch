import currencyService from '../modules/currency/currency.service';
import prisma from '../config/db';
import logger from '../config/logger';

/**
 * Утилита для пересчета сумм в базовую валюту компании
 */

/**
 * Получает базовую валюту компании
 */
async function getCompanyBaseCurrency(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currencyBase: true },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  return company.currencyBase || 'RUB';
}

/**
 * Пересчитывает сумму операции в базовую валюту компании
 * @param amount - сумма операции
 * @param operationCurrency - валюта операции
 * @param companyId - ID компании
 * @param operationDate - дата операции (опционально, для исторических курсов)
 */
export async function convertOperationAmountToBase(
  amount: number,
  operationCurrency: string,
  companyId: string,
  operationDate?: Date
): Promise<number> {
  const baseCurrency = await getCompanyBaseCurrency(companyId);

  // Если валюта операции уже базовая, возвращаем без изменений
  if (operationCurrency === baseCurrency) {
    return amount;
  }

  try {
    // Используем курс на дату операции, если указана
    let convertedAmount: number;

    if (operationDate) {
      try {
        convertedAmount = await currencyService.convertToBase(
          amount,
          operationCurrency,
          baseCurrency,
          operationDate
        );
      } catch (error) {
        // Если не удалось получить курс на дату операции, пробуем вчерашний день
        logger.warn(
          'Failed to get currency rate for operation date, trying yesterday',
          {
            operationDate,
            currency: operationCurrency,
            baseCurrency,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        );

        const yesterday = new Date(operationDate);
        yesterday.setDate(yesterday.getDate() - 1);

        try {
          convertedAmount = await currencyService.convertToBase(
            amount,
            operationCurrency,
            baseCurrency,
            yesterday
          );
        } catch (yesterdayError) {
          // Если и вчерашний курс недоступен, используем текущий
          logger.warn(
            'Failed to get currency rate for yesterday, using current rate',
            {
              operationDate,
              currency: operationCurrency,
              baseCurrency,
              error:
                yesterdayError instanceof Error
                  ? yesterdayError.message
                  : 'Unknown error',
            }
          );
          convertedAmount = await currencyService.convertToBase(
            amount,
            operationCurrency,
            baseCurrency
          );
        }
      }
    } else {
      // Если дата не указана, используем текущий курс
      convertedAmount = await currencyService.convertToBase(
        amount,
        operationCurrency,
        baseCurrency
      );
    }

    return convertedAmount;
  } catch (error) {
    logger.error('Failed to convert operation amount to base currency', {
      companyId,
      amount,
      operationCurrency,
      baseCurrency,
      operationDate,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // В случае ошибки возвращаем исходную сумму (лучше показать данные, чем ничего)
    return amount;
  }
}

/**
 * Пересчитывает начальный баланс счета в базовую валюту
 * @param openingBalance - начальный баланс
 * @param accountCurrency - валюта счета
 * @param companyId - ID компании
 */
export async function convertOpeningBalanceToBase(
  openingBalance: number,
  accountCurrency: string,
  companyId: string
): Promise<number> {
  const baseCurrency = await getCompanyBaseCurrency(companyId);

  if (accountCurrency === baseCurrency) {
    return openingBalance;
  }

  try {
    return await currencyService.convertToBase(
      openingBalance,
      accountCurrency,
      baseCurrency
    );
  } catch (error) {
    logger.error('Failed to convert opening balance to base currency', {
      companyId,
      openingBalance,
      accountCurrency,
      baseCurrency,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return openingBalance;
  }
}

/**
 * Получает валюту счета для операции
 * Для transfer операций: sourceAccount всегда в своей валюте, targetAccount всегда в базовой валюте
 * @param operation - операция
 * @param accounts - массив счетов с валютами
 * @param companyBaseCurrency - базовая валюта компании (для transfer операций)
 */
export function getOperationCurrency(
  operation: {
    type: string;
    accountId?: string | null;
    sourceAccountId?: string | null;
    targetAccountId?: string | null;
    currency: string;
  },
  accounts: Map<string, { currency: string }>,
  companyBaseCurrency?: string
): string {
  // Для transfer операций: sourceAccount в своей валюте, targetAccount всегда в базовой
  if (operation.type === 'transfer') {
    // Для sourceAccount используем его валюту
    if (operation.sourceAccountId) {
      const sourceAccount = accounts.get(operation.sourceAccountId);
      if (sourceAccount) {
        return sourceAccount.currency;
      }
    }
    // Если sourceAccount не найден, используем валюту операции
    return operation.currency;
  }

  // Для income/expense операций используем валюту счета
  if (operation.accountId) {
    const account = accounts.get(operation.accountId);
    if (account) {
      return account.currency;
    }
  }

  // Если счет не найден, используем валюту операции
  return operation.currency;
}

/**
 * Пересчитывает массив операций в базовую валюту
 * @param operations - массив операций
 * @param companyId - ID компании
 * @param accounts - массив счетов (опционально, для определения валюты счета)
 */
export async function convertOperationsToBase(
  operations: Array<{
    amount: number;
    currency: string;
    type: string;
    accountId?: string | null;
    sourceAccountId?: string | null;
    targetAccountId?: string | null;
    operationDate?: Date;
  }>,
  companyId: string,
  accounts?: Array<{ id: string; currency: string }>
): Promise<
  Array<{ amount: number; originalAmount: number; originalCurrency: string }>
> {
  const baseCurrency = await getCompanyBaseCurrency(companyId);

  // Создаем Map счетов для быстрого доступа
  const accountsMap = new Map<string, { currency: string }>();
  if (accounts) {
    accounts.forEach((account) => {
      accountsMap.set(account.id, {
        currency: account.currency,
      });
    });
  }

  const convertedOperations = await Promise.all(
    operations.map(async (op) => {
      // Определяем валюту операции
      const operationCurrency = getOperationCurrency(op, accountsMap);

      // Если валюта уже базовая, возвращаем без изменений
      if (operationCurrency === baseCurrency) {
        return {
          amount: op.amount,
          originalAmount: op.amount,
          originalCurrency: operationCurrency,
        };
      }

      // Пересчитываем в базовую валюту
      const convertedAmount = await convertOperationAmountToBase(
        op.amount,
        operationCurrency,
        companyId,
        op.operationDate
      );

      return {
        amount: convertedAmount,
        originalAmount: op.amount,
        originalCurrency: operationCurrency,
      };
    })
  );

  return convertedOperations;
}
