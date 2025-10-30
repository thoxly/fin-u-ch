import { useEffect, useState } from 'react';

export function useIsSmallScreen(maxWidth: number = 640): boolean {
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const handler = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    // new API
    mql.addEventListener?.('change', handler);
    // fallback
    // @ts-expect-error older browsers
    mql.addListener?.(handler);
    setIsSmall(mql.matches);
    return () => {
      mql.removeEventListener?.('change', handler);
      // @ts-expect-error older browsers
      mql.removeListener?.(handler);
    };
  }, [maxWidth]);

  return isSmall;
}
