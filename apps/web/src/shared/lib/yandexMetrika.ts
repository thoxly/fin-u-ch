/**
 * Утилиты для работы с Яндекс Метрикой в SPA приложении
 */

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const YANDEX_METRIKA_ID = 105947095;

/**
 * Отправляет данные о просмотре страницы в Яндекс Метрику
 * @param url - URL страницы (опционально, по умолчанию используется window.location.href)
 * @param options - Дополнительные опции для отправки
 */
export function trackPageView(
  url?: string,
  options?: {
    title?: string;
    referer?: string;
    params?: Record<string, unknown>;
  }
): void {
  if (typeof window === 'undefined' || !window.ym) {
    return;
  }

  try {
    window.ym(YANDEX_METRIKA_ID, 'hit', url || window.location.href, {
      title: options?.title || document.title,
      referer: options?.referer,
      params: options?.params,
    });
  } catch (error) {
    // Игнорируем ошибки, чтобы не ломать приложение
    console.warn('Yandex Metrika tracking error:', error);
  }
}

/**
 * Отправляет достижение цели в Яндекс Метрику
 * @param targetName - Название цели
 * @param params - Дополнительные параметры
 */
export function reachGoal(
  targetName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.ym) {
    return;
  }

  try {
    if (params) {
      window.ym(YANDEX_METRIKA_ID, 'reachGoal', targetName, params);
    } else {
      window.ym(YANDEX_METRIKA_ID, 'reachGoal', targetName);
    }
  } catch (error) {
    console.warn('Yandex Metrika goal tracking error:', error);
  }
}

/**
 * Передает параметры визита
 * @param params - Параметры визита
 */
export function setVisitParams(params: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.ym) {
    return;
  }

  try {
    window.ym(YANDEX_METRIKA_ID, 'params', params);
  } catch (error) {
    console.warn('Yandex Metrika params error:', error);
  }
}

/**
 * Передает параметры посетителя
 * @param params - Параметры посетителя
 */
export function setUserParams(params: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.ym) {
    return;
  }

  try {
    window.ym(YANDEX_METRIKA_ID, 'userParams', params);
  } catch (error) {
    console.warn('Yandex Metrika user params error:', error);
  }
}

/**
 * Проверяет, загружена ли Яндекс Метрика
 */
export function isMetrikaLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.ym === 'function';
}
