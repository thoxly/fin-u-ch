import { useState, useCallback, DragEvent, useEffect } from 'react';
import {
  Upload,
  Maximize2,
  X,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { useUploadStatementMutation } from '../../store/api/importsApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { ImportMappingTable } from './ImportMappingTable';
import { ImportHistory } from './ImportHistory';
import { useGetCompanyQuery } from '../../store/api/companiesApi';

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
  collapsedHistory: boolean;
  collapsedMapping: boolean;
  activeTab: 'upload' | 'history';
  viewingSessionId: string | null;
}

type TabType = 'upload' | 'history';

export const BankImportModal = ({ isOpen, onClose }: BankImportModalProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [isViewingMapping, setIsViewingMapping] = useState(false);
  const [showInnInfo, setShowInnInfo] = useState(false);
  const [collapsedHistory, setCollapsedHistory] = useState(false);
  const [collapsedMapping, setCollapsedMapping] = useState(false);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [uploadStatement, { isLoading }] = useUploadStatementMutation();
  const { showSuccess, showError } = useNotification();
  const { data: company } = useGetCompanyQuery();

  // Автоматически разворачиваем информационный блок, если ИНН не указан
  useEffect(() => {
    if (isOpen && !company?.inn) {
      setShowInnInfo(true);
    }
  }, [isOpen, company?.inn]);

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
        if (state.collapsedHistory !== undefined) {
          setCollapsedHistory(state.collapsedHistory);
        }
        if (state.collapsedMapping !== undefined) {
          setCollapsedMapping(state.collapsedMapping);
        }
        if (state.activeTab) {
          setActiveTab(state.activeTab);
        }
        if (state.viewingSessionId) {
          setViewingSessionId(state.viewingSessionId);
        }
      } catch (error) {
        console.error('Failed to load modal state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isOpen, onClose]); // Загружаем только при монтировании

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
          if (state.collapsedHistory !== undefined) {
            setCollapsedHistory(state.collapsedHistory);
          }
          if (state.collapsedMapping !== undefined) {
            setCollapsedMapping(state.collapsedMapping);
          }
          if (state.activeTab) {
            setActiveTab(state.activeTab);
          }
          if (state.viewingSessionId) {
            setViewingSessionId(state.viewingSessionId);
          }
        } catch (error) {
          console.error('Failed to load modal state:', error);
        }
      }

      // Проверяем, нужно ли открыть определенную вкладку
      const tab = sessionStorage.getItem('importModalTab');
      if (tab === 'history' || tab === 'upload') {
        setActiveTab(tab);
        sessionStorage.removeItem('importModalTab');
      }
    }
  }, [isOpen]);

  // Сохраняем состояние в localStorage
  useEffect(() => {
    // Сохраняем состояние, если модальное окно открыто, свернуто, или есть свернутые секции
    if (isOpen || isMinimized || collapsedHistory || collapsedMapping) {
      const state: StoredState = {
        sessionId: isOpen || isMinimized ? sessionId : null,
        minimized: isMinimized,
        timestamp: Date.now(),
        collapsedHistory,
        collapsedMapping,
        activeTab,
        viewingSessionId: isOpen || isMinimized ? viewingSessionId : null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Триггерим кастомное событие для обновления CollapsedImportSections
      window.dispatchEvent(new Event('localStorageChange'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    sessionId,
    isMinimized,
    collapsedHistory,
    collapsedMapping,
    activeTab,
    viewingSessionId,
  ]);

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
      } catch (error: unknown) {
        // RTK Query возвращает ошибку в формате { error: { status, data } }
        // где data это ответ сервера { status: 'error', message: '...' }
        let errorMessage = 'Ошибка при загрузке файла. Проверьте формат файла.';

        if (error && typeof error === 'object' && 'data' in error) {
          const errorData = error.data as
            | { message?: string; error?: string }
            | string;
          // Если data это объект с message
          if (typeof errorData === 'object') {
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } else if (error && typeof error === 'object' && 'error' in error) {
          const nestedError = error.error as { data?: { message?: string } };
          if (nestedError?.data?.message) {
            errorMessage = nestedError.data.message;
          }
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message);
        }

        console.error('Upload error details:', {
          error,
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
    // Если секции были свернуты, сохраняем их состояние
    const shouldKeepState = collapsedHistory || collapsedMapping;

    if (!shouldKeepState) {
      // Если ничего не свернуто, полностью очищаем состояние
      setSessionId(null);
      setIsMinimized(false);
      setIsViewingMapping(false);
      setCollapsedHistory(false);
      setCollapsedMapping(false);
      setViewingSessionId(null);
      clearStoredState();
    } else {
      // Сохраняем состояние свернутых секций
      const state: StoredState = {
        sessionId: null, // Очищаем сессию при закрытии
        minimized: false,
        timestamp: Date.now(),
        collapsedHistory,
        collapsedMapping,
        activeTab,
        viewingSessionId: null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // Триггерим кастомное событие для обновления CollapsedImportSections
      window.dispatchEvent(new Event('localStorageChange'));
    }

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

  // Если файл загружен и есть сессия, или просматривается сессия из истории, показываем таблицу маппинга
  const currentSessionId = sessionId || viewingSessionId;
  if (currentSessionId) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Импортированные операции"
        size="full"
        onMinimize={handleMinimize}
      >
        <div className="p-6">
          <ImportMappingTable
            sessionId={currentSessionId}
            onClose={handleClose}
            isCollapsed={collapsedMapping}
            onCollapseChange={setCollapsedMapping}
          />
        </div>
      </Modal>
    );
  }

  // Иначе показываем вкладки: загрузка или история
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Импорт банковской выписки"
      size={isViewingMapping ? 'full' : 'xl'}
      onMinimize={handleMinimize}
    >
      <div className="p-6 space-y-4">
        {/* Вкладки */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => {
                setActiveTab('upload');
                setIsViewingMapping(false);
              }}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === 'upload'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              Загрузка файла
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setIsViewingMapping(false);
              }}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === 'history'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              История импортов
            </button>
          </nav>
        </div>

        {/* Содержимое вкладок */}
        {activeTab === 'upload' ? (
          <div className="space-y-4">
            {/* Информационный блок про ИНН */}
            <div
              className={`rounded-lg p-4 ${
                !company?.inn
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <button
                onClick={() => setShowInnInfo(!showInnInfo)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Info
                    className={
                      !company?.inn
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }
                    size={20}
                  />
                  <span
                    className={`font-medium ${
                      !company?.inn
                        ? 'text-orange-900 dark:text-orange-100'
                        : 'text-blue-900 dark:text-blue-100'
                    }`}
                  >
                    {!company?.inn
                      ? 'Рекомендуем указать ИНН компании'
                      : 'Автоматическое определение направления операций'}
                  </span>
                </div>
                {showInnInfo ? (
                  <ChevronUp
                    className={
                      !company?.inn
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }
                    size={20}
                  />
                ) : (
                  <ChevronDown
                    className={
                      !company?.inn
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }
                    size={20}
                  />
                )}
              </button>
              {showInnInfo && (
                <div
                  className={`mt-3 text-sm space-y-2 ${
                    !company?.inn
                      ? 'text-orange-800 dark:text-orange-200'
                      : 'text-blue-800 dark:text-blue-200'
                  }`}
                >
                  <p>
                    {!company?.inn
                      ? 'Для автоматического определения направления операций (списание или поступление) рекомендуется указать ИНН компании в настройках. Без ИНН вам потребуется вручную указывать направление для каждой операции.'
                      : 'Для автоматического определения направления операций (списание или поступление) используется ИНН компании из настроек.'}
                  </p>
                  <p>
                    <strong>Как это работает:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      Если в платежном поручении в строке{' '}
                      <strong>Плательщик</strong> указан ИНН вашей компании,
                      система автоматически определит операцию как{' '}
                      <strong>Списание</strong>.
                    </li>
                    <li>
                      Если в строке <strong>Получатель</strong> указан ИНН вашей
                      компании, система автоматически определит операцию как{' '}
                      <strong>Поступление</strong>.
                    </li>
                  </ul>
                  {!company?.inn && (
                    <p className="mt-2 font-medium text-orange-700 dark:text-orange-300">
                      💡 Перейдите в настройки профиля, чтобы добавить ИНН и
                      упростить импорт выписок.
                    </p>
                  )}
                </div>
              )}
            </div>
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
        ) : (
          <ImportHistory
            onClose={handleClose}
            onViewingChange={(isViewing) => {
              setIsViewingMapping(isViewing);
            }}
            isCollapsed={collapsedHistory}
            onCollapseChange={setCollapsedHistory}
            onViewSession={(sessionId) => {
              setViewingSessionId(sessionId);
              setIsViewingMapping(true);
            }}
            viewingSessionId={viewingSessionId}
          />
        )}
      </div>
    </Modal>
  );
};
