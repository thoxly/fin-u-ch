import { ReactNode, useState, useMemo } from 'react';
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
import { usePermissions } from '../hooks/usePermissions';
import { CollapsedImportSections } from '../../features/bank-import/CollapsedImportSections';

interface LayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href?: string;
  children?: NavigationItem[];
  disabled?: boolean;
  tooltip?: string;
  // Права доступа для фильтрации
  entity?: string;
  action?: string;
}

// Маппинг названий пунктов меню к сущностям для проверки прав
const getEntityForMenuItem = (
  name: string
): { entity: string; action: string } | null => {
  const mapping: Record<string, { entity: string; action: string }> = {
    Дашборд: { entity: 'reports', action: 'read' },
    Операции: { entity: 'operations', action: 'read' },
    Бюджеты: { entity: 'budgets', action: 'read' },
    Отчеты: { entity: 'reports', action: 'read' },
    ДДС: { entity: 'reports', action: 'read' },
    Справочники: { entity: 'articles', action: 'read' }, // Проверяем хотя бы один справочник
    Статьи: { entity: 'articles', action: 'read' },
    Счета: { entity: 'accounts', action: 'read' },
    Подразделения: { entity: 'departments', action: 'read' },
    Контрагенты: { entity: 'counterparties', action: 'read' },
    Сделки: { entity: 'deals', action: 'read' },
    Зарплаты: { entity: 'salaries', action: 'read' },
    Администрирование: { entity: 'users', action: 'read' },
  };

  return mapping[name] || null;
};

const getBaseNavigation = (): NavigationItem[] => {
  return [
    { name: 'Дашборд', href: '/dashboard', entity: 'reports', action: 'read' },
    {
      name: 'Операции',
      href: '/operations',
      entity: 'operations',
      action: 'read',
    },
    { name: 'Бюджеты', href: '/budgets', entity: 'budgets', action: 'read' },
    {
      name: 'Отчеты',
      entity: 'reports',
      action: 'read',
      children: [
        {
          name: 'ДДС',
          href: '/reports?type=cashflow',
          entity: 'reports',
          action: 'read',
        },
        { name: '🔒ОПиУ', href: '#', disabled: true, tooltip: 'Скоро!' },
      ],
    },
    {
      name: 'Справочники',
      entity: 'articles', // Проверяем хотя бы один справочник
      action: 'read',
      children: [
        {
          name: 'Статьи',
          href: '/catalogs/articles',
          entity: 'articles',
          action: 'read',
        },
        {
          name: 'Счета',
          href: '/catalogs/accounts',
          entity: 'accounts',
          action: 'read',
        },
        {
          name: 'Подразделения',
          href: '/catalogs/departments',
          entity: 'departments',
          action: 'read',
        },
        {
          name: 'Контрагенты',
          href: '/catalogs/counterparties',
          entity: 'counterparties',
          action: 'read',
        },
        {
          name: 'Сделки',
          href: '/catalogs/deals',
          entity: 'deals',
          action: 'read',
        },
        {
          name: 'Зарплаты',
          href: '/catalogs/salaries',
          entity: 'salaries',
          action: 'read',
        },
      ],
    },
  ];
};

export const Layout = ({ children }: LayoutProps): JSX.Element => {
  const location = useLocation();
  const { getIcon, updateIcon } = useNavigationIcons();
  const { data: user } = useGetMeQuery();
  const {
    hasPermission,
    isLoading: permissionsLoading,
    permissions: permissionsMap,
  } = usePermissions();

  // Получаем базовую навигацию
  const baseNavigation = useMemo(() => {
    const nav = getBaseNavigation();

    // Добавляем раздел "Администрирование" только для супер-пользователя
    if (user?.isSuperAdmin) {
      nav.push({
        name: 'Администрирование',
        href: '/admin',
        entity: 'users',
        action: 'read',
      });
    }

    return nav;
  }, [user?.isSuperAdmin]);

  // Фильтруем навигацию по правам
  const navigation = useMemo(() => {
    if (permissionsLoading) {
      return [];
    }

    // Создаём локальную функцию проверки прав на основе permissionsMap
    const checkPermission = (entity: string, action: string): boolean => {
      if (user?.isSuperAdmin) {
        return true;
      }
      const entityPermissions = permissionsMap[entity];
      if (!entityPermissions) {
        return false;
      }
      return entityPermissions.includes(action);
    };

    return baseNavigation
      .map((item) => {
        // Если у элемента есть дочерние элементы, фильтруем их
        if (item.children) {
          const filteredChildren = item.children.filter((child) => {
            if (child.disabled) return true;
            const entityInfo = getEntityForMenuItem(child.name);
            if (!entityInfo) return true;
            return checkPermission(entityInfo.entity, entityInfo.action);
          });

          if (filteredChildren.length > 0 || item.name === 'Справочники') {
            if (item.name === 'Справочники') {
              const hasAnyCatalogAccess =
                checkPermission('articles', 'read') ||
                checkPermission('accounts', 'read') ||
                checkPermission('departments', 'read') ||
                checkPermission('counterparties', 'read') ||
                checkPermission('deals', 'read') ||
                checkPermission('salaries', 'read');

              if (!hasAnyCatalogAccess) {
                return null;
              }
            }

            return {
              ...item,
              children: filteredChildren,
            };
          }
          return null;
        }

        if (item.disabled) return item;
        const entityInfo = getEntityForMenuItem(item.name);
        if (!entityInfo) return item;
        if (checkPermission(entityInfo.entity, entityInfo.action)) {
          return item;
        }
        return null;
      })
      .filter((item): item is NavigationItem => item !== null);
  }, [baseNavigation, permissionsLoading, permissionsMap, user?.isSuperAdmin]);

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
    // Проверяем права на создание перед открытием формы
    const entityInfo = getEntityForMenuItem(catalogName);
    if (entityInfo && !hasPermission(entityInfo.entity, 'create')) {
      // Если нет прав, не открываем форму
      return;
    }

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

    const menuItems: MenuPopoverItem[] = children
      .filter((child) => {
        // Фильтруем элементы по правам
        if (child.disabled) return true; // Оставляем disabled элементы
        const entityInfo = getEntityForMenuItem(child.name);
        if (!entityInfo) return true; // Если нет маппинга, показываем
        return hasPermission(entityInfo.entity, entityInfo.action);
      })
      .map((child) => {
        const entityInfo = getEntityForMenuItem(child.name);
        const hasCreatePermission = entityInfo
          ? hasPermission(entityInfo.entity, 'create')
          : false;

        return {
          name: child.name,
          href: child.href || '/',
          icon: getIcon(child.name),
          createAction:
            isCatalogMenu && hasCreatePermission
              ? {
                  label: getCatalogCreateTitle(child.name),
                  onClick: () => handleCreateCatalog(child.name),
                }
              : undefined,
          disabled: child.disabled,
          tooltip: child.tooltip,
        };
      });

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
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                aria-label="Открыть меню"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Icons.Menu size={22} />
              </button>
              <Link to="/dashboard" className="flex items-center">
                <img
                  src="/images/logo.png"
                  alt="Fin-U-CH"
                  className="h-8 w-auto"
                />
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
        <aside className="hidden lg:block w-56 pr-4 flex-shrink-0">
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
        <main className="flex-1 min-w-0 lg:pl-4">{children}</main>
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

      {/* Mobile navigation OffCanvas */}
      {isMobileNavOpen && (
        <OffCanvas
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          title="Навигация"
        >
          <div className="px-1 py-2">
            <nav className="space-y-1">
              {navigation.map((item) =>
                item.children ? (
                  <div key={item.name} className="">
                    <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 px-2 py-1">
                      {item.name}
                    </div>
                    <div className="ml-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href || '/'}
                          onClick={() => setIsMobileNavOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive(child.href || '/')
                              ? 'bg-primary-100 text-primary-700 font-medium dark:bg-primary-900/30 dark:text-primary-400'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        >
                          {renderIcon(child.name)}
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    to={item.href || '/'}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive(item.href || '/')
                        ? 'bg-primary-100 text-primary-700 font-medium dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {renderIcon(item.name)}
                    <span>{item.name}</span>
                  </Link>
                )
              )}
            </nav>
          </div>
        </OffCanvas>
      )}

      {/* Свернутые секции импорта на всех роутах */}
      <CollapsedImportSections />
    </div>
  );
};
