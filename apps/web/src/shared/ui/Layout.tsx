import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
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

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="text-xl font-bold text-primary-600"
              >
                Fin-U-CH
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 transition-colors"
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
                  <div className="text-sm font-medium text-gray-500 px-3 py-2">
                    {item.name}
                  </div>
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive(child.href)
                            ? 'bg-primary-100 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              )
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
