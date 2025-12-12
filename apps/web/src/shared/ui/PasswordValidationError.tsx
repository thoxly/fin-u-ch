import { AlertCircle } from 'lucide-react';

interface PasswordValidationErrorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordValidationError = ({
  isOpen,
  onClose,
}: PasswordValidationErrorProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Пароль не соответствует требованиям
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Пароль должен содержать минимум 12 символов, включая строчные
                  и заглавные буквы, а также цифры.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              ОК
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
