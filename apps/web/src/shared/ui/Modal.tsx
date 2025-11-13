import { ReactNode, useEffect } from 'react';
import { classNames } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'viewport';
  customSize?: string; // Кастомный размер через className или inline стили
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  customSize,
}: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    viewport: '', // Для viewport используем inline стили
  };

  const modalSizeClass =
    customSize ||
    (size && size !== 'viewport' ? sizeClasses[size] : sizeClasses.md);

  // Для viewport размера используем проценты от экрана
  const modalStyle =
    size === 'viewport'
      ? { width: '95vw', maxWidth: '95vw', maxHeight: '100vh', height: '100vh' }
      : customSize
        ? undefined
        : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={classNames(
          'relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full mx-4',
          modalSizeClass
        )}
        style={modalStyle}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
        <div
          className={classNames(
            'px-6 py-4 overflow-y-auto',
            size === 'viewport'
              ? 'max-h-[calc(100vh-80px)]'
              : 'max-h-[calc(100vh-200px)]'
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
