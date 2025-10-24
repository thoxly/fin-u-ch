import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGetMeQuery } from '../../store/api/authApi';
import * as Icons from 'lucide-react';
import { IconPickerPopover } from './IconPickerPopover';
import { MenuPopover, MenuPopoverItem, MenuPopoverAction } from './MenuPopover';
import { useNavigationIcons } from '../hooks/useNavigationIcons';
import { OffCanvas } from './OffCanvas';
import { CatalogFormRenderer } from './CatalogFormRenderer';
import { UserMenu } from '../../features/user-menu';
import { UserProfileForm } from '../../features/user-profile/UserProfileForm';

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
  { name: 'Бюджеты', href: '/budgets' },
  {
    name: 'Отчеты',
    children: [
      { name: 'ДДС', href: '/reports?type=cashflow' },
      { name: 'ДДС детально', href: '/reports?type=dds' },
    ],
  },
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
  const { getIcon, updateIcon } = useNavigationIcons();
  const { data: user } = useGetMeQuery();

  const [iconPickerState, setIconPickerState] = useState<{
    isOpen: boolean;
    itemName: string;
    position: { top: number; left: number };
  }>({ isOpen: false, itemName: '', position: { top: 0, left: 0 } });

  const [menuPopoverState, setMenuPopoverState] = useState<{
    isOpen: boolean;
    items: MenuPopoverItem[];
    position: { top: number; left: number; right?: number };
    createAction?: MenuPopoverAction;
    activeParentName?: string;
  }>({ isOpen: false, items: [], position: { top: 0, left: 0 } });

  const [offCanvasState, setOffCanvasState] = useState<{
    isOpen: boolean;
    title: string;
    catalogType: string;
    editingData?: unknown; // Данные для редактирования
  }>({ isOpen: false, title: '', catalogType: '' });

  const [userProfileOffCanvasOpen, setUserProfileOffCanvasOpen] =
    useState(false);

  const isActive = (href: string): boolean => location.pathname === href;

  const isPopoverActive = (itemName: string): boolean =>
    menuPopoverState.isOpen && menuPopoverState.activeParentName === itemName;

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

  const getCatalogCreateLabel = (catalogName: string): string => {
    const labels: Record<string, string> = {
      Статьи: '+',
      Счета: '+',
      Подразделения: '+',
      Контрагенты: '+',
      Сделки: '+',
      Зарплаты: '+',
    };
    return labels[catalogName] || '+';
  };

  const getCatalogCreateTitle = (catalogName: string): string => {
    const titles: Record<string, string> = {
      Статьи: 'Создать статью',
      Счета: 'Создать счет',
      Подразделения: 'Создать подразделение',
      Контрагенты: 'Создать контрагента',
      Сделки: 'Создать сделку',
      Зарплаты: 'Добавить зарплату',
    };
    return titles[catalogName] || 'Создать';
  };

  const handleCreateCatalog = (catalogName: string): void => {
    setOffCanvasState({
      isOpen: true,
      title: getCatalogCreateTitle(catalogName),
      catalogType: catalogName,
      editingData: undefined,
    });
  };

  const handleMenuClick = (
    e: React.MouseEvent<HTMLDivElement>,
    children: NavigationItem[],
    parentName: string
  ): void => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    // Determine if this is a catalog menu (Справочники)
    const isCatalogMenu = parentName === 'Справочники';

    const menuItems: MenuPopoverItem[] = children.map((child) => ({
      name: child.name,
      href: child.href || '/',
      icon: getIcon(child.name),
      createAction: isCatalogMenu
        ? {
            label: getCatalogCreateLabel(child.name),
            onClick: () => handleCreateCatalog(child.name),
          }
        : undefined,
    }));

    setMenuPopoverState({
      isOpen: true,
      items: menuItems,
      position: {
        top: rect.top,
        left: rect.left,
        right: rect.right + 5,
      },
      createAction: undefined,
      activeParentName: parentName,
    });
  };

  const handleCloseMenuPopover = (): void => {
    setMenuPopoverState({
      isOpen: false,
      items: [],
      position: { top: 0, left: 0 },
      createAction: undefined,
      activeParentName: undefined,
    });
  };

  const handleCloseOffCanvas = (): void => {
    setOffCanvasState({
      isOpen: false,
      title: '',
      catalogType: '',
      editingData: undefined,
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
            <UserMenu
              userEmail={user?.email}
              onProfileClick={() => setUserProfileOffCanvasOpen(true)}
            />
          </div>
        </div>
      </header>

      <div className="flex max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-8">
        {/* Sidebar */}
        <aside className="w-48 pr-4">
          <nav className="space-y-1">
            {navigation.map((item) =>
              item.children ? (
                <div key={item.name}>
                  <div
                    onClick={(e) =>
                      handleMenuClick(e, item.children || [], item.name)
                    }
                    className={`group relative flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isPopoverActive(item.name)
                        ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleMenuClick(
                          e as unknown as React.MouseEvent<HTMLDivElement>,
                          item.children || [],
                          item.name
                        );
                      }
                    }}
                  >
                    <button
                      onClick={(e) => handleIconClick(e, item.name)}
                      className="flex-shrink-0 opacity-70 group-hover:opacity-100 hover:bg-gray-200 p-1 rounded transition-all dark:hover:bg-gray-700"
                      title="Изменить иконку"
                    >
                      {renderIcon(item.name)}
                    </button>
                    <span>{item.name}</span>
                    <Icons.ChevronRight
                      size={16}
                      className="ml-auto opacity-50"
                    />
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
        <main className="flex-1 min-w-0 pl-4">{children}</main>
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

      {/* Menu Popover */}
      {menuPopoverState.isOpen && (
        <MenuPopover
          items={menuPopoverState.items}
          onClose={handleCloseMenuPopover}
          anchorPosition={menuPopoverState.position}
          renderIcon={(iconName) => renderIcon(iconName || '')}
          createAction={menuPopoverState.createAction}
          position="right"
        />
      )}

      {/* OffCanvas for Creating */}
      {offCanvasState.isOpen && (
        <OffCanvas
          isOpen={offCanvasState.isOpen}
          onClose={handleCloseOffCanvas}
          title={offCanvasState.title}
        >
          <CatalogFormRenderer
            catalogType={offCanvasState.catalogType}
            onClose={handleCloseOffCanvas}
            editingData={offCanvasState.editingData}
          />
        </OffCanvas>
      )}

      {/* User Profile OffCanvas */}
      {userProfileOffCanvasOpen && (
        <OffCanvas
          isOpen={userProfileOffCanvasOpen}
          onClose={() => setUserProfileOffCanvasOpen(false)}
          title="Мой профиль"
        >
          <UserProfileForm onClose={() => setUserProfileOffCanvasOpen(false)} />
        </OffCanvas>
      )}
    </div>
  );
};
