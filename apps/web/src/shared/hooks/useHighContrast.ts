import { useEffect, useState } from 'react';

export function useHighContrast(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('ui.highContrast');
      return v === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ui.highContrast', enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    if (enabled) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [enabled]);

  return [enabled, setEnabled];
}
