import prisma from '../../../config/db';
import { Prisma } from '@prisma/client';
import { compareTwoStrings } from 'string-similarity';
import { ParsedDocument } from '../parsers/clientBankExchange.parser';
import logger from '../../../config/logger';

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
    logger.debug('determineDirection: Company INN not set', {
      payerInn,
      receiverInn,
    });
    return null;
  }

  // Нормализуем ИНН (убираем пробелы)
  const normalizedCompanyInn = companyInn.replace(/\s/g, '').trim();
  const normalizedPayerInn = payerInn?.replace(/\s/g, '').trim() || null;
  const normalizedReceiverInn = receiverInn?.replace(/\s/g, '').trim() || null;

  // Если плательщик и получатель - одна и та же компания
  if (
    normalizedPayerInn &&
    normalizedReceiverInn &&
    normalizedPayerInn === normalizedCompanyInn &&
    normalizedReceiverInn === normalizedCompanyInn
  ) {
    logger.debug(
      'determineDirection: Transfer detected (same company as payer and receiver)'
    );
    return 'transfer';
  }

  // Если плательщик - наша компания (и получатель - не наша компания)
  if (
    normalizedPayerInn &&
    normalizedPayerInn === normalizedCompanyInn &&
    normalizedReceiverInn !== normalizedCompanyInn
  ) {
    logger.debug('determineDirection: Expense detected (company is payer)', {
      payerInn: normalizedPayerInn,
      companyInn: normalizedCompanyInn,
      receiverInn: normalizedReceiverInn,
    });
    return 'expense';
  }

  // Если получатель - наша компания (и плательщик - не наша компания)
  if (
    normalizedReceiverInn &&
    normalizedReceiverInn === normalizedCompanyInn &&
    normalizedPayerInn !== normalizedCompanyInn
  ) {
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
    const innToSearch =
      direction === 'expense' ? operation.receiverInn : operation.payerInn;

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
  const nameToSearch =
    direction === 'expense' ? operation.receiver : operation.payer;

  if (nameToSearch) {
    const sourceField = direction === 'expense' ? 'receiver' : 'payer';

    // Приоритет 1: equals (самый точный)
    const equalsRules = await prisma.mappingRule.findMany({
      where: {
        companyId,
        targetType: 'counterparty',
        ruleType: 'equals',
        sourceField,
      },
    });

    for (const rule of equalsRules) {
      if (
        nameToSearch.toLowerCase() === rule.pattern.toLowerCase() &&
        rule.targetId
      ) {
        await prisma.mappingRule.update({
          where: { id: rule.id, companyId },
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

    // Приоритет 2: alias (специальный тип для контрагентов)
    const aliasRules = await prisma.mappingRule.findMany({
      where: {
        companyId,
        targetType: 'counterparty',
        ruleType: 'alias',
        sourceField,
      },
    });

    for (const rule of aliasRules) {
      if (
        nameToSearch.toLowerCase().includes(rule.pattern.toLowerCase()) &&
        rule.targetId
      ) {
        await prisma.mappingRule.update({
          where: { id: rule.id, companyId },
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

    // Приоритет 3: contains (самый широкий)
    const containsRules = await prisma.mappingRule.findMany({
      where: {
        companyId,
        targetType: 'counterparty',
        ruleType: 'contains',
        sourceField,
      },
    });

    for (const rule of containsRules) {
      if (
        nameToSearch.toLowerCase().includes(rule.pattern.toLowerCase()) &&
        rule.targetId
      ) {
        await prisma.mappingRule.update({
          where: { id: rule.id, companyId },
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
    // Оптимизация: ограничиваем количество загружаемых контрагентов для fuzzy match
    // Для больших компаний рекомендуется использовать полнотекстовый поиск в БД
    const MAX_FUZZY_MATCH_COUNTERPARTIES = 1000;
    const counterparties = await prisma.counterparty.findMany({
      where: { companyId },
      take: MAX_FUZZY_MATCH_COUNTERPARTIES,
      select: {
        id: true,
        name: true,
      },
    });

    // Если контрагентов слишком много, пропускаем fuzzy match для производительности
    if (counterparties.length >= MAX_FUZZY_MATCH_COUNTERPARTIES) {
      logger.warn('Too many counterparties for fuzzy match, skipping', {
        companyId,
        count: counterparties.length,
      });
      return null;
    }

    let bestMatch: { id: string; similarity: number } | null = null;
    const threshold = 0.8;

    for (const counterparty of counterparties) {
      const similarity = compareTwoStrings(
        nameToSearch.toLowerCase(),
        counterparty.name.toLowerCase()
      );

      if (
        similarity >= threshold &&
        (!bestMatch || similarity > bestMatch.similarity)
      ) {
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
  const articleType =
    direction === 'income'
      ? 'income'
      : direction === 'expense'
        ? 'expense'
        : null;

  if (!articleType) {
    return null;
  }

  const purpose = operation.purpose || '';

  // 1. Сопоставление по правилам маппинга (с правильным приоритетом)

  // Приоритет 1: equals (самый точный)
  const equalsRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'article',
      sourceField: 'description',
      ruleType: 'equals',
    },
  });

  for (const rule of equalsRules) {
    if (purpose.toLowerCase() === rule.pattern.toLowerCase() && rule.targetId) {
      const article:
        | (Prisma.ArticleGetPayload<Record<string, never>> & { type: string })
        | null = await prisma.article.findFirst({
        where: {
          id: rule.targetId,
          companyId,
          type: articleType,
          isActive: true,
        },
      });

      if (article) {
        // Проверяем тип статьи перед возвратом
        if (article.type === articleType) {
          await prisma.mappingRule.update({
            where: { id: rule.id, companyId },
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
  }

  // Приоритет 2: regex (гибкий, но точный)
  const regexRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'article',
      sourceField: 'description',
      ruleType: 'regex',
    },
  });

  for (const rule of regexRules) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(purpose) && rule.targetId) {
        const article:
          | (Prisma.ArticleGetPayload<Record<string, never>> & { type: string })
          | null = await prisma.article.findFirst({
          where: {
            id: rule.targetId,
            companyId,
            type: articleType,
            isActive: true,
          },
        });

        if (article) {
          // Проверяем тип статьи перед возвратом
          if (article.type === articleType) {
            await prisma.mappingRule.update({
              where: { id: rule.id, companyId },
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
    } catch (e) {
      // Невалидное регулярное выражение - пропускаем
      continue;
    }
  }

  // Приоритет 3: contains (самый широкий)
  const containsRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'article',
      sourceField: 'description',
      ruleType: 'contains',
    },
  });

  for (const rule of containsRules) {
    if (
      purpose.toLowerCase().includes(rule.pattern.toLowerCase()) &&
      rule.targetId
    ) {
      const article:
        | (Prisma.ArticleGetPayload<Record<string, never>> & { type: string })
        | null = await prisma.article.findFirst({
        where: {
          id: rule.targetId,
          companyId,
          type: articleType,
          isActive: true,
        },
      });

      if (article) {
        // Проверяем тип статьи перед возвратом
        if (article.type === articleType) {
          await prisma.mappingRule.update({
            where: { id: rule.id, companyId },
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
  }

  // 2. Сопоставление по ключевым словам (предустановленные правила)
  // ВАЖНО: Порядок имеет значение! Более специфичные правила должны идти раньше общих

  // Оптимизация: загружаем все статьи компании один раз, чтобы избежать N+1 запросов
  const allArticles = await prisma.article.findMany({
    where: {
      companyId,
      type: articleType,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Создаем индекс для быстрого поиска статей по названию (case-insensitive)
  const articlesByName = new Map<string, string>();
  for (const article of allArticles) {
    const normalizedName = article.name.toLowerCase().trim();
    if (!articlesByName.has(normalizedName)) {
      articlesByName.set(normalizedName, article.id);
    }
    // Также добавляем частичные совпадения для contains поиска
    const words = normalizedName.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && !articlesByName.has(word)) {
        articlesByName.set(word, article.id);
      }
    }
  }

  const keywordRules: Array<{ keywords: string[]; articleNames: string[] }> = [
    // Специфичные правила для зарплаты (проверяем раньше налогов, чтобы "Без налога" не перехватывало)
    {
      keywords: [
        'зарплата',
        'отпускные',
        'аванс',
        'премия',
        'заработная плата',
        'зарплата (аванс)',
        'зарплата за',
      ],
      articleNames: ['Зарплата', 'Выплаты персоналу', 'ФОТ'],
    },
    // Аренда (проверяем раньше выручки, чтобы "оплата счета за аренду" не попадала в выручку)
    {
      keywords: [
        'аренда',
        'за аренду',
        'аренда нежилых помещений',
        'нежилых помещений',
        'аренда помещений',
        'помещений',
        'аренда офиса',
        'аренда недвижимости',
        'оренда',
      ],
      articleNames: [
        'Аренда офиса',
        'Аренда помещений',
        'Оренда недвижимости',
        'Аренда',
      ],
    },
    // Выручка (проверяем раньше общих правил, но после более специфичных)
    {
      keywords: [
        'оплата по счету',
        'оплата счета',
        'счет №',
        'выручка',
        'поступление от клиента',
        'оплата покупателя',
        'доход',
        'продажа',
        'разработка по',
        'разработка программного обеспечения',
        'за разработку',
        'за разработку по',
        'услуги по разработке',
        'оказание услуг',
        'оказание услуг по',
      ],
      articleNames: [
        'Выручка от продаж',
        'Доход от реализации',
        'Поступления от клиентов',
        'Выручка',
      ],
    },
    // Налоги (общее правило, проверяем после специфичных)
    {
      keywords: [
        'налог',
        'фнс',
        'пфр',
        'фсс',
        'ндс',
        'налоги',
        'пенсионный фонд',
      ],
      articleNames: [
        'Налоги',
        'Обязательные платежи',
        'Отчисления в фонды',
        'Прочие налоги',
      ],
    },
    {
      keywords: ['предоплата', 'аванс от клиента'],
      articleNames: ['Авансы от покупателей', 'Предоплата от клиентов'],
    },
    {
      keywords: [
        'поставщик',
        'счет на оплату',
        'закуп',
        'оплата поставщику',
        'покупка',
        'товар',
        'сырье',
      ],
      articleNames: [
        'Закупка товаров и материалов',
        'Оплата поставщикам',
        'Закуп сырья и комплектующих',
      ],
    },
    {
      keywords: ['услуги', 'работы', 'аутсорсинг', 'подрядчик'],
      articleNames: [
        'Оплата услуг и подрядчиков',
        'Услуги сторонних организаций',
        'Прочие услуги',
      ],
    },
    {
      keywords: ['транспорт', 'доставка', 'логистика', 'топливо'],
      articleNames: [
        'Транспортные расходы',
        'Доставка и логистика',
        'Топливо и ГСМ',
      ],
    },
    {
      keywords: ['интернет', 'телефон', 'связь', 'сотовая связь'],
      articleNames: ['Связь и интернет', 'Мобильная связь', 'Телефония'],
    },
    {
      keywords: ['канцелярия', 'бумага', 'принтер', 'картридж'],
      articleNames: [
        'Хозяйственные расходы',
        'Канцелярские товары',
        'Расходные материалы',
      ],
    },
    {
      keywords: ['банк', 'комиссия', 'эквайринг', 'обслуживание счета'],
      articleNames: [
        'Банковские комиссии',
        'Комиссии банка',
        'Расходы на обслуживание счета',
      ],
    },
    {
      keywords: ['проценты', 'кредит', 'займ', 'депозит'],
      articleNames: [
        'Финансовые расходы',
        'Проценты по кредитам',
        'Расходы по займам',
      ],
    },
    {
      keywords: ['страховка', 'страхование'],
      articleNames: [
        'Страхование',
        'Добровольное страхование',
        'ОСАГО / КАСКО',
      ],
    },
    {
      keywords: ['командировка', 'проезд', 'гостиница'],
      articleNames: [
        'Командировочные расходы',
        'Проезд и проживание',
        'Транспорт и гостиницы',
      ],
    },
    {
      keywords: ['обучение', 'курсы', 'тренинг', 'повышение квалификации'],
      articleNames: [
        'Обучение и развитие персонала',
        'Повышение квалификации',
        'Расходы на обучение',
      ],
    },
    {
      keywords: ['реклама', 'маркетинг', 'продвижение', 'google ads', 'яндекс'],
      articleNames: ['Реклама и маркетинг', 'Продвижение', 'Интернет-реклама'],
    },
    {
      keywords: ['наличные', 'снятие', 'внесение'],
      articleNames: [
        'Операции с наличными',
        'Инкассация',
        'Снятие / внесение средств',
      ],
    },
    {
      keywords: ['дивиденды', 'выплата собственнику'],
      articleNames: [
        'Выплата дивидендов',
        'Распределение прибыли',
        'Выплаты учредителям',
      ],
    },
  ];

  for (const keywordRule of keywordRules) {
    // Сортируем ключевые слова по длине (от длинных к коротким) для более точного сопоставления
    const sortedKeywords = [...keywordRule.keywords].sort(
      (a, b) => b.length - a.length
    );

    const purposeLower = purpose.toLowerCase();
    const hasKeyword = sortedKeywords.some((keyword) =>
      purposeLower.includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      // Ищем статью по любому из возможных названий (используем предзагруженные статьи)
      for (const articleName of keywordRule.articleNames) {
        const normalizedSearchName = articleName.toLowerCase().trim();

        // Прямое совпадение
        const directMatch = articlesByName.get(normalizedSearchName);
        if (directMatch) {
          return {
            id: directMatch,
            matchedBy: 'keyword',
          };
        }

        // Поиск по частичному совпадению (contains)
        for (const [normalizedName, articleId] of articlesByName.entries()) {
          if (
            normalizedName.includes(normalizedSearchName) ||
            normalizedSearchName.includes(normalizedName)
          ) {
            return {
              id: articleId,
              matchedBy: 'keyword',
            };
          }
        }

        // Fallback: поиск в полных названиях статей
        for (const article of allArticles) {
          const articleNameLower = article.name.toLowerCase();
          if (
            articleNameLower.includes(normalizedSearchName) ||
            normalizedSearchName.includes(articleNameLower)
          ) {
            return {
              id: article.id,
              matchedBy: 'keyword',
            };
          }
        }
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
  direction: 'income' | 'expense' | 'transfer' | null,
  companyAccountNumber?: string
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

/**
 * Главная функция автосопоставления
 */
export async function autoMatch(
  companyId: string,
  operation: ParsedDocument,
  companyInn: string | null | undefined,
  companyAccountNumber?: string
): Promise<MatchingResult> {
  // 1. Определяем направление
  const direction = await determineDirection(
    operation.payerInn,
    operation.receiverInn,
    companyInn
  );

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

  return {
    matchedArticleId: articleMatch?.id,
    matchedCounterpartyId: counterpartyMatch?.id,
    matchedAccountId: accountMatch?.id,
    matchedBy,
    matchedRuleId,
    direction: direction || undefined,
  };
}
