import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  UserCircle,
  Building2,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useGetMeQuery } from '../../store/api/authApi';

interface UserMenuProps {
  userEmail?: string;
}

export const UserMenu = ({ userEmail }: UserMenuProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: user } = useGetMeQuery();
  const { hasPermission, isSuperAdmin } = usePermissions();

  // Проверяем, есть ли у пользователя доступ к администрированию
  const hasAdminAccess =
    hasPermission('users', 'read') ||
    hasPermission('users', 'manage_roles') ||
    hasPermission('audit', 'read');

  // Пункт "Моя компания" доступен только супер-пользователю или администратору
  const canAccessCompany = isSuperAdmin || hasAdminAccess;

  const handleLogout = (): void => {
    dispatch(logout());
    navigate('/login');
  };

  const handleMenuItemClick = (path: string): void => {
    navigate(path);
    setIsOpen(false);
  };
  const handleSupportClick = (): void => {
    const botUsername = 'vect_a_bot';

    // Если пользователь не авторизован — просто открываем бота
    if (!user) {
      window.open(`https://t.me/${botUsername}`, '_blank');
      setIsOpen(false);
      return;
    }

    // ===== Подготовка данных =====

    // user_id — ТОЛЬКО цифры (важно для backend-логики бота)
    const userId = String(user.id ?? '').replace(/\D/g, '');
    // Если по какой-то причине userId пустой — открываем бота без payload
    if (!userId) {
      window.open(`https://t.me/${botUsername}`, '_blank');
      setIsOpen(false);
      return;
    }

    // ===== Формируем payload для /start =====
    // Вставляем явный параметр user_id с id текущего пользователя
    const startPayload = `user_id=${userId}`;

    const telegramUrl = `https://t.me/${botUsername}?start=${encodeURIComponent(startPayload)}`;

    console.log('[Telegram deeplink]', telegramUrl);

    window.open(telegramUrl, '_blank');
    setIsOpen(false);
  };

  //   const handleSupportClick = (): void => {
  //   const botUsername = 'vect_a_bot';

  //   if (!user) {
  //     window.open(`https://t.me/${botUsername}`, '_blank');
  //     setIsOpen(false);
  //     return;
  //   }

  //   const params = new URLSearchParams();

  //   // user_id — только цифры

  //   // company_id — только безопасные символы
  //   const companyId = String(user.companyId || '0')
  //     .replace(/[^a-zA-Z0-9]/g, '');

  //   // company_name — оставляем кириллицу, убираем опасные символы
  //   let companyName = (user.companyName || 'Без компании')
  //     .replace(/[^\p{L}\p{N}\s]/gu, '') // буквы (в т.ч. кириллица), цифры, пробелы
  //     .replace(/\s+/g, ' ')
  //     .trim();

  //   // Ограничение по длине (20 символов кириллицы ≈ безопасно)
  //   companyName = companyName.substring(0, 20);

  //   params.set('cid', companyId);
  //   params.set('cname', companyName);
  // const userId = String(user.id || '')
  //     .replace(/[^0-9]/g, '');
  //   params.set('uid', userId);
  //   const telegramUrl = `https://t.me/${botUsername}?start=${encodeURIComponent(params.toString())}`;
  // // window.open(telegramUrl, '_blank');

  //   console.log('Opening Telegram with deep link:', telegramUrl);
  //   console.log(params.get('uid'), params.get('cid'), params.get('cname'));
  //   window.open(telegramUrl, '_blank');
  //   setIsOpen(false);
  // };

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
      >
        <User size={20} />
        <span className="hidden sm:block">{userEmail || 'Пользователь'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 dark:bg-gray-800 dark:border-gray-700">
          <button
            onClick={() => handleMenuItemClick('/profile')}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <UserCircle size={16} />
            Мой профиль
          </button>
          {canAccessCompany && (
            <button
              onClick={() => handleMenuItemClick('/company')}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Building2 size={16} />
              Моя компания
            </button>
          )}
          <button
            onClick={handleSupportClick}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <HelpCircle size={16} />
            Поддержка
          </button>
          {hasAdminAccess && (
            <>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => handleMenuItemClick('/admin')}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Shield size={16} />
                Администрирование
              </button>
            </>
          )}
          <hr className="my-1 border-gray-200 dark:border-gray-700" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      )}
    </div>
  );
};
