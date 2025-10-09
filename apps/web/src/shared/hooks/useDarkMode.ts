import { useEffect } from 'react';

/**
 * Hook для автоматического определения и применения темной темы
 * на основе системных настроек пользователя
 */
export function useDarkMode() {
  useEffect(() => {
    // Проверяем системные настройки темы
    const isDarkMode = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    // Применяем класс dark к html элементу
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Слушаем изменения системных настроек
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Добавляем слушатель (поддержка старых браузеров)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback для старых браузеров
      mediaQuery.addListener(handleChange);
    }

    // Очистка при размонтировании
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);
}
