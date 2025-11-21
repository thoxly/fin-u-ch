import { useState } from 'react';
import { Edit2, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { useTheme } from '../../shared/hooks/useTheme';
import { useGetPreferencesQuery } from '../../store/api/authApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { IconEditorModal } from './IconEditorModal';

export const PersonalSettingsSection = () => {
  const [theme, setTheme] = useTheme();
  const { isLoading } = useGetPreferencesQuery();
  const { showSuccess, showError } = useNotification();
  const [isIconEditorOpen, setIsIconEditorOpen] = useState(false);

  const handleThemeChange = async (newTheme: string) => {
    try {
      await setTheme(newTheme as 'light' | 'dark' | 'system');
    } catch (error) {
      console.error('Ошибка при изменении темы:', error);
      showError('Ошибка при изменении темы');
    }
  };

  const handleIconEditorSave = () => {
    showSuccess('Иконки успешно обновлены');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Тема оформления
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleThemeChange('light')}
            className={`
              flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
              min-w-[80px] h-[80px]
              ${
                theme === 'light'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            title="Светлая"
          >
            <Sun size={24} />
            <span className="text-xs font-medium">Светлая</span>
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`
              flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
              min-w-[80px] h-[80px]
              ${
                theme === 'dark'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            title="Темная"
          >
            <Moon size={24} />
            <span className="text-xs font-medium">Темная</span>
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className={`
              flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
              min-w-[80px] h-[80px]
              ${
                theme === 'system'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            title="Системная"
          >
            <Monitor size={24} />
            <span className="text-xs font-medium">Системная</span>
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Выберите тему оформления интерфейса. Системная тема будет следовать
          настройкам вашей операционной системы.
        </p>
      </div>

      {/* Icon Editing */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Иконки в сайдбаре
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Настройте иконки для элементов навигации по своему вкусу
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsIconEditorOpen(true)}
            icon={<Edit2 size={16} />}
          >
            Редактировать иконки
          </Button>
        </div>
      </div>

      {/* Icon Editor Modal */}
      <IconEditorModal
        isOpen={isIconEditorOpen}
        onClose={() => setIsIconEditorOpen(false)}
        onSave={handleIconEditorSave}
      />
    </div>
  );
};
