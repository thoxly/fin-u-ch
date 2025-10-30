import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';

interface UserMenuProps {
  userEmail?: string;
  onProfileClick: () => void;
}

export const UserMenu = ({
  userEmail,
  onProfileClick,
}: UserMenuProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    dispatch(logout());
    navigate('/login');
  };

  const handleProfileClick = (): void => {
    onProfileClick();
    setIsOpen(false);
  };

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
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 dark:bg-gray-800 dark:border-gray-700">
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Settings size={16} />
            Мой профиль
          </button>
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
