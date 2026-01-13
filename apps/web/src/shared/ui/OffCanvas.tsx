import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { classNames } from '../lib/utils';

interface OffCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const OffCanvas = ({
  isOpen,
  onClose,
  title,
  children,
}: OffCanvasProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('overflow-hidden');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen, onClose]);

  // Не рендерим ничего, если компонент не открыт, чтобы не засорять DOM
  // Но нам нужна анимация... OffCanvas использует opacity transition.
  // Если мы используем Portal, мы можем рендерить всегда, но управлять видимостью.

  // Для портала нам нужен document.body (доступен в браузере)
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={classNames(
        'fixed inset-0 z-[60] transition-opacity duration-300', // Increased z-index to be above modals (z-50)
        isOpen
          ? 'opacity-100 visible'
          : 'opacity-0 invisible pointer-events-none'
      )}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Оверлей — затемнение фона */}
      <div className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-70" />

      {/* OffCanvas (Drawer) */}
      <div
        className={classNames(
          // Мобильный: 100% ширины
          'absolute top-0 right-0 h-full w-full',
          // Десктоп: фиксированная ширина 400px
          'md:w-[400px] md:max-w-none',
          // Фон и тень — с поддержкой темы
          'bg-white shadow-xl dark:bg-gray-800 dark:shadow-gray-900/50',
          // Общие стили
          'transform transition-transform duration-300 ease-in-out z-[60] flex flex-col'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'offcanvas-title' : undefined}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2
              data-testid="offcanvas-title"
              id="offcanvas-title"
              className="text-xl font-semibold text-gray-900 dark:text-gray-100"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label="Закрыть"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1 text-gray-900 dark:text-gray-100">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
