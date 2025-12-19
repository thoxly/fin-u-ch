import logger from '../../config/logger';

interface CurrencyRates {
  [currencyCode: string]: number; // курс к рублю
  lastUpdated: number; // timestamp последнего обновления
}

interface CbrApiResponse {
  Valute?: {
    [key: string]: {
      CharCode: string;
      Value: number;
      Nominal: number;
    };
  };
}

// Кеш курсов валют в памяти
// Ключ: дата (YYYY-MM-DD), значение: курсы валют
const ratesCache = new Map<string, CurrencyRates>();

// Время жизни кеша: 1 час
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Сервис для работы с курсами валют ЦБ РФ
 * Использует API cbr-xml-daily.ru
 */
export class CurrencyService {
  /**
   * Получает курсы валют на текущую дату
   * Использует кеширование для оптимизации запросов
   */
  async getRates(date?: Date): Promise<CurrencyRates> {
    const dateKey = date
      ? date.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Проверяем кеш
    const cached = ratesCache.get(dateKey);
    if (cached) {
      const now = Date.now();
      const cacheAge = now - cached.lastUpdated;
      if (cacheAge < CACHE_TTL_MS) {
        logger.debug('Currency rates retrieved from cache', { dateKey });
        return cached;
      }
    }

    try {
      // Получаем курсы с API
      const url = date
        ? `https://www.cbr-xml-daily.ru/daily/${dateKey.replace(/-/g, '/')}.js`
        : 'https://www.cbr-xml-daily.ru/daily_json.js';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as CbrApiResponse;
      const rates: CurrencyRates = {
        lastUpdated: Date.now(),
      };

      // Конвертируем курсы в формат: код валюты -> курс к рублю
      // В API ЦБ курс указан как "Value" (стоимость за номинал) и "Nominal" (номинал)
      // Курс к рублю = Value / Nominal
      if (data.Valute) {
        Object.keys(data.Valute).forEach((key) => {
          const currency = data.Valute![key];
          // Конвертируем код валюты (например, "USD" -> "USD")
          rates[currency.CharCode] = currency.Value / currency.Nominal;
        });
      }

      // Рубль всегда равен 1
      rates['RUB'] = 1;

      // Сохраняем в кеш
      ratesCache.set(dateKey, rates);

      logger.info('Currency rates fetched from API', {
        dateKey,
        currenciesCount: Object.keys(rates).length - 1, // -1 для lastUpdated
      });

      return rates;
    } catch (error) {
      logger.error('Failed to fetch currency rates', {
        dateKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Если есть кеш (даже устаревший), возвращаем его
      if (cached) {
        logger.warn('Using stale currency rates from cache', { dateKey });
        return cached;
      }

      // Если кеша нет, пробуем получить курсы на вчерашний день
      if (!date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().split('T')[0];
        const yesterdayCached = ratesCache.get(yesterdayKey);
        if (yesterdayCached) {
          logger.warn('Using yesterday currency rates', {
            dateKey: yesterdayKey,
          });
          return yesterdayCached;
        }
      }

      // Если ничего не получилось, выбрасываем ошибку
      throw new Error(
        `Failed to fetch currency rates for ${dateKey}. Please try again later.`
      );
    }
  }

  /**
   * Конвертирует сумму из одной валюты в другую
   * @param amount - сумма для конвертации
   * @param fromCurrency - исходная валюта (код ISO)
   * @param toCurrency - целевая валюта (код ISO)
   * @param date - дата курса (опционально, по умолчанию текущая)
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<number> {
    // Если валюты одинаковые, возвращаем сумму без изменений
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getRates(date);

    // Получаем курсы к рублю
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate) {
      throw new Error(`Currency rate not found for ${fromCurrency}`);
    }

    if (!toRate) {
      throw new Error(`Currency rate not found for ${toCurrency}`);
    }

    // Конвертируем через рубль: amount * fromRate (в рубли) / toRate (из рублей)
    const result = (amount * fromRate) / toRate;

    return Math.round(result * 100) / 100; // Округляем до 2 знаков после запятой
  }

  /**
   * Конвертирует сумму в базовую валюту компании
   * @param amount - сумма для конвертации
   * @param fromCurrency - исходная валюта
   * @param baseCurrency - базовая валюта компании (обычно RUB)
   * @param date - дата курса (опционально)
   */
  async convertToBase(
    amount: number,
    fromCurrency: string,
    baseCurrency: string,
    date?: Date
  ): Promise<number> {
    return this.convert(amount, fromCurrency, baseCurrency, date);
  }

  /**
   * Очищает кеш курсов валют
   */
  clearCache(): void {
    ratesCache.clear();
    logger.info('Currency rates cache cleared');
  }
}

export default new CurrencyService();
