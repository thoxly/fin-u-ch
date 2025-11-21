import { useEffect } from 'react';
import { useGetPreferencesQuery } from '../store/api/authApi';

const applySystemTheme = () => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = mediaQuery.matches;
  const root = document.documentElement;

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  return mediaQuery;
};

export const ThemeProvider = () => {
  // Try to get user preferences, but handle errors gracefully
  const {
    data: preferences,
    isLoading,
    isError,
  } = useGetPreferencesQuery(undefined, {
    // Skip query if no token to avoid unnecessary requests
    skip: typeof window === 'undefined' || !localStorage.getItem('accessToken'),
  });

  useEffect(() => {
    // If not authenticated or error, use system theme
    if (isError || !preferences) {
      const mediaQuery = applySystemTheme();

      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    if (isLoading) return;

    const theme =
      (preferences?.theme as 'light' | 'dark' | 'system') || 'system';
    const root = document.documentElement;

    if (theme === 'system') {
      // Use system preference
      const mediaQuery = applySystemTheme();

      // Listen to system theme changes
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Use user preference
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [preferences?.theme, isLoading, isError, preferences]);

  return null;
};
