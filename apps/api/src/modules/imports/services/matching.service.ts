import prisma from '../../../config/db';
import { compareTwoStrings } from 'string-similarity';
import { ParsedDocument } from '../parsers/clientBankExchange.parser';

export interface MatchingResult {
  matchedArticleId?: string;
  matchedCounterpartyId?: string;
  matchedAccountId?: string;
  matchedBy?: string;
  matchedRuleId?: string;
  direction?: 'income' | 'expense' | 'transfer';
}

/**
 * Определяет направление операции на основе ИНН компании
 */
export async function determineDirection(
  payerInn: string | null | undefined,
  receiverInn: string | null | undefined,
  companyInn: string | null | undefined
): Promise<'income' | 'expense' | 'transfer' | null> {
  // Если ИНН компании не указан, возвращаем null (требует ручного выбора)
  if (!companyInn) {
    return null;
  }

  // Нормализуем ИНН (убираем пробелы)
  const normalizedCompanyInn = companyInn.replace(/\s/g, '');
  const normalizedPayerInn = payerInn?.replace(/\s/g, '') || null;
  const normalizedReceiverInn = receiverInn?.replace(/\s/g, '') || null;

  // Если плательщик и получатель - одна и та же компания
  if (
    normalizedPayerInn === normalizedCompanyInn &&
    normalizedReceiverInn === normalizedCompanyInn
  ) {
    return 'transfer';
  }

  // Если плательщик - наша компания
  if (normalizedPayerInn === normalizedCompanyInn) {
    return 'expense';
  }

  // Если получатель - наша компания
  if (normalizedReceiverInn === normalizedCompanyInn) {
    return 'income';
  }

  // Не удалось определить
  return null;
}

/**
 * Сопоставляет контрагента по ИНН, правилам и fuzzy match
 */
export async function matchCounterparty(
  companyId: string,
  operation: ParsedDocument,
  direction: 'income' | 'expense' | 'transfer' | null
): Promise<{
  id?: string;
  matchedBy?: string;
  ruleId?: string;
} | null> {
  // 1. Сопоставление по ИНН (100% совпадение)
  if (operation.payerInn || operation.receiverInn) {
    const innToSearch = direction === 'expense' 
      ? operation.receiverInn 
      : operation.payerInn;

    if (innToSearch) {
      const counterparty = await prisma.counterparty.findFirst({
        where: {
          companyId,
          inn: innToSearch,
        },
      });

      if (counterparty) {
        return {
          id: counterparty.id,
          matchedBy: 'inn',
        };
      }
    }
  }

  // 2. Сопоставление по правилам маппинга
  const nameToSearch = direction === 'expense' 
    ? operation.receiver 
    : operation.payer;

  if (nameToSearch) {
    // Проверяем правила типа alias для контрагентов
    const aliasRule = await prisma.mappingRule.findFirst({
      where: {
        companyId,
        targetType: 'counterparty',
        ruleType: 'alias',
        sourceField: direction === 'expense' ? 'receiver' : 'payer',
      },
    });

    if (aliasRule && nameToSearch.toLowerCase().includes(aliasRule.pattern.toLowerCase())) {
      if (aliasRule.targetId) {
        return {
          id: aliasRule.targetId,
          matchedBy: 'rule',
          ruleId: aliasRule.id,
        };
      }
    }

    // Проверяем правила типа contains и equals
    const rules = await prisma.mappingRule.findMany({
      where: {
        companyId,
        targetType: 'counterparty',
        ruleType: { in: ['contains', 'equals'] },
        sourceField: direction === 'expense' ? 'receiver' : 'payer',
      },
    });

    for (const rule of rules) {
      let matches = false;

      if (rule.ruleType === 'equals') {
        matches = nameToSearch.toLowerCase() === rule.pattern.toLowerCase();
      } else if (rule.ruleType === 'contains') {
        matches = nameToSearch.toLowerCase().includes(rule.pattern.toLowerCase());
      }

      if (matches && rule.targetId) {
        // Обновляем счетчик использования правила
        await prisma.mappingRule.update({
          where: { id: rule.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });

        return {
          id: rule.targetId,
          matchedBy: 'rule',
          ruleId: rule.id,
        };
      }
    }
  }

  // 3. Fuzzy match по названию контрагента
  // TODO: Проверить соответствие требованиям ТЗ (порог ≥ 0.8, библиотека string-similarity)
  // Возможно, стоит рассмотреть использование fuse.js для более гибкого поиска
  // См. ТЗ: раздел "Логика автосопоставления" → "3. По fuzzy match названия контрагента"
  if (nameToSearch) {
    const counterparties = await prisma.counterparty.findMany({
      where: { companyId },
    });

    let bestMatch: { id: string; similarity: number } | null = null;
    const threshold = 0.8;

    for (const counterparty of counterparties) {
      const similarity = compareTwoStrings(
        nameToSearch.toLowerCase(),
        counterparty.name.toLowerCase()
      );

      if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { id: counterparty.id, similarity };
      }
    }

    if (bestMatch) {
      return {
        id: bestMatch.id,
        matchedBy: 'fuzzy',
      };
    }
  }

  return null;
}

/**
 * Сопоставляет статью по правилам и ключевым словам
 */
export async function matchArticle(
  companyId: string,
  operation: ParsedDocument,
  direction: 'income' | 'expense' | 'transfer' | null
): Promise<{
  id?: string;
  matchedBy?: string;
  ruleId?: string;
} | null> {
  // Определяем тип статьи на основе направления
  const articleType = direction === 'income' ? 'income' : direction === 'expense' ? 'expense' : null;

  if (!articleType) {
    return null;
  }

  const purpose = operation.purpose || '';

  // 1. Сопоставление по правилам маппинга
  const rules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'article',
      sourceField: 'description',
      ruleType: { in: ['contains', 'equals', 'regex'] },
    },
  });

  for (const rule of rules) {
    let matches = false;

    if (rule.ruleType === 'equals') {
      matches = purpose.toLowerCase() === rule.pattern.toLowerCase();
    } else if (rule.ruleType === 'contains') {
      matches = purpose.toLowerCase().includes(rule.pattern.toLowerCase());
    } else if (rule.ruleType === 'regex') {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        matches = regex.test(purpose);
      } catch (e) {
        // Невалидное регулярное выражение - пропускаем
        continue;
      }
    }

    if (matches && rule.targetId) {
      // Проверяем, что статья соответствует типу
      const article = await prisma.article.findFirst({
        where: {
          id: rule.targetId,
          companyId,
          type: articleType,
          isActive: true,
        },
      });

      if (article) {
        // Обновляем счетчик использования правила
        await prisma.mappingRule.update({
          where: { id: rule.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });

        return {
          id: article.id,
          matchedBy: 'rule',
          ruleId: rule.id,
        };
      }
    }
  }

  // 2. Сопоставление по ключевым словам (предустановленные правила)
  const keywordRules: Array<{ keywords: string[]; articleName: string }> = [
    { keywords: ['налог', 'фнс', 'пфр', 'фсс'], articleName: 'Налоги' },
    { keywords: ['зарплата', 'отпускные', 'аванс'], articleName: 'Зарплата' },
    { keywords: ['оплата по счету', 'выручка'], articleName: 'Выручка от продаж' },
  ];

  for (const keywordRule of keywordRules) {
    const hasKeyword = keywordRule.keywords.some((keyword) =>
      purpose.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      const article = await prisma.article.findFirst({
        where: {
          companyId,
          name: { contains: keywordRule.articleName, mode: 'insensitive' },
          type: articleType,
          isActive: true,
        },
      });

      if (article) {
        return {
          id: article.id,
          matchedBy: 'keyword',
        };
      }
    }
  }

  return null;
}

/**
 * Сопоставляет счет по номеру счета
 */
export async function matchAccount(
  companyId: string,
  operation: ParsedDocument,
  direction: 'income' | 'expense' | 'transfer' | null
): Promise<{
  id?: string;
  matchedBy?: string;
} | null> {
  // Для transfer используем sourceAccount и targetAccount
  if (direction === 'transfer') {
    // Для переводов счет определяется отдельно
    return null;
  }

  // Для income/expense используем accountId
  const accountNumber = direction === 'expense' 
    ? operation.payerAccount 
    : operation.receiverAccount;

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

  return null;
}

/**
 * Главная функция автосопоставления
 */
export async function autoMatch(
  companyId: string,
  operation: ParsedDocument,
  companyInn: string | null | undefined
): Promise<MatchingResult> {
  // 1. Определяем направление
  const direction = await determineDirection(
    operation.payerInn,
    operation.receiverInn,
    companyInn
  );

  // 2. Сопоставляем контрагента
  const counterpartyMatch = await matchCounterparty(companyId, operation, direction);

  // 3. Сопоставляем статью
  const articleMatch = await matchArticle(companyId, operation, direction);

  // 4. Сопоставляем счет
  const accountMatch = await matchAccount(companyId, operation, direction);

  // Определяем matchedBy только если все обязательные поля сопоставлены
  // Обязательные поля: контрагент, статья, счет
  const isFullyMatched = !!(
    counterpartyMatch?.id &&
    articleMatch?.id &&
    accountMatch?.id
  );

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

  return {
    matchedArticleId: articleMatch?.id,
    matchedCounterpartyId: counterpartyMatch?.id,
    matchedAccountId: accountMatch?.id,
    matchedBy,
    matchedRuleId,
    direction: direction || undefined,
  };
}

