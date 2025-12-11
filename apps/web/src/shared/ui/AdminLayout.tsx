import { ReactNode } from 'react';
import { Layout, NavigationItem } from './Layout';

interface AdminLayoutProps {
  children: ReactNode;
}

const adminNavigation: NavigationItem[] = [
  {
    name: 'Пользователи',
    href: '/admin',
    entity: 'users',
    action: 'read',
  },
  {
    name: 'Роли',
    href: '/admin/roles',
    entity: 'users',
    action: 'manage_roles',
  },
  {
    name: 'Журнал действий',
    href: '/admin/audit',
    entity: 'audit',
    action: 'read',
  },
  {
    name: 'Настройки компании',
    href: '/company',
    entity: 'users', // Access controlled by 'users:read' for now as per CompanySettingsPage logic
    action: 'read',
  },
];

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return <Layout navigationItems={adminNavigation}>{children}</Layout>;
};
