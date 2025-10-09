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
    const newNavigationIcons = {
      ...(uiSettings?.navigationIcons || {}),
      [name]: iconName,
    };

    await updateUiSettings({
      ...uiSettings,
      navigationIcons: newNavigationIcons,
    });
  };

  return {
    getIcon,
    updateIcon,
    isLoading,
  };
};
