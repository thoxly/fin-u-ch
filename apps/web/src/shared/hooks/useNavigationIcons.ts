import { useMemo } from 'react';
import {
  useGetUiSettingsQuery,
  useUpdateUiSettingsMutation,
} from '../../store/api/companiesApi';

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

interface UseNavigationIconsReturn {
  getIcon: (name: string) => string;
  updateIcon: (name: string, iconName: string) => Promise<void>;
  isLoading: boolean;
}

export const useNavigationIcons = (): UseNavigationIconsReturn => {
  const { data: uiSettings, isLoading } = useGetUiSettingsQuery();
  const [updateUiSettings] = useUpdateUiSettingsMutation();

  const icons = useMemo(() => {
    return {
      ...DEFAULT_ICONS,
      ...(uiSettings?.navigationIcons || {}),
    };
  }, [uiSettings]);

  const getIcon = (name: string): string => {
    return icons[name] || 'Circle';
  };

  const updateIcon = async (name: string, iconName: string): Promise<void> => {
    try {
      const newNavigationIcons = {
        ...(uiSettings?.navigationIcons || {}),
        [name]: iconName,
      };

      await updateUiSettings({
        ...uiSettings,
        navigationIcons: newNavigationIcons,
      }).unwrap();
    } catch (error) {
      console.error('Failed to update icon:', error);
      // Note: Consider adding toast notification for user feedback
    }
  };

  return {
    getIcon,
    updateIcon,
    isLoading,
  };
};
