import prisma from '../../../config/db';
import { compareTwoStrings } from 'string-similarity';
import { ParsedDocument } from '../parsers/clientBankExchange.parser';
import logger from '../../../config/logger';
import { determineOperationDirection } from '@fin-u-ch/shared';

export interface MatchingResult {
  matchedArticleId?: string;
  matchedCounterpartyId?: string;
  matchedAccountId?: string;
  matchedBy?: string;
  matchedRuleId?: string;
  direction?: 'income' | 'expense' | 'transfer';
}

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
    logger.debug('determineDirection: Direction detected', {
      direction: result.direction,
      confidence: result.confidence,
      reasons: result.reasons,
      payerInn,
      receiverInn,
      payerAccount,
      receiverAccount,
    });
    return result.direction;
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
      const article = await prisma.article.findFirst({
        where: {
          id: rule.targetId,
          companyId,
          type: articleType,
          isActive: true,
        },
      });

      if (article) {
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
        const article = await prisma.article.findFirst({
          where: {
            id: rule.targetId,
            companyId,
            type: articleType,
            isActive: true,
          },
        });

        if (article) {
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
      const article = await prisma.article.findFirst({
        where: {
          id: rule.targetId,
          companyId,
          type: articleType,
          isActive: true,
        },
      });

      if (article) {
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
    // ВАЖНО: Исключаем упоминания НДС в составе оплаты услуг/товаров
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
      articleNames: ['Налоги', 'Обязательные платежи', 'Отчисления в фонды'],
    },
    {
      keywords: [
        'зарплата',
        'отпускные',
        'аванс',
        'премия',
        'заработная плата',
      ],
      articleNames: ['Зарплата', 'Выплаты персоналу', 'ФОТ'],
    },
    {
      keywords: [
        'оплата по счету',
        'выручка',
        'поступление от клиента',
        'оплата покупателя',
        'доход',
        'продажа',
      ],
      articleNames: [
        'Выручка от продаж',
        'Доход от реализации',
        'Поступления от клиентов',
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
      keywords: ['аренда', 'офис', 'помещение'],
      articleNames: ['Аренда офиса', 'Аренда помещений', 'Оренда недвижимости'],
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
    const hasKeyword = keywordRule.keywords.some((keyword) =>
      purpose.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      // Специальная проверка для правила налогов: исключаем упоминания НДС в составе оплаты
      // Например: "оплата за услуги, В том числе НДС 20%" - это не налоговый платеж
      if (
        keywordRule.keywords.includes('ндс') &&
        keywordRule.articleNames.includes('Налоги')
      ) {
        // Паттерны, которые указывают на НДС в составе оплаты, а не на налоговый платеж
        const vatInPaymentPatterns = [
          /в\s+том\s+числе\s+ндс/i, // "В том числе НДС"
          /в\s*т\.?\s*ч\.?\s*[^\w]*ндс/i, // "В т.ч. НДС", "В т.ч НДС", "В тч НДС", "В т.ч.НДС", "Вт.ч.НДС"
          /т\.?\s*ч\.?\s*[^\w]*ндс/i, // "т.ч. НДС", "т.ч НДС", "тч НДС", "т.ч.НДС"
          /включая\s+ндс/i, // "включая НДС"
          /ндс\s*\(?\s*\d+\s*%?\s*\)?/i, // "НДС 20%", "НДС(20%)", "НДС (20%)"
          /ндс\s*-\s*\d+/i, // "НДС - 2400.00"
          /ндс\s+\d+\.\d+/i, // "НДС 2400.00"
          /ндс\s+\d+-\d+/i, // "НДС 593103-20"
          /в\s+сумме\s+ндс/i, // "в сумме НДС"
          /с\s+ндс/i, // "с НДС"
          /оплат[аы]\s+.*\s+ндс/i, // "оплата ... НДС"
          /за\s+.*\s+ндс/i, // "за ... НДС"
          /по\s+счету.*ндс/i, // "по счету ... НДС"
          /реестр.*ндс/i, // "реестр ... НДС"
          /договор.*ндс/i, // "договор ... НДС"
          /ндс\s+не\s+облагается/i, // "НДС не облагается"
        ];

        // Если найдено упоминание НДС в контексте оплаты, пропускаем это правило
        if (vatInPaymentPatterns.some((pattern) => pattern.test(purpose))) {
          continue;
        }

        // Нормализуем purpose для проверок
        const purposeLower = purpose?.toLowerCase() || '';

        // Специальная проверка: если в тексте есть "т.ч." (в любом виде) и "НДС",
        // то это почти наверняка НДС в составе оплаты, а не налоговый платеж
        const hasTchPattern = /т\.?\s*ч\.?/i.test(purpose);
        if (hasTchPattern && purposeLower.includes('ндс')) {
          continue;
        }

        // Дополнительная проверка: если в описании есть слова, указывающие на оплату услуг/товаров,
        // и при этом упоминается НДС, то это не налоговый платеж
        const paymentContextKeywords = [
          'оплата за',
          'оплата по счету',
          'за товар',
          'за услуги',
          'за работы',
          'за поставку',
          'за доставку',
          'реестр на оплату',
          'реестр',
          'по договору',
          'договор',
          'счет',
          'сумма',
        ];

        const hasPaymentContext = paymentContextKeywords.some((keyword) =>
          purposeLower.includes(keyword)
        );

        // Если есть контекст оплаты и упоминание НДС, но нет явных признаков налогового платежа
        if (hasPaymentContext && purposeLower.includes('ндс')) {
          const taxPaymentKeywords = [
            'уплата ндс',
            'перечисление ндс',
            'налог ндс',
            'ндс к уплате',
            'ндс в бюджет',
            'возмещение ндс',
          ];

          const isTaxPayment = taxPaymentKeywords.some((keyword) =>
            purposeLower.includes(keyword)
          );

          // Если нет явных признаков налогового платежа, пропускаем правило
          if (!isTaxPayment) {
            continue;
          }
        }
      }

      // Ищем статью по любому из возможных названий (используем предзагруженные статьи)
      for (const articleName of keywordRule.articleNames) {
        const article = await prisma.article.findFirst({
          where: {
            companyId,
            name: { contains: articleName, mode: 'insensitive' },
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
  const direction = await determineDirection(
    operation.payerInn,
    operation.receiverInn,
    companyInn,
    operation.purpose,
    operation.payerAccount,
    operation.receiverAccount,
    companyAccountNumbers
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
