import { useEffect, useState } from 'react';

/**
 * Hook для определения текущей темы (темная/светлая)
 * @returns true если тема темная, false если светлая
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Проверяем начальное состояние
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // Проверяем при монтировании
    checkTheme();

    // Слушаем изменения системных настроек
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      checkTheme();
    };

    // Слушаем изменения класса на documentElement
    const observer = new MutationObserver(() => {
      checkTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isDark;
}
