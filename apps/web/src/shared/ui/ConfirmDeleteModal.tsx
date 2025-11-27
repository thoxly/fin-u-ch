import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'delete' | 'warning' | 'danger';
  isLoading?: boolean;
  description?: ReactNode;
}

export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение удаления',
  message,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  variant = 'delete',
  isLoading = false,
  description,
}: ConfirmDeleteModalProps) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // При ошибке не закрываем модальное окно, чтобы пользователь мог увидеть ошибку
      console.error('Error in confirm action:', error);
    }
  };

  const variantStyles = {
    delete: {
      icon: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      button: 'btn-danger',
    },
    warning: {
      icon: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      button: 'btn-warning',
    },
    danger: {
      icon: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      button: 'btn-danger',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        {/* Icon and Title */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.bg} flex items-center justify-center`}
          >
            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="mb-6 pl-16">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {description}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto ${styles.button}`}
          >
            {isLoading ? 'Обработка...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
