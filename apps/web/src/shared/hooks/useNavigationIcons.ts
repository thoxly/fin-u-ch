import { useState, useEffect } from 'react';

export interface NavigationItem {
  name: string;
  href?: string;
  icon?: string;
  children?: NavigationItem[];
}

const DEFAULT_ICONS: Record<string, string> = {
  Дашборд: 'LayoutDashboard',
  Операции: 'Receipt',
  Планы: 'ClipboardList',
  Отчеты: 'BarChart3',
  Справочники: 'FolderOpen',
  Статьи: 'FileText',
  Счета: 'Wallet',
  Подразделения: 'Building2',
  Контрагенты: 'Users',
  Сделки: 'Handshake',
  Зарплаты: 'DollarSign',
};

const STORAGE_KEY = 'navigation-icons';

interface UseNavigationIconsReturn {
  getIcon: (name: string) => string;
  updateIcon: (name: string, iconName: string) => void;
  resetIcon: (name: string) => void;
  resetAllIcons: () => void;
}

export const useNavigationIcons = (): UseNavigationIconsReturn => {
  const [icons, setIcons] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_ICONS, ...JSON.parse(stored) };
      }
    } catch (error) {
      // Note: Using console.error as logger is not available in frontend context
      console.error('Failed to load navigation icons:', error);
    }
    return DEFAULT_ICONS;
  });

  useEffect(() => {
    try {
      // Сохраняем только измененные иконки
      const customIcons = Object.entries(icons).reduce(
        (acc, [key, value]) => {
          if (DEFAULT_ICONS[key] !== value) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(customIcons));
    } catch (error) {
      // Note: Using console.error as logger is not available in frontend context
      console.error('Failed to save navigation icons:', error);
    }
  }, [icons]);

  const updateIcon = (name: string, iconName: string) => {
    setIcons((prev) => ({
      ...prev,
      [name]: iconName,
    }));
  };

  const getIcon = (name: string): string => {
    return icons[name] || 'Circle';
  };

  const resetIcon = (name: string) => {
    setIcons((prev) => ({
      ...prev,
      [name]: DEFAULT_ICONS[name] || 'Circle',
    }));
  };

  const resetAllIcons = () => {
    setIcons(DEFAULT_ICONS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    getIcon,
    updateIcon,
    resetIcon,
    resetAllIcons,
  };
};
