import type { ImportedOperation } from '@shared/types/imports';
import {
  findSimilarOperations as findSimilarOperationsShared,
  extractTags,
  normalizeText,
} from '@fin-u-ch/shared';

export interface OperationComparison {
  primaryTag: string;
  matchReasons: string[];
}

/**
 * Переводит тег операции на русский язык
 */
const translateTag = (tag: string): string => {
  const tagTranslations: Record<string, string> = {
    salary: 'Зарплата',
    payroll_taxes: 'Налоги с ФОТ',
    hr_expenses: 'HR расходы',
    employee_training: 'Обучение сотрудников',
    employee_medical_checks: 'Медосмотры',
    employee_uniform: 'Спецодежда',
    travel_accommodation: 'Проживание в командировках',
    travel_transport: 'Транспорт в командировках',
    travel_daily_allowance: 'Суточные',
    taxes_general: 'Налоги',
    fines_penalties: 'Штрафы и пени',
    government_fees: 'Госпошлины',
    rent_office: 'Аренда офиса',
    rent_warehouse: 'Аренда склада',
    rent_equipment: 'Аренда оборудования',
    utilities_power: 'Электроэнергия',
    utilities_water: 'Водоснабжение',
    utilities_heating: 'Отопление',
    utilities_gas: 'Газоснабжение',
    telecom_internet: 'Интернет',
    telecom_mobile: 'Мобильная связь',
    raw_materials: 'Сырье',
    components: 'Комплектующие',
    spare_parts: 'Запчасти',
    goods_purchase: 'Товары',
    packaging: 'Упаковка',
    office_supplies: 'Канцелярия',
    furniture: 'Мебель',
    cleaning_supplies: 'Хозтовары',
    equipment_purchase: 'Оборудование',
    maintenance_service: 'Техобслуживание',
    repair: 'Ремонт',
    construction_materials: 'Стройматериалы',
    construction_services: 'Строительные работы',
    special_equipment_services: 'Спецтехника',
    movers_transport: 'Грузчики',
    logistics_delivery: 'Доставка',
    courier_services: 'Курьерские услуги',
    freight_transport: 'Грузоперевозки',
    fuel: 'ГСМ',
    tolls_parking: 'Парковка и платные дороги',
    it_software: 'ПО',
    it_hardware: 'IT оборудование',
    it_hosting: 'Хостинг',
    it_domains: 'Домены',
    it_support: 'IT поддержка',
    it_dev_services: 'Разработка',
    acquiring_fee: 'Комиссия эквайринга',
    acquiring_income: 'Эквайринг (доход)',
    banking_fees: 'Банковские комиссии',
    loan_payments: 'Кредиты',
    insurance: 'Страхование',
    legal_services: 'Юридические услуги',
    accounting_services: 'Бухгалтерские услуги',
    audit_services: 'Аудит',
    marketing_ads: 'Реклама',
    marketing_ppc: 'Контекстная реклама',
    marketing_smm: 'SMM',
    marketplace_fee: 'Комиссия маркетплейса',
    marketplace_payment: 'Выплаты с маркетплейса',
    consulting: 'Консалтинг',
    design_services: 'Дизайн',
    photo_video_services: 'Фото/видео услуги',
    medical_services: 'Медицинские услуги',
    lab_services: 'Лабораторные услуги',
    beauty_supplies: 'Косметология',
    horeca_food: 'Продукты (HoReCa)',
    horeca_inventory: 'Инвентарь (HoReCa)',
    horeca_delivery: 'Доставка (HoReCa)',
    waste_disposal: 'Вывоз мусора',
    security_services: 'Охранные услуги',
    cleaning_services: 'Уборка',
    printing_services: 'Печать',
    research_services: 'Исследования',
    charity: 'Благотворительность',
    government_services: 'Госуслуги',
    customs: 'Таможня',
    warehouse_services: 'Складские услуги',
    mortgage_lease: 'Лизинг',
    advertising_production: 'Производство рекламы',
    subscription_services: 'Подписки',
    office_cleaning: 'Уборка офиса',
    hr_benefits: 'Соцпакет',
    internal_transfer: 'Внутренний перевод',
    cash_withdrawal: 'Снятие наличных',
    cash_deposit: 'Внесение наличных',
    currency_exchange: 'Обмен валют',
    depreciation: 'Амортизация',
    inventory_services: 'Инвентаризация',
    printing_materials: 'Расходники для печати',
    event_services: 'Мероприятия',
    catering: 'Кейтеринг',
    hr_outstaff: 'Аутстаффинг',
    pr_services: 'PR услуги',
    merchandising: 'Мерчендайзинг',
    education_services: 'Образовательные услуги',
    other: 'Другое',
  };
  return tagTranslations[tag] || tag;
};

/**
 * Результат поиска похожих операций с дополнительной информацией
 */
export interface SimilarOperationResult {
  operation: ImportedOperation;
  comparison: OperationComparison;
}

/**
 * Функция для определения похожих операций
 * Использует новый алгоритм на основе тегов
 */
export const findSimilarOperations = (
  targetOperation: ImportedOperation,
  allOperations: ImportedOperation[],
  _companyInn?: string | null, // ИНН компании больше не используется для поиска похожих
  _minScore: number = 40, // minScore больше не используется
  fieldToUpdate?: string // Поле, которое будет обновляться
): SimilarOperationResult[] => {
  // Преобразуем ImportedOperation в формат, понятный shared функции
  const targetDoc = {
    id: targetOperation.id,
    date: new Date(targetOperation.date),
    amount: targetOperation.amount,
    payer: targetOperation.payer || undefined,
    payerInn: targetOperation.payerInn || undefined,
    receiver: targetOperation.receiver || undefined,
    receiverInn: targetOperation.receiverInn || undefined,
    purpose: targetOperation.description || undefined,
    direction: targetOperation.direction || undefined,
  };

  // Получаем теги для целевой операции
  const targetTags = extractTags(targetDoc);
  const primaryTag = targetTags[0];

  console.log('[findSimilarOperations] Начало поиска', {
    operationId: targetOperation.id,
    description: targetOperation.description?.substring(0, 50),
    tag: primaryTag,
    totalOperations: allOperations.length,
    fieldToUpdate,
  });

  // Фильтруем операции (исключаем обработанные, саму операцию и с заблокированными полями)
  const candidateOperations = allOperations.filter((op) => {
    if (op.id === targetOperation.id || op.processed) {
      return false;
    }

    // Если указано поле для обновления, проверяем, не заблокировано ли оно
    if (fieldToUpdate) {
      let lockedFields: string[] = [];
      try {
        lockedFields = op.lockedFields ? JSON.parse(op.lockedFields) : [];
      } catch {
        lockedFields = [];
      }

      // Маппинг полей UI на поля БД
      const fieldMapping: Record<string, string> = {
        article: 'matchedArticleId',
        counterparty: 'matchedCounterpartyId',
        account: 'matchedAccountId',
        deal: 'matchedDealId',
        department: 'matchedDepartmentId',
        currency: 'currency',
        direction: 'direction',
      };

      const dbField = fieldMapping[fieldToUpdate];
      if (dbField && lockedFields.includes(dbField)) {
        return false; // Пропускаем операции с заблокированным полем
      }
    }

    return true;
  });

  // Преобразуем кандидатов и вычисляем теги заранее
  const candidateDocsMeta = candidateOperations.map((op) => {
    const doc = {
      id: op.id,
      date: new Date(op.date),
      amount: op.amount,
      payer: op.payer || undefined,
      payerInn: op.payerInn || undefined,
      receiver: op.receiver || undefined,
      receiverInn: op.receiverInn || undefined,
      purpose: op.description || undefined,
      direction: op.direction || undefined,
    };
    return {
      op,
      doc,
      tags: extractTags(doc),
    };
  });
  const candidateDocs = candidateDocsMeta.map((meta) => meta.doc);

  // Ищем похожие через shared функцию
  // Она возвращает массив похожих операций (ParsedDocument[])
  const similarDocs = findSimilarOperationsShared(targetDoc, candidateDocs);

  console.log('[findSimilarOperations] Результат поиска через shared функцию', {
    operationId: targetOperation.id,
    tag: primaryTag,
    candidateCount: candidateDocs.length,
    similarDocsFound: similarDocs.length,
  });

  // Собираем результаты
  const results: SimilarOperationResult[] = [];

  // Создаем мапу id -> ImportedOperation для быстрого доступа
  const operationsMap = new Map(candidateOperations.map((op) => [op.id, op]));
  const candidateTagsMap = new Map(
    candidateDocsMeta.map((meta) => [meta.doc.id, meta.tags])
  );
  const targetTokenSet = buildTokenSet(targetOperation.description || '');

  for (const doc of similarDocs) {
    // @ts-expect-error: doc имеет id, так как мы его передавали
    const op = operationsMap.get(doc.id);
    if (op) {
      const candidateTags = candidateTagsMap.get(doc.id) || ['other'];
      const candidatePrimaryTag = candidateTags[0] || 'other';
      const matchReasons: string[] = [];

      if (primaryTag !== 'other' && candidatePrimaryTag === primaryTag) {
        matchReasons.push(`Тег: ${translateTag(primaryTag)}`);
      } else {
        const candidateTokenSet = buildTokenSet(op.description || '');
        const similarity = calculateJaccardIndex(
          targetTokenSet,
          candidateTokenSet
        );
        if (similarity > 0) {
          matchReasons.push(
            `Текстовое сходство ${(similarity * 100).toFixed(0)}%`
          );
        }
      }

      if (
        candidatePrimaryTag !== 'other' &&
        candidatePrimaryTag !== primaryTag
      ) {
        matchReasons.push(
          `Тег кандидата: ${translateTag(candidatePrimaryTag)}`
        );
      }

      if (matchReasons.length === 0) {
        matchReasons.push('Похожая операция');
      }

      results.push({
        operation: op,
        comparison: {
          primaryTag,
          matchReasons,
        },
      });
    }
  }

  // Минимальный лог результата
  if (results.length > 0) {
    console.log('[findSimilarOperations] ✅ Найдено похожих операций', {
      operationId: targetOperation.id,
      description: targetOperation.description?.substring(0, 50),
      fieldToUpdate,
      tag: primaryTag,
      found: results.length,
      candidateCount: candidateDocs.length,
    });
  } else {
    console.log('[findSimilarOperations] ❌ Похожих операций не найдено', {
      operationId: targetOperation.id,
      description: targetOperation.description?.substring(0, 50),
      fieldToUpdate,
      tag: primaryTag,
      candidateCount: candidateDocs.length,
      totalOperations: allOperations.length,
      filteredCandidates: candidateOperations.length,
      reason:
        candidateDocs.length === 0
          ? 'Нет кандидатов для поиска (все обработаны или заблокированы)'
          : 'Нет операций с таким же тегом',
    });
  }

  return results;
};

/**
 * Группирует операции по похожести
 */
export const groupSimilarOperations = (
  operations: ImportedOperation[],
  companyInn?: string | null
): Map<string, ImportedOperation[]> => {
  const groups = new Map<string, ImportedOperation[]>();
  const processed = new Set<string>();

  operations.forEach((operation) => {
    if (processed.has(operation.id)) {
      return;
    }

    const similar = findSimilarOperations(operation, operations, companyInn);
    if (similar.length > 0) {
      const groupKey = operation.id;
      const group = [operation, ...similar.map((s) => s.operation)];
      groups.set(groupKey, group);

      // Помечаем все операции группы как обработанные
      group.forEach((op) => processed.add(op.id));
    }
  });

  return groups;
};

const buildTokenSet = (text?: string): Set<string> => {
  if (!text) {
    return new Set<string>();
  }
  const normalized = normalizeTextAggressiveLocal(text);
  return new Set(
    normalized
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length > 2)
  );
};

const calculateJaccardIndex = (
  setA: Set<string>,
  setB: Set<string>
): number => {
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection++;
    }
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
};

const normalizeTextAggressiveLocal = (text: string): string => {
  let normalized = normalizeText(text);
  normalized = normalized.replace(/\S*\d\S*/g, '');
  normalized = normalized.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
  const stopWords = [
    'по',
    'от',
    'за',
    'в',
    'на',
    'с',
    'и',
    'или',
    'для',
    'до',
    'из',
    'без',
    'том',
    'числе',
    'оплата',
    'оплате',
    'оплатой',
    'оплату',
    'услуга',
    'услуги',
    'услуг',
    'платеж',
    'платежа',
    'платежом',
    'счет',
    'счета',
    'счёт',
    'счёта',
    'договор',
    'договору',
    'сумма',
    'назначение',
    'перечисление',
    'перечислен',
    'перечислено',
  ];
  const words = normalized.split(/\s+/);
  return words
    .filter((word) => word && !stopWords.includes(word))
    .join(' ')
    .trim();
};
