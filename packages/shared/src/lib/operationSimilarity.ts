import type { ParsedDocument } from '../types/imports';

export interface OperationDirectionResult {
  direction: 'income' | 'expense' | 'transfer' | null;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

/**
 * Словарь тегов с ключевыми словами для категоризации операций
 * Порядок важен: первый совпавший тег становится основным
 */
const TAGS: Record<string, string[]> = {
  salary: [
    'зарплат',
    'оклад',
    'преми',
    'компенсац',
    'доначисл',
    'выплата сотруд',
  ],
  payroll_taxes: ['ндфл', 'страхов', 'взнос фсс', 'пенсион', 'фомс', 'енп'],
  hr_expenses: [
    'подбор персон',
    'рекрутинг',
    'кадров',
    'аутстафф',
    'аутсорс персон',
  ],
  employee_training: [
    'обучен',
    'курсы',
    'семинар',
    'повышени квалификац',
    'тренинг',
  ],
  employee_medical_checks: ['медосмотр', 'мед комисс', 'допуск работ'],
  employee_uniform: [
    'спецодежд',
    'спецобув',
    'средств индивидуальн',
    'сиж',
    'спец экипиров',
  ],
  travel_accommodation: ['проживан', 'гостиниц', 'отел', 'командиров', 'билет'],
  travel_transport: ['авиабилет', 'жд билет', 'такси', 'трансфер', 'проезд'],
  travel_daily_allowance: ['суточн', 'командировочн', 'дневн норм'],
  taxes_general: ['налог', 'усн', 'осно', 'енп', 'имущественн налог', 'прибыл'],
  fines_penalties: ['штраф', 'пени', 'неустойк', 'санкц'],
  government_fees: ['госпошлин', 'пошлин', 'регистрац', 'лицензир'],
  rent_office: ['аренд офис', 'офисное помещен'],
  rent_warehouse: ['аренд склад', 'складск'],
  rent_equipment: ['аренд оборуд', 'аренд техн', 'аренд спецтехн'],
  utilities_power: ['электроэнерг', 'квт', 'энергоснабжен'],
  utilities_water: ['водоснабжен', 'водоотведен', 'хвс', 'гвс'],
  utilities_heating: ['отоплен', 'теплоснабжен'],
  utilities_gas: ['газоснабжен', 'подача газ'],
  telecom_internet: ['интернет', 'связь', 'трафик', 'телефони'],
  telecom_mobile: ['мобил связь', 'сим карт', 'оператор сотов'],
  raw_materials: ['сырь', 'материал', 'заготовк', 'полуфабрикат'],
  components: ['комплектующ', 'детал', 'элемент', 'сборочн', 'узел'],
  spare_parts: ['запчаст', 'ремкомплект', 'детал замен'],
  goods_purchase: [
    'товар',
    'товарн',
    'тмц',
    'поставка',
    'продаж',
    'оптов',
    'закуп',
  ],
  packaging: ['тара', 'упаков', 'короб', 'пакет'],
  office_supplies: ['канцеляр', 'бумаг', 'ручк', 'офисн принадлеж'],
  furniture: ['мебел', 'стол', 'кресл', 'шкаф'],
  cleaning_supplies: ['хозтовар', 'моющ', 'уборочн', 'санитар'],
  equipment_purchase: [
    'оборуд',
    'станок',
    'установк',
    'агрегат',
    'машин',
    'выключател',
    'реклоузер',
  ],
  maintenance_service: [
    'техобслуж',
    'профилактик',
    'сервисн обслуж',
    'техническое обслуж',
  ],
  repair: ['ремонт', 'восстановлен', 'починк', 'аварий'],
  construction_materials: [
    'бетон',
    'цемент',
    'арматур',
    'кирпич',
    'смес',
    'кабел',
    'провод',
  ],
  construction_services: [
    'строит работ',
    'подряд',
    'смет',
    'монтаж',
    'демонтаж',
  ],
  special_equipment_services: [
    'спецтехник',
    'манипулятор',
    'автовышк',
    'экскаватор',
    'погруз',
  ],
  movers_transport: ['грузчик', 'погрузочн', 'разгрузочн'],
  logistics_delivery: [
    'доставк',
    'перевозк',
    'транспортиров',
    'экспедирован',
    'автотранспорт',
  ],
  courier_services: ['курьер', 'доставщик', 'достав служб'],
  freight_transport: ['грузоперевоз', 'фура', 'трал', 'контейнер'],
  fuel: ['гсм', 'топлив', 'бензин', 'дт', 'газпромнефть'],
  tolls_parking: ['парков', 'платн дорог', 'проезд по трасс'],
  it_software: ['программн обеспеч', 'софт', 'лиценз', 'подписк', 'saas'],
  it_hardware: ['компьютер', 'ноутбук', 'сервер', 'монитор', 'перифер'],
  it_hosting: ['хостинг', 'вирт сервер', 'vps', 'aws', 'gcp'],
  it_domains: ['домен', 'регистрац домен', 'dns'],
  it_support: ['ит поддержк', 'поддержка систем', 'администрирован'],
  it_dev_services: ['разработк', 'программир', 'кодинг', 'frontend', 'backend'],
  // Важно: fee проверяем раньше income, чтобы "комиссия за эквайринг" не попала в "эквайринг" (доход)
  acquiring_fee: [
    'комиссия за операции по терминал',
    'эквайринг комисс',
    'комиссия бан',
  ],
  acquiring_income: [
    'зачисление средств по терминал',
    'эквайринг',
    'оплата карт',
  ],
  banking_fees: ['комисс банк', 'обслужив счет', 'выпуск карт', 'рко'],
  loan_payments: ['кредит', 'процент', 'займ', 'погашен кредит'],
  insurance: ['страхован', 'полис', 'осаг', 'кбм', 'каско'],
  legal_services: ['юридическ услуг', 'юрист', 'консультац прав', 'судебн'],
  accounting_services: ['бухгалтер', 'аутсорс бух', 'учет', 'отчетност'],
  audit_services: ['аудит', 'проверка отчет', 'финан анализ'],
  marketing_ads: ['реклам', 'баннер', 'наружн', 'полиграф'],
  marketing_ppc: ['контекст', 'директ', 'ads', 'таргет', 'рся'],
  marketing_smm: ['smm', 'ведение соцсет', 'контент план', 'постинг'],
  marketplace_fee: ['комиссия площадк', 'маркетплейс', 'ozon', 'wb'],
  marketplace_payment: ['поступлен маркетплейс', 'выплат площадк'],
  consulting: ['консалтинг', 'исследован', 'экспертиз', 'оценк'],
  design_services: ['дизайн', 'брендбук', 'айдентик', 'макет'],
  photo_video_services: ['фотосъем', 'видеосъем', 'монтаж видео'],
  medical_services: ['медуслуг', 'диагностик', 'лечение', 'процедур'],
  lab_services: ['лаборатор', 'анализ', 'исследован биоматериал'],
  beauty_supplies: ['косметолог', 'расходник', 'материал для процедур'],
  horeca_food: ['продукт', 'ингредиент', 'овощ', 'мяс', 'рыб'],
  horeca_inventory: ['кухон инвентар', 'посуд', 'сковород', 'нож'],
  horeca_delivery: ['доставк продукт', 'поставщик общепит'],
  waste_disposal: ['вывоз мусор', 'утилизац', 'тбо'],
  security_services: ['охран', 'пульт охран', 'сигнализац', 'скуд'],
  cleaning_services: ['уборк', 'клинин', 'дезинфекц'],
  printing_services: ['печать', 'типограф', 'полиграф', 'листовк'],
  research_services: ['маркет иссл', 'опрос', 'аналитик'],
  charity: ['благотворительн', 'пожертвован', 'донат'],
  government_services: ['фнс', 'росреестр', 'мфц', 'регистрационн действ'],
  customs: ['таможн', 'растаможк', 'вэд'],
  warehouse_services: ['склад услуг', 'хранен грузов'],
  mortgage_lease: ['лизинг', 'лизингов плат', 'ао лк'],
  advertising_production: ['наружн реклам', 'вывеск', 'оформлен витрин'],
  subscription_services: ['подписк сервис', 'ежемес плат', 'периодическ оплат'],
  office_cleaning: ['уборк офис', 'клинингов услуг'],
  hr_benefits: ['дмс', 'корпоративн полис', 'добровольн страхов'],
  internal_transfer: ['перевод собственных средств'],
  cash_withdrawal: ['снятие наличных'],
  cash_deposit: ['внесение наличных', 'пополнение счет'],
  currency_exchange: ['обмен валют', 'конвертац', 'покупк валют'],
  depreciation: ['амортизац', 'износ осн средств'],
  inventory_services: ['инвентаризац', 'учет запас'],
  printing_materials: ['картридж', 'расходник принтер'],
  event_services: ['мероприяти', 'ивент', 'конференц', 'форум'],
  catering: ['кейтеринг', 'организация питан'],
  hr_outstaff: ['аутстаф', 'аутсорс персон'],
  pr_services: ['pr', 'паблик рилейшн', 'медий активност'],
  merchandising: ['мерчендайз', 'выкладк', 'розничн точк'],
  education_services: ['обучен сотруд', 'онлайн курс', 'аттестац'],
};

/**
 * Определяет направление операции на основе ИНН компании, номеров счетов и текста назначения платежа
 *
 * Логика определения:
 * - Если мы Плательщик (по ИНН или по номеру счета) → expense (списание)
 * - Если мы Получатель (по ИНН или по номеру счета) → income (поступление)
 * - Если мы и Плательщик и Получатель → transfer (перевод)
 */
export function determineOperationDirection(
  operation: ParsedDocument,
  companyInn?: string | null,
  companyAccountNumbers?: string[] | null
): OperationDirectionResult {
  const reasons: string[] = [];
  let direction: 'income' | 'expense' | 'transfer' | null = null;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Нормализуем ИНН (убираем пробелы)
  const normalizedCompanyInn = companyInn?.replace(/\s/g, '').trim() || null;
  const normalizedPayerInn =
    operation.payerInn?.replace(/\s/g, '').trim() || null;
  const normalizedReceiverInn =
    operation.receiverInn?.replace(/\s/g, '').trim() || null;

  // Нормализуем номера счетов (убираем пробелы)
  const normalizedCompanyAccounts =
    companyAccountNumbers
      ?.map((acc) => acc?.replace(/\s/g, '').trim())
      .filter((acc) => acc && acc.length > 0) || [];
  const normalizedPayerAccount =
    operation.payerAccount?.replace(/\s/g, '').trim() || null;
  const normalizedReceiverAccount =
    operation.receiverAccount?.replace(/\s/g, '').trim() || null;

  // Проверяем, является ли компания плательщиком (по ИНН или по номеру счета)
  const isCompanyPayer =
    (normalizedCompanyInn &&
      normalizedPayerInn &&
      normalizedPayerInn === normalizedCompanyInn) ||
    (normalizedPayerAccount &&
      normalizedCompanyAccounts.includes(normalizedPayerAccount));

  // Проверяем, является ли компания получателем (по ИНН или по номеру счета)
  const isCompanyReceiver =
    (normalizedCompanyInn &&
      normalizedReceiverInn &&
      normalizedReceiverInn === normalizedCompanyInn) ||
    (normalizedReceiverAccount &&
      normalizedCompanyAccounts.includes(normalizedReceiverAccount));

  // 1. ПРИОРИТЕТ: Проверяем по ИНН и номерам счетов (высокая уверенность)
  // Это самый надежный способ определения направления операции
  // Если мы и плательщик и получатель → перевод
  if (isCompanyPayer && isCompanyReceiver) {
    direction = 'transfer';
    confidence = 'high';
    const reasonParts: string[] = [];
    if (
      normalizedCompanyInn &&
      normalizedPayerInn === normalizedCompanyInn &&
      normalizedReceiverInn === normalizedCompanyInn
    ) {
      reasonParts.push('same INN');
    }
    if (
      normalizedPayerAccount &&
      normalizedCompanyAccounts.includes(normalizedPayerAccount) &&
      normalizedReceiverAccount &&
      normalizedCompanyAccounts.includes(normalizedReceiverAccount)
    ) {
      reasonParts.push('same account numbers');
    }
    reasons.push(
      `Company is both payer and receiver (${reasonParts.join(', ')})`
    );
    return { direction, confidence, reasons };
  }

  // Если мы плательщик (и не получатель) → расход (expense)
  // Это означает, что деньги уходят от нас, поэтому это расход
  if (isCompanyPayer && !isCompanyReceiver) {
    direction = 'expense';
    confidence = 'high';
    const reasonParts: string[] = [];
    if (normalizedCompanyInn && normalizedPayerInn === normalizedCompanyInn) {
      reasonParts.push('payer INN');
    }
    if (
      normalizedPayerAccount &&
      normalizedCompanyAccounts.includes(normalizedPayerAccount)
    ) {
      reasonParts.push('payer account');
    }
    reasons.push(`Company is payer → expense (${reasonParts.join(', ')})`);
    return { direction, confidence, reasons };
  }

  // Если мы получатель (и не плательщик) → поступление (income)
  // Это означает, что деньги приходят к нам, поэтому это доход
  // ПРИОРИТЕТ: эта проверка важнее тегов в назначении платежа
  if (isCompanyReceiver && !isCompanyPayer) {
    direction = 'income';
    confidence = 'high';
    const reasonParts: string[] = [];
    if (
      normalizedCompanyInn &&
      normalizedReceiverInn === normalizedCompanyInn
    ) {
      reasonParts.push('receiver INN');
    }
    if (
      normalizedReceiverAccount &&
      normalizedCompanyAccounts.includes(normalizedReceiverAccount)
    ) {
      reasonParts.push('receiver account');
    }
    reasons.push(`Company is receiver → income (${reasonParts.join(', ')})`);
    return { direction, confidence, reasons };
  }

  // 2. Fallback: Проверяем по тегам в назначении платежа (только если не определили по ИНН/счетам)
  // ВАЖНО: Эта проверка выполняется только если не удалось определить по ИНН/счетам
  // Если компания является получателем по ИНН, то это income, независимо от тегов
  if (operation.purpose) {
    const purposeLower = operation.purpose.toLowerCase();

    // Теги для расходов (используются только как fallback, если не определили по ИНН/счетам)
    // Убрали "списание" из тегов, так как это может быть в разных контекстах
    const expenseTags = [
      'комиссия',
      'штраф',
      'пеня',
      'налог',
      'взнос',
      'уплата',
      'перечисление',
    ];

    // Теги для доходов
    const incomeTags = [
      'поступление',
      'возврат',
      'возмещение',
      'компенсация',
      'зачисление',
    ];

    const hasExpenseTag = expenseTags.some((tag) => purposeLower.includes(tag));
    const hasIncomeTag = incomeTags.some((tag) => purposeLower.includes(tag));

    if (hasExpenseTag && !hasIncomeTag) {
      direction = 'expense';
      confidence = 'medium';
      reasons.push('Detected expense tag in purpose (fallback)');
      return { direction, confidence, reasons };
    }

    if (hasIncomeTag && !hasExpenseTag) {
      direction = 'income';
      confidence = 'medium';
      reasons.push('Detected income tag in purpose (fallback)');
      return { direction, confidence, reasons };
    }
  }

  // 3. Если ничего не определили
  return { direction: null, confidence: 'low', reasons };
}

/**
 * Находит похожие операции на основе тегов и семантического сходства
 */
export function findSimilarOperations(
  operation: ParsedDocument,
  existingOperations: ParsedDocument[]
): ParsedDocument[] {
  // Получаем теги для целевой операции
  const targetTags = extractTags(operation);
  const primaryTag = targetTags[0];

  // Подготавливаем нормализованный текст для Jaccard similarity
  const targetNorm = normalizeTextAggressive(operation.purpose || '');
  const targetTokenSet = new Set(
    targetNorm.split(' ').filter((t) => t.length > 2)
  );

  const similar: ParsedDocument[] = [];

  for (const candidate of existingOperations) {
    // Пропускаем саму операцию
    if (
      'id' in operation &&
      'id' in candidate &&
      operation.id === candidate.id
    ) {
      continue;
    }

    const candidateTags = extractTags(candidate);
    const candidatePrimaryTag = candidateTags[0];

    // 1. Если теги совпадают и это не 'other' - считаем похожими (категорийное сходство)
    if (primaryTag !== 'other' && candidatePrimaryTag === primaryTag) {
      similar.push(candidate);
      continue;
    }

    // 2. Если тег 'other' (или мы хотим более точный поиск) - используем сходство текста
    // Считаем похожими, если Jaccard similarity > 0.5
    const candidateNorm = normalizeTextAggressive(candidate.purpose || '');
    const candidateTokenSet = new Set(
      candidateNorm.split(' ').filter((t) => t.length > 2)
    );

    const similarity = calculateJaccardIndex(targetTokenSet, candidateTokenSet);

    if (similarity > 0.5) {
      similar.push(candidate);
    }
  }

  return similar;
}

/**
 * Вычисляет индекс Жаккара для двух множеств токенов
 */
function calculateJaccardIndex(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Извлекает теги из операции на основе назначения платежа
 * Использует словарь TAGS для поиска ключевых слов в нормализованном тексте
 * Первый совпавший тег становится основным, остальные - вторичными
 */
export function extractTags(operation: ParsedDocument): string[] {
  const purpose = operation.purpose || '';
  const normalized = normalizeText(purpose);

  const tags: string[] = [];

  // Проверяем теги по порядку из словаря TAGS
  // Первый совпавший тег становится основным
  for (const [tagName, keywords] of Object.entries(TAGS)) {
    // Проверяем, есть ли хотя бы одно ключевое слово в нормализованном тексте
    const hasMatch = keywords.some((keyword) => normalized.includes(keyword));

    if (hasMatch) {
      tags.push(tagName);
      // Первый совпавший тег - основной, остальные можно добавить как вторичные
      // Но по требованиям достаточно только основного
      break;
    }
  }

  // Если ничего не совпало, возвращаем 'other'
  if (tags.length === 0) {
    tags.push('other');
  }

  return tags;
}

/**
 * Базовая нормализация: убирает даты, суммы, НДС.
 * Используется для поиска тегов.
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  let normalized = text.trim().toLowerCase();

  // Убираем номера счетов (форматы: №123, № 123, №123-45, 123/45 и т.д.)
  normalized = normalized.replace(/№\s*\d+[\d\-/]*/g, '');

  // Убираем номера спецификаций (спецификация №123, специф. №123 и т.д.)
  normalized = normalized.replace(/спецификац[ияи]*\s*№?\s*\d+[\d\-/]*/gi, '');

  // Убираем номера документов (документ №123, док. №123, дог. №123, счет №...)
  normalized = normalized.replace(
    /(документ|док\.?|дог\.?|счет[а-я]*|сч\.?)\s*№?\s*\d+[\d\-/]*/gi,
    ''
  );

  // Убираем даты (форматы: 01.01.2025, 01/01/2025, 01-01-2025, от 14.10.2025г и т.д.)
  normalized = normalized.replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, '');
  normalized = normalized.replace(
    /от\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}г?/gi,
    ''
  );

  // Убираем упоминания НДС (ндс, ндс 20%, в том числе ндс и т.д.)
  normalized = normalized.replace(/[в\s]*т\.?\s*ч\.?\s*[в\s]*ндс[^\s]*/gi, '');
  normalized = normalized.replace(
    /в\s+том\s+числе\s+ндс[^\d]*(\d+([.,]\d+)?\s*(руб(лей|\.?)|₽)?)?/gi,
    ''
  );
  normalized = normalized.replace(/\bв\s*т\.?\s*ч\.?\b/gi, '');
  normalized = normalized.replace(/в\s+том\s+числе/gi, '');
  normalized = normalized.replace(/ндс\s*\d+\s*%/gi, '');
  normalized = normalized.replace(/ндс/gi, '');

  // Убираем суммы (рублей, рублей, руб., ₽ и т.д.)
  normalized = normalized.replace(/\d+[\s,.]*рубл[ейя]?/gi, '');
  normalized = normalized.replace(/\d+[\s,.]*₽/g, '');

  // Убираем проценты
  normalized = normalized.replace(/\d+\s*%/g, '');

  // Убираем множественные пробелы
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Агрессивная нормализация: убирает все слова с цифрами и стоп-слова.
 * Используется для семантического сравнения (Jaccard).
 */
export function normalizeTextAggressive(text: string): string {
  // Сначала базовая нормализация
  let normalized = normalizeText(text);

  // Убираем любые токены, содержащие цифры (ID, номера договоров, счетов, которые не поймал regex)
  normalized = normalized.replace(/\S*\d\S*/g, '');

  // Убираем знаки препинания
  normalized = normalized.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');

  // Убираем предлоги и союзы (стоп-слова)
  // Используем unicode boundary workaround или просто замену с пробелами
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
    'тоже',
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
  const filtered = words.filter((w) => !stopWords.includes(w));

  return filtered.join(' ').trim();
}
