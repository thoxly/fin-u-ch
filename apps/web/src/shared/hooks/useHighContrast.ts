import { useEffect, useState } from 'react';

const STORAGE_KEY = 'highContrast';

export function useHighContrast(): [boolean, (next?: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === '1' || raw === 'true';
    } catch {
      // ignore storage errors (e.g., private mode)
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    // Reflect on document for CSS-based tweaks if needed
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [enabled]);

  const toggle = (next?: boolean): void => {
    setEnabled((prev) => (typeof next === 'boolean' ? next : !prev));
  };

  return [enabled, toggle];
}
