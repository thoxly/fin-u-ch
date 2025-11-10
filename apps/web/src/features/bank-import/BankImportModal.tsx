import { useState, useCallback, DragEvent, useEffect } from 'react';
import { Upload, Minimize2, Maximize2, X } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { useUploadStatementMutation } from '../../store/api/importsApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { ImportMappingTable } from './ImportMappingTable';

interface BankImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'bankImportModal_state';
const EXPIRY_HOURS = 24;

interface StoredState {
  sessionId: string | null;
  minimized: boolean;
  timestamp: number;
}

export const BankImportModal = ({ isOpen, onClose }: BankImportModalProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatement, { isLoading }] = useUploadStatementMutation();
  const { showSuccess, showError } = useNotification();

  // Загружаем состояние из localStorage при монтировании и проверяем срок действия
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state: StoredState = JSON.parse(stored);
        const now = Date.now();
        const hoursPassed = (now - state.timestamp) / (1000 * 60 * 60);
        
        // Если прошло больше 24 часов, закрываем окно и удаляем сохраненное состояние
        if (hoursPassed >= EXPIRY_HOURS) {
          localStorage.removeItem(STORAGE_KEY);
          setSessionId(null);
          setIsMinimized(false);
          if (isOpen) {
            onClose();
          }
          return;
        }
        
        // Восстанавливаем состояние
        if (state.sessionId) {
          setSessionId(state.sessionId);
        }
        setIsMinimized(state.minimized);
      } catch (error) {
        console.error('Failed to load modal state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []); // Загружаем только при монтировании

  // Обновляем состояние при изменении isOpen
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const state: StoredState = JSON.parse(stored);
          if (state.sessionId) {
            setSessionId(state.sessionId);
          }
          setIsMinimized(state.minimized);
        } catch (error) {
          console.error('Failed to load modal state:', error);
        }
      }
    }
  }, [isOpen]);

  // Сохраняем состояние в localStorage
  useEffect(() => {
    if (isOpen) {
      const state: StoredState = {
        sessionId,
        minimized: isMinimized,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [isOpen, sessionId, isMinimized]);

  // Очищаем localStorage при закрытии
  const clearStoredState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Проверка типа файла
      if (!file.name.endsWith('.txt')) {
        showError('Файл должен иметь расширение .txt');
        return;
      }

      // Проверка размера (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError('Размер файла не должен превышать 10MB');
        return;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadStatement(formData).unwrap();
        setSessionId(result.sessionId);
        showSuccess(`Файл загружен. Найдено операций: ${result.importedCount}`);
      } catch (error: any) {
        // RTK Query возвращает ошибку в формате { error: { status, data } }
        // где data это ответ сервера { status: 'error', message: '...' }
        let errorMessage = 'Ошибка при загрузке файла. Проверьте формат файла.';
        
        if (error?.data) {
          // Если data это объект с message
          if (error.data.message) {
            errorMessage = error.data.message;
          } else if (error.data.error) {
            errorMessage = error.data.error;
          } else if (typeof error.data === 'string') {
            errorMessage = error.data;
          }
        } else if (error?.error?.data?.message) {
          errorMessage = error.error.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        console.error('Upload error details:', {
          error,
          status: error?.status,
          data: error?.data,
          fullError: JSON.stringify(error, null, 2),
        });
        showError(errorMessage);
      }
    },
    [uploadStatement, showSuccess, showError]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleClose = () => {
    setSessionId(null);
    setIsMinimized(false);
    clearStoredState();
    onClose();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
  };

  // Если модальное окно закрыто и не свернуто, не показываем ничего
  if (!isOpen && !isMinimized) {
    return null;
  }

  // Если свернуто, показываем минимизированную версию в углу
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-primary-500 dark:border-primary-400 p-4 min-w-[280px] max-w-[320px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Импорт выписки
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMaximize}
              className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Развернуть"
            >
              <Maximize2 size={18} />
            </button>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {sessionId ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full relative"></div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Сессия активна
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Загрузите файл для импорта
          </p>
        )}
      </div>
    );
  }

  // Если файл загружен и есть сессия, показываем таблицу маппинга
  if (sessionId) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Импортированные операции"
        size="full"
        onMinimize={handleMinimize}
      >
        <ImportMappingTable sessionId={sessionId} onClose={handleClose} />
      </Modal>
    );
  }

  // Иначе показываем форму загрузки
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Импорт банковской выписки"
      size="lg"
      onMinimize={handleMinimize}
    >
      <div className="space-y-4">
        <label className="block cursor-pointer">
          <input
            type="file"
            accept=".txt"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${
                isDragging
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
              }
            `}
          >
            <Upload
              className={`mx-auto mb-4 ${
                isDragging ? 'text-primary-500' : 'text-gray-400'
              }`}
              size={48}
            />
            <p className="text-lg font-medium mb-2">
              Перетащите файл сюда или кликните для выбора
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Поддерживаются файлы .txt до 10MB
            </p>
          </div>
        </label>
      </div>
    </Modal>
  );
};

