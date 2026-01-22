import prisma from '../../../../../config/db';
import { ParsedDocument } from '../../../parsers/clientBankExchange.parser';
import { MatchResult } from '../matching.types';

/**
 * Сопоставляет счет по номеру счета
 */
export async function matchAccount(
  companyId: string,
  operation: ParsedDocument,
  direction: 'income' | 'expense' | 'transfer' | null,
  companyAccountNumber?: string
): Promise<MatchResult | null> {
  // Для transfer используем sourceAccount и targetAccount
  if (direction === 'transfer') {
    // Для переводов счет определяется отдельно
    return null;
  }

  // Для income/expense используем accountId
  const accountNumber =
    direction === 'expense'
      ? operation.payerAccount
      : operation.receiverAccount;

  // Сначала пробуем найти счет по номеру из операции
  if (accountNumber) {
    const account = await prisma.account.findFirst({
      where: {
        companyId,
        number: accountNumber,
        isActive: true,
      },
    });

    if (account) {
      return {
        id: account.id,
        matchedBy: 'account_number',
      };
    }
  }

  // Если счет не найден по номеру из операции, пробуем использовать счет из заголовка файла
  if (companyAccountNumber) {
    const account = await prisma.account.findFirst({
      where: {
        companyId,
        number: companyAccountNumber,
        isActive: true,
      },
    });

    if (account) {
      return {
        id: account.id,
        matchedBy: 'account_number',
      };
    }
  }

  return null;
}
