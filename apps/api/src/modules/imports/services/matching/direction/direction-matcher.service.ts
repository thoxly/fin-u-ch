import { ParsedDocument } from '../../../parsers/clientBankExchange.parser';
import logger from '../../../../../config/logger';
import { determineOperationDirection } from '@fin-u-ch/shared';

/**
 * Определяет направление операции на основе ИНН компании, номеров счетов и текста назначения платежа
 * Использует улучшенный алгоритм из shared пакета
 */
export async function determineDirection(
  payerInn: string | null | undefined,
  receiverInn: string | null | undefined,
  companyInn: string | null | undefined,
  purpose?: string | null | undefined,
  payerAccount?: string | null | undefined,
  receiverAccount?: string | null | undefined,
  companyAccountNumbers?: string[] | null
): Promise<'income' | 'expense' | 'transfer' | null> {
  // Создаем объект операции для анализа
  const operation: ParsedDocument = {
    date: new Date(),
    amount: 0,
    payerInn: payerInn || undefined,
    receiverInn: receiverInn || undefined,
    payerAccount: payerAccount || undefined,
    receiverAccount: receiverAccount || undefined,
    purpose: purpose || undefined,
  };

  // Используем улучшенный алгоритм определения направления
  const result = determineOperationDirection(
    operation,
    companyInn,
    companyAccountNumbers
  );

  if (result.direction) {
    logger.debug('[ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ] Направление определено', {
      direction: result.direction,
      confidence: result.confidence,
      reasons: result.reasons,
      payerInn,
      receiverInn,
      payerAccount,
      receiverAccount,
      companyInn,
    });
    return result.direction;
  }

  // Не удалось определить
  logger.warn('[ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ] Не удалось определить направление', {
    payerInn,
    receiverInn,
    payerAccount,
    receiverAccount,
    companyInn,
    companyAccountNumbers: companyAccountNumbers?.length || 0,
    purpose,
    reasons: result.reasons,
  });
  return null;
}
