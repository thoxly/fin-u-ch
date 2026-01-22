import prisma from '../../../../config/db';
import { ParsedDocument } from '../../parsers/clientBankExchange.parser';
import logger from '../../../../config/logger';
import { MatchingResult } from './matching.types';
import { determineDirection } from './direction/direction-matcher.service';
import { matchCounterparty } from './counterparty/counterparty-matcher.service';
import { matchArticle } from './article/article-matcher.service';
import { matchAccount } from './account/account-matcher.service';

/**
 * Главная функция автосопоставления
 */
export async function autoMatch(
  companyId: string,
  operation: ParsedDocument,
  companyInn: string | null | undefined,
  companyAccountNumber?: string
): Promise<MatchingResult> {
  // Получаем список номеров счетов компании для определения направления операции
  const companyAccounts = await prisma.account.findMany({
    where: {
      companyId,
      isActive: true,
      number: { not: null },
    },
    select: { number: true },
  });
  const companyAccountNumbers = companyAccounts
    .map((acc) => acc.number)
    .filter((num): num is string => !!num);

  // 1. Определяем направление
  logger.debug('[АВТОСОПОСТАВЛЕНИЕ] Попытка определить направление', {
    companyId,
    payerInn: operation.payerInn,
    receiverInn: operation.receiverInn,
    companyInn,
    payerAccount: operation.payerAccount,
    receiverAccount: operation.receiverAccount,
    companyAccountNumbers: companyAccountNumbers?.length || 0,
    purpose: operation.purpose,
  });

  const direction = await determineDirection(
    operation.payerInn,
    operation.receiverInn,
    companyInn,
    operation.purpose,
    operation.payerAccount,
    operation.receiverAccount,
    companyAccountNumbers
  );

  logger.debug('[АВТОСОПОСТАВЛЕНИЕ] Результат определения направления', {
    companyId,
    direction,
    payerInn: operation.payerInn,
    receiverInn: operation.receiverInn,
    companyInn,
  });

  // 2. Сопоставляем контрагента
  const counterpartyMatch = await matchCounterparty(
    companyId,
    operation,
    direction
  );

  // 3. Сопоставляем статью
  const articleMatch = await matchArticle(companyId, operation, direction);

  // 4. Сопоставляем счет
  const accountMatch = await matchAccount(
    companyId,
    operation,
    direction,
    companyAccountNumber
  );

  // Определяем matchedBy только если все обязательные поля сопоставлены
  // Обязательные поля: статья, счет (контрагент не обязателен, как в обычной форме)
  const isFullyMatched = !!(articleMatch?.id && accountMatch?.id);

  let matchedBy: string | undefined;
  let matchedRuleId: string | undefined;

  // Устанавливаем matchedBy только если операция полностью сопоставлена
  if (isFullyMatched) {
    // Приоритет: rule > keyword > inn > fuzzy > account_number
    if (counterpartyMatch?.ruleId || articleMatch?.ruleId) {
      matchedBy = 'rule';
      matchedRuleId = counterpartyMatch?.ruleId || articleMatch?.ruleId;
    } else if (articleMatch?.matchedBy === 'keyword') {
      matchedBy = 'keyword';
    } else if (counterpartyMatch?.matchedBy === 'inn') {
      matchedBy = 'inn';
    } else if (counterpartyMatch?.matchedBy === 'fuzzy') {
      matchedBy = 'fuzzy';
    } else if (accountMatch?.matchedBy === 'account_number') {
      matchedBy = 'account_number';
    }
  }

  const result = {
    matchedArticleId: articleMatch?.id,
    matchedCounterpartyId: counterpartyMatch?.id,
    matchedAccountId: accountMatch?.id,
    matchedBy,
    matchedRuleId,
    direction: direction || undefined,
  };

  // Логируем применение правил
  if (matchedRuleId) {
    logger.info('[АВТОСОПОСТАВЛЕНИЕ] Правило применено к операции', {
      matchedRuleId,
      matchedBy,
      direction: result.direction,
      matchedArticleId: result.matchedArticleId,
      matchedCounterpartyId: result.matchedCounterpartyId,
      matchedAccountId: result.matchedAccountId,
      operation: {
        purpose: operation.purpose,
        payer: operation.payer,
        receiver: operation.receiver,
        amount: operation.amount,
        date: operation.date,
      },
    });
  } else if (matchedBy) {
    logger.debug('[АВТОСОПОСТАВЛЕНИЕ] Сопоставление без правил', {
      matchedBy,
      direction: result.direction,
      matchedArticleId: result.matchedArticleId,
      matchedCounterpartyId: result.matchedCounterpartyId,
      matchedAccountId: result.matchedAccountId,
      operation: {
        purpose: operation.purpose,
        payer: operation.payer,
        receiver: operation.receiver,
        amount: operation.amount,
        date: operation.date,
      },
    });
  }

  return result;
}
