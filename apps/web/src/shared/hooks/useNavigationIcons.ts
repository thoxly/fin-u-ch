import { useMemo } from 'react';
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} from '../../store/api/authApi';

export interface NavigationItem {
  name: string;
  href?: string;
  icon?: string;
  children?: NavigationItem[];
  disabled?: boolean;
  tooltip?: string;
}

const DEFAULT_ICONS: Record<string, string> = {
  Дашборд: 'LayoutDashboard',
  Операции: 'ArrowLeftRight',
  Бюджеты: 'Target',
  Планы: 'ClipboardList',
  Отчеты: 'BarChart3',
  Справочники: 'FolderOpen',
  Статьи: 'FileText',
  Счета: 'Wallet',
  Подразделения: 'Building2',
  Контрагенты: 'Users',
  Сделки: 'Handshake',
  Зарплаты: 'DollarSign',
  Администрирование: 'Settings',
  Поддержка: 'HelpCircle',
};

interface UseNavigationIconsReturn {
  getIcon: (name: string) => string;
  updateIcon: (name: string, iconName: string) => Promise<void>;
  isLoading: boolean;
}

export const useNavigationIcons = (): UseNavigationIconsReturn => {
  const { data: preferences, isLoading } = useGetPreferencesQuery();
  const [updatePreferences] = useUpdatePreferencesMutation();

  const icons = useMemo(() => {
    return {
      ...DEFAULT_ICONS,
      ...(preferences?.navigationIcons || {}),
    };
  }, [preferences]);

  const getIcon = (name: string): string => {
    return icons[name] || 'Circle';
  };

  const updateIcon = async (name: string, iconName: string): Promise<void> => {
    try {
      const newNavigationIcons = {
        ...(preferences?.navigationIcons || {}),
        [name]: iconName,
      };

      await updatePreferences({
        ...preferences,
        navigationIcons: newNavigationIcons,
      }).unwrap();
    } catch (error) {
      console.error('Failed to update icon:', error);
      throw error;
    }
  };

  return {
    getIcon,
    updateIcon,
    isLoading,
  };
};
