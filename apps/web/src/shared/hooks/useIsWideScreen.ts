import { useEffect, useState } from 'react';

/**
 * Определяет, является ли экран широкоформатным (ширина >= 1920px)
 * Используется для принятия решений о прореживании меток на графиках
 */
export function useIsWideScreen(minWidth: number = 1920): boolean {
  const [isWide, setIsWide] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(min-width: ${minWidth}px)`);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    // new API
    mql.addEventListener?.('change', handler);
    // fallback
    // @ts-expect-error older browsers
    mql.addListener?.(handler);
    setIsWide(mql.matches);
    return () => {
      mql.removeEventListener?.('change', handler);
      // @ts-expect-error older browsers
      mql.removeListener?.(handler);
    };
  }, [minWidth]);

  return isWide;
}
