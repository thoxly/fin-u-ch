import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../shared/lib/yandexMetrika';

/**
 * Компонент для отслеживания изменений роутов в SPA и отправки данных в Яндекс Метрику
 */
export function YandexMetrikaTracker() {
  const location = useLocation();

  useEffect(() => {
    // Отслеживаем изменение роута
    // Используем небольшую задержку, чтобы убедиться, что страница полностью загружена
    const timeoutId = setTimeout(() => {
      trackPageView(window.location.href, {
        title: document.title,
        referer: document.referrer,
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.pathname, location.search]);

  return null;
}
