import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X as XIcon } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui/Button';
import * as Icons from 'lucide-react';
import { useNavigationIcons } from '../../shared/hooks/useNavigationIcons';
import { useNotification } from '../../shared/hooks/useNotification';
import { useGetPreferencesQuery } from '../../store/api/authApi';

const NAVIGATION_ITEMS = [
  { name: 'Дашборд' },
  { name: 'Операции' },
  { name: 'Планы' },
  { name: 'Отчеты' },
  { name: 'Справочники' },
  { name: 'Статьи' },
  { name: 'Счета' },
  { name: 'Подразделения' },
  { name: 'Контрагенты' },
  { name: 'Сделки' },
  { name: 'Зарплаты' },
  { name: 'Администрирование' },
];

// Список популярных иконок для выбора
const AVAILABLE_ICONS = [
  'LayoutDashboard',
  'Receipt',
  'ClipboardList',
  'BarChart3',
  'FileText',
  'Wallet',
  'Building2',
  'Users',
  'Handshake',
  'DollarSign',
  'Home',
  'Settings',
  'Calendar',
  'TrendingUp',
  'PieChart',
  'FolderOpen',
  'BookOpen',
  'Calculator',
  'CreditCard',
  'Briefcase',
  'Target',
  'Activity',
  'Package',
  'ShoppingCart',
  'UserCheck',
  'Building',
  'MapPin',
  'Phone',
  'Mail',
  'Globe',
  'Database',
  'Server',
  'Cloud',
  'Lock',
  'Unlock',
  'Eye',
  'EyeOff',
  'Bell',
  'BellOff',
  'Star',
  'Heart',
  'Flag',
  'Tag',
  'Filter',
  'Search',
  'Plus',
  'Minus',
  'Edit',
  'Trash',
  'Copy',
  'Download',
  'Upload',
] as const;

interface IconEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
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
  Администрирование: 'Settings',
};

export const IconEditorModal = ({
  isOpen,
  onClose,
  onSave,
}: IconEditorModalProps) => {
  const { getIcon, updateIcon } = useNavigationIcons();
  const { data: preferences } = useGetPreferencesQuery();
  const { showError } = useNotification();
  const [localIcons, setLocalIcons] = useState<Record<string, string>>({});
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState<
    Record<string, string>
  >({});
  const pickerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Получаем текущие иконки из preferences
  const currentIcons = useMemo(() => {
    return {
      ...DEFAULT_ICONS,
      ...(preferences?.navigationIcons || {}),
    };
  }, [preferences?.navigationIcons]);

  // Инициализация локальных иконок при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      const icons: Record<string, string> = {};
      NAVIGATION_ITEMS.forEach((item) => {
        icons[item.name] = currentIcons[item.name] || 'Circle';
      });
      setLocalIcons(icons);
      setOpenPickerFor(null);
      setIconSearchQuery({});
    }
  }, [isOpen, currentIcons]);

  // Закрытие picker при клике вне его
  useEffect(() => {
    if (!openPickerFor) return;

    const handleClickOutside = (event: MouseEvent) => {
      const pickerElement = pickerRefs.current[openPickerFor];
      if (pickerElement && !pickerElement.contains(event.target as Node)) {
        setOpenPickerFor(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPickerFor]);

  const handleIconSelect = (itemName: string, iconName: string) => {
    setLocalIcons((prev) => ({ ...prev, [itemName]: iconName }));
    setOpenPickerFor(null);
  };

  const handleSave = async () => {
    if (!hasChanges()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      // Сохраняем все измененные иконки
      const promises = Object.entries(localIcons).map(([name, iconName]) => {
        const currentIcon = currentIcons[name] || 'Circle';
        if (currentIcon !== iconName) {
          return updateIcon(name, iconName);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      onSave();
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении иконок:', error);
      showError('Ошибка при сохранении иконок. Попробуйте еще раз.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderIcon = (iconName: string, size: number = 20) => {
    const IconComponent =
      (Icons[iconName as keyof typeof Icons] as Icons.LucideIcon | undefined) ||
      Icons.Circle;
    return <IconComponent size={size} />;
  };

  const hasChanges = () => {
    return NAVIGATION_ITEMS.some((item) => {
      const currentIcon = currentIcons[item.name] || 'Circle';
      const localIcon = localIcons[item.name];
      return localIcon && currentIcon !== localIcon;
    });
  };

  const getFilteredIcons = (itemName: string) => {
    const query = iconSearchQuery[itemName]?.toLowerCase() || '';
    if (!query) return AVAILABLE_ICONS;
    return AVAILABLE_ICONS.filter((iconName) =>
      iconName.toLowerCase().includes(query)
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактирование иконок"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Выберите иконки для элементов навигации. Изменения будут применены
          после сохранения.
        </p>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {NAVIGATION_ITEMS.map((item) => {
            const currentIconName = localIcons[item.name] || getIcon(item.name);
            const isPickerOpen = openPickerFor === item.name;

            return (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                    {renderIcon(currentIconName, 20)}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </span>
                </div>

                <div className="relative flex-shrink-0">
                  <button
                    onClick={() =>
                      setOpenPickerFor(isPickerOpen ? null : item.name)
                    }
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Выбрать иконку"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      {renderIcon(currentIconName, 18)}
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${
                        isPickerOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isPickerOpen && (
                    <div
                      ref={(el) => {
                        pickerRefs.current[item.name] = el;
                      }}
                      className="absolute right-0 top-full mt-2 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 max-h-96 flex flex-col"
                    >
                      {/* Search */}
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                          <Search
                            size={16}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="Поиск иконки..."
                            value={iconSearchQuery[item.name] || ''}
                            onChange={(e) =>
                              setIconSearchQuery((prev) => ({
                                ...prev,
                                [item.name]: e.target.value,
                              }))
                            }
                            className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                          />
                          {iconSearchQuery[item.name] && (
                            <button
                              onClick={() =>
                                setIconSearchQuery((prev) => {
                                  const newQuery = { ...prev };
                                  delete newQuery[item.name];
                                  return newQuery;
                                })
                              }
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <XIcon size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Icons Grid */}
                      <div className="p-3 overflow-y-auto flex-1">
                        {getFilteredIcons(item.name).length > 0 ? (
                          <div className="grid grid-cols-6 gap-2">
                            {getFilteredIcons(item.name).map((iconName) => {
                              const isSelected = iconName === currentIconName;
                              return (
                                <button
                                  key={iconName}
                                  onClick={() =>
                                    handleIconSelect(item.name, iconName)
                                  }
                                  className={`
                                    p-2 rounded transition-all hover:scale-110
                                    ${
                                      isSelected
                                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 ring-2 ring-primary-500'
                                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }
                                  `}
                                  title={iconName}
                                >
                                  {renderIcon(iconName, 18)}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                            Иконки не найдены
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges() || isSaving}
          >
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
