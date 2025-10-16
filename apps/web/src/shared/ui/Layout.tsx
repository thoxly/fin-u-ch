import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import * as Icons from 'lucide-react';
import { IconPickerPopover } from './IconPickerPopover';
import { useNavigationIcons } from '../hooks/useNavigationIcons';

interface LayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href?: string;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  { name: 'Дашборд', href: '/dashboard' },
  { name: 'Операции', href: '/operations' },
  { name: 'Планы', href: '/plans' },
  { name: 'Отчеты', href: '/reports' },
  {
    name: 'Справочники',
    children: [
      { name: 'Статьи', href: '/catalogs/articles' },
      { name: 'Счета', href: '/catalogs/accounts' },
      { name: 'Подразделения', href: '/catalogs/departments' },
      { name: 'Контрагенты', href: '/catalogs/counterparties' },
      { name: 'Сделки', href: '/catalogs/deals' },
      { name: 'Зарплаты', href: '/catalogs/salaries' },
    ],
  },
];

export const Layout = ({ children }: LayoutProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { getIcon, updateIcon } = useNavigationIcons();

  const [iconPickerState, setIconPickerState] = useState<{
    isOpen: boolean;
    itemName: string;
    position: { top: number; left: number };
  }>({ isOpen: false, itemName: '', position: { top: 0, left: 0 } });

  const handleLogout = (): void => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (href: string): boolean => location.pathname === href;

  const handleIconClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    itemName: string
  ): void => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    setIconPickerState({
      isOpen: true,
      itemName,
      position: {
        top: rect.bottom + 5,
        left: rect.left,
      },
    });
  };

  const handleIconSelect = (iconName: string): void => {
    updateIcon(iconPickerState.itemName, iconName);
  };

  const handleCloseIconPicker = (): void => {
    setIconPickerState({
      isOpen: false,
      itemName: '',
      position: { top: 0, left: 0 },
    });
  };

  const renderIcon = (itemName: string): JSX.Element => {
    const iconName = getIcon(itemName);
    const IconComponent =
      (Icons[iconName as keyof typeof Icons] as Icons.LucideIcon | undefined) ||
      Icons.Circle;
    return <IconComponent size={18} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm dark:bg-gray-800 dark:shadow-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="text-xl font-bold text-primary-600 dark:text-primary-400"
              >
                Fin-U-CH
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-gray-100"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sidebar */}
        <aside className="w-64 pr-8">
          <nav className="space-y-1">
            {navigation.map((item) =>
              item.children ? (
                <div key={item.name}>
                  <div className="group relative flex items-center gap-2 text-sm font-medium text-gray-500 px-3 py-2 dark:text-gray-400">
                    <button
                      onClick={(e) => handleIconClick(e, item.name)}
                      className="flex-shrink-0 opacity-70 group-hover:opacity-100 hover:bg-gray-200 p-1 rounded transition-all dark:hover:bg-gray-700"
                      title="Изменить иконку"
                    >
                      {renderIcon(item.name)}
                    </button>
                    <span>{item.name}</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href || '/'}
                        className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive(child.href || '/')
                            ? 'bg-primary-100 text-primary-700 font-medium dark:bg-primary-900/30 dark:text-primary-400'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <button
                          onClick={(e) => handleIconClick(e, child.name)}
                          className="flex-shrink-0 opacity-70 group-hover:opacity-100 hover:bg-gray-200 p-1 rounded transition-all dark:hover:bg-gray-600"
                          title="Изменить иконку"
                        >
                          {renderIcon(child.name)}
                        </button>
                        <span>{child.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  to={item.href || '/'}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(item.href || '/')
                      ? 'bg-primary-100 text-primary-700 font-medium dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <button
                    onClick={(e) => handleIconClick(e, item.name)}
                    className="flex-shrink-0 opacity-70 group-hover:opacity-100 hover:bg-gray-200 p-1 rounded transition-all dark:hover:bg-gray-600"
                    title="Изменить иконку"
                  >
                    {renderIcon(item.name)}
                  </button>
                  <span>{item.name}</span>
                </Link>
              )
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Icon Picker Popover */}
      {iconPickerState.isOpen && (
        <IconPickerPopover
          currentIcon={getIcon(iconPickerState.itemName)}
          onSelectIcon={handleIconSelect}
          onClose={handleCloseIconPicker}
          anchorPosition={iconPickerState.position}
        />
      )}
    </div>
  );
};
