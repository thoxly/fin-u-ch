import { useEffect } from 'react';

/**
 * Hook для автоматического определения и применения темной темы
 * на основе системных настроек пользователя
 */
export function useDarkMode(): void {
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
    const handleChange = (e: MediaQueryListEvent): void => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Добавляем слушатель
    mediaQuery.addEventListener('change', handleChange);

    // Очистка при размонтировании
    return (): void => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
}
