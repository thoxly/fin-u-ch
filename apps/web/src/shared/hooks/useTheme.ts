import { useEffect, useState } from 'react';
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} from '../../store/api/authApi';

type Theme = 'light' | 'dark' | 'system';

export function useTheme(): [Theme, (theme: Theme) => Promise<void>] {
  const { data: preferences, isLoading } = useGetPreferencesQuery();
  const [updatePreferences] = useUpdatePreferencesMutation();
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const theme = (preferences?.theme as Theme) || 'system';

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (isLoading) return;

    const effectiveTheme = theme === 'system' ? systemTheme : theme;
    const root = document.documentElement;

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, systemTheme, isLoading]);

  const setTheme = async (newTheme: Theme) => {
    await updatePreferences({
      ...preferences,
      theme: newTheme,
    }).unwrap();
  };

  return [theme, setTheme];
}
