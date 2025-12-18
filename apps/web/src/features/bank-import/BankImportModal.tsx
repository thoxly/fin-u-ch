import { useState, useCallback, DragEvent, useEffect } from 'react';
import {
  Upload,
  Maximize2,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
} from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Breadcrumb, BreadcrumbItem } from '../../shared/ui/Breadcrumb';
import { FadeTransition } from '../../shared/ui/FadeTransition';
import { useUploadStatementMutation } from '../../store/api/importsApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { ImportMappingTable } from './ImportMappingTable';
import { ImportHistory } from './ImportHistory';
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
} from '../../store/api/companiesApi';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';

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
  viewingSessionId: string | null;
  collapsedHistory: boolean;
  collapsedMapping: boolean;
}

// Навигационные уровни
type NavigationLevel = 'main' | 'session-details';

export const BankImportModal = ({ isOpen, onClose }: BankImportModalProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showInnInfo, setShowInnInfo] = useState(false);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [navigationLevel, setNavigationLevel] =
    useState<NavigationLevel>('main');
  const [sessionFileName, setSessionFileName] = useState<string | null>(null);
  const [companyAccountNumber, setCompanyAccountNumber] = useState<
    string | null
  >(null);
  const [isMinimizing, setIsMinimizing] = useState(false); // Флаг для предотвращения перезаписи при сворачивании
  const [innValue, setInnValue] = useState('');
  const [uploadStatement, { isLoading }] = useUploadStatementMutation();
  const [updateCompany, { isLoading: isUpdatingInn }] =
    useUpdateCompanyMutation();
  const { showSuccess, showError } = useNotification();
  const { data: company } = useGetCompanyQuery();

  // Автоматически разворачиваем информационный блок, если ИНН не указан
  useEffect(() => {
    if (isOpen && !company?.inn) {
      setShowInnInfo(true);
    }
  }, [isOpen, company?.inn]);

  // Обработчик сохранения ИНН
  const handleSaveInn = async () => {
    if (!innValue.trim()) {
      showError('Введите ИНН');
      return;
    }

    // Базовая валидация ИНН (10 или 12 цифр)
    const innDigits = innValue.trim().replace(/\D/g, '');
    if (innDigits.length !== 10 && innDigits.length !== 12) {
      showError(
        'ИНН должен содержать 10 (для юридических лиц) или 12 (для индивидуальных предпринимателей) цифр'
      );
      return;
    }

    try {
      await updateCompany({
        inn: innDigits,
      }).unwrap();
      showSuccess('ИНН успешно сохранён');
      setInnValue('');
    } catch (error) {
      console.error('Ошибка при сохранении ИНН:', error);
      showError('Ошибка при сохранении ИНН');
    }
  };

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
        if (state.viewingSessionId) {
          setViewingSessionId(state.viewingSessionId);
        }
      } catch (error) {
        console.error('Failed to load modal state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []); // Загружаем только при монтировании

  // Обновляем состояние при изменении isOpen
  useEffect(() => {
    if (isOpen) {
      // Сбрасываем флаг минимизации при открытии
      setIsMinimizing(false);

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const state: StoredState = JSON.parse(stored);

          console.log('📂 Восстанавливаем состояние модального окна:', state);

          // Восстанавливаем sessionId и viewingSessionId
          if (state.sessionId) {
            setSessionId(state.sessionId);
          }
          if (state.viewingSessionId) {
            setViewingSessionId(state.viewingSessionId);
          }

          setIsMinimized(state.minimized);

          // ВАЖНО: восстанавливаем navigationLevel на основе состояния
          // Если была свернута таблица маппинга, восстанавливаем её
          if (
            state.collapsedMapping &&
            (state.sessionId || state.viewingSessionId)
          ) {
            console.log('🔄 Восстанавливаем navigationLevel в session-details');
            setNavigationLevel('session-details');
          } else {
            setNavigationLevel('main');
          }
        } catch (error) {
          console.error('Failed to load modal state:', error);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Сохраняем состояние в localStorage только когда модальное окно открыто
  useEffect(() => {
    // Не сохраняем состояние, если идет процесс сворачивания или окно закрыто/свернуто
    if (isMinimizing || !isOpen || isMinimized) {
      return;
    }

    // Сохраняем состояние только если модальное окно открыто (не свернуто)
    // Когда окно свернуто, состояние уже сохранено в handleMinimize
    const state: StoredState = {
      sessionId,
      minimized: false,
      timestamp: Date.now(),
      viewingSessionId,
      collapsedHistory: false, // Когда модальное окно открыто, секции не свернуты
      collapsedMapping: false,
    };
    console.log('💾 Автосохранение состояния (окно открыто):', state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Триггерим кастомное событие для обновления CollapsedImportSections
    window.dispatchEvent(new Event('localStorageChange'));
  }, [isOpen, sessionId, isMinimized, viewingSessionId, isMinimizing]);

  // Очищаем localStorage при закрытии
  const clearStoredState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    // Триггерим кастомное событие для обновления CollapsedImportSections
    window.dispatchEvent(new Event('localStorageChange'));
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
        const formData: FormData = new FormData();
        formData.append('file', file);

        const result = await uploadStatement(formData).unwrap();
        setSessionId(result.sessionId);
        setSessionFileName(file.name);
        setCompanyAccountNumber(result.companyAccountNumber || null);
        setNavigationLevel('session-details');

        // Формируем сообщение с учетом дубликатов и статистики парсинга
        let message = `Файл загружен. Найдено операций: ${result.importedCount}`;
        if (result.duplicatesCount > 0) {
          message += `. Обнаружено дубликатов: ${result.duplicatesCount}`;
        }

        // Добавляем статистику парсинга, если доступна
        if (result.parseStats) {
          const stats = result.parseStats;
          if (stats.documentsStarted > result.importedCount) {
            message += `\n\nВнимание: В файле найдено ${stats.documentsStarted} документов, но обработано только ${result.importedCount}:`;
            if (stats.documentsSkipped > 0) {
              message += `\n• Пропущено (неподдерживаемый тип): ${stats.documentsSkipped}`;
              if (stats.documentTypesFound.length > 0) {
                message += ` (типы: ${stats.documentTypesFound.join(', ')})`;
              }
            }
            if (stats.documentsInvalid > 0) {
              message += `\n• Невалидных (нет даты или суммы): ${stats.documentsInvalid}`;
            }
          }
        }

        showSuccess(message);

        // Сбрасываем прогресс через небольшую задержку
        setTimeout(() => setUploadProgress(null), 2000);
      } catch (error: unknown) {
        // RTK Query возвращает ошибку в формате { error: { status, data } }
        // где data это ответ сервера { status: 'error', message: '...' }
        let errorMessage = 'Ошибка при загрузке файла. Проверьте формат файла.';

        if (error && typeof error === 'object') {
          if ('data' in error) {
            const errorData = (error as { data?: unknown }).data;
            // Если data это объект с message
            if (errorData && typeof errorData === 'object') {
              if (
                'message' in errorData &&
                typeof errorData.message === 'string'
              ) {
                errorMessage = errorData.message;
              } else if (
                'error' in errorData &&
                typeof errorData.error === 'string'
              ) {
                errorMessage = errorData.error;
              }
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            }
          } else if ('error' in error) {
            const nestedError = (
              error as { error?: { data?: { message?: string } } }
            ).error;
            if (nestedError?.data?.message) {
              errorMessage = nestedError.data.message;
            }
          } else if (
            'message' in error &&
            typeof (error as { message: unknown }).message === 'string'
          ) {
            errorMessage = (error as { message: string }).message;
          }
        }

        console.error('Upload error details:', {
          error,
          status: (error as { status?: unknown })?.status,
          data: (error as { data?: unknown })?.data,
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

  // Навигация назад к главному экрану
  const handleBackToMain = useCallback(() => {
    setNavigationLevel('main');
    setViewingSessionId(null);
    setSessionId(null);
    setSessionFileName(null);
    setCompanyAccountNumber(null);
  }, []);

  // Просмотр сессии из истории
  const handleViewSession = useCallback(
    (sessionId: string, fileName?: string) => {
      setViewingSessionId(sessionId);
      setSessionFileName(fileName || null);
      setNavigationLevel('session-details');
    },
    []
  );

  const handleClose = () => {
    // Полностью очищаем состояние
    setSessionId(null);
    setIsMinimized(false);
    setViewingSessionId(null);
    setNavigationLevel('main');
    setSessionFileName(null);
    setCompanyAccountNumber(null);
    clearStoredState();
    onClose();
  };

  const handleMinimize = () => {
    // Устанавливаем флаг, чтобы предотвратить перезапись в эффекте
    setIsMinimizing(true);

    // Определяем, какую секцию нужно свернуть
    // Приоритет: таблица маппинга > история > загрузка

    // Если мы на экране деталей сессии (таблица маппинга), сворачиваем ТОЛЬКО её
    const collapsedMapping =
      navigationLevel === 'session-details' &&
      (sessionId !== null || viewingSessionId !== null);

    // Если мы НЕ на экране маппинга, сворачиваем историю
    const collapsedHistory = !collapsedMapping;

    // Сохраняем состояние в localStorage перед закрытием модального окна
    const state: StoredState = {
      sessionId,
      minimized: true,
      timestamp: Date.now(),
      viewingSessionId,
      collapsedHistory,
      collapsedMapping,
    };

    console.log('💾 Сворачиваем окно импорта:', {
      navigationLevel,
      sessionId,
      viewingSessionId,
      collapsedHistory,
      collapsedMapping,
      state,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Триггерим кастомное событие для обновления CollapsedImportSections
    window.dispatchEvent(new Event('localStorageChange'));

    // Закрываем модальное окно
    onClose();

    // Сбрасываем флаг после небольшой задержки
    setTimeout(() => {
      setIsMinimizing(false);
    }, 100);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
  };

  // Генерация breadcrumbs на основе текущего уровня навигации
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [];

    if (navigationLevel === 'main') {
      breadcrumbs.push({
        label: 'Импорт банковской выписки',
        isActive: true,
      });
    } else if (navigationLevel === 'session-details') {
      breadcrumbs.push({
        label: 'Импорт банковской выписки',
        onClick: handleBackToMain,
      });
      breadcrumbs.push({
        label: sessionFileName
          ? `Операции: ${sessionFileName}`
          : 'Импортированные операции',
        isActive: true,
      });
    }

    return breadcrumbs;
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
              disabled={isLoading}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2
              className="text-primary-600 dark:text-primary-400 animate-spin"
              size={16}
            />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Загрузка выписки...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Это может занять несколько минут
              </p>
            </div>
          </div>
        ) : sessionId ? (
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

  // Получаем breadcrumbs для текущего состояния
  const breadcrumbs = getBreadcrumbs();
  const currentSessionId = sessionId || viewingSessionId;
  const modalSize = navigationLevel === 'session-details' ? 'full' : 'xl';
  const modalTitle =
    navigationLevel === 'session-details'
      ? 'Импортированные операции'
      : 'Импорт банковской выписки';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size={modalSize}
      onMinimize={handleMinimize}
    >
      <div className="p-6 space-y-4">
        {/* Breadcrumb навигация - показываем только на уровне session-details */}
        {navigationLevel === 'session-details' && breadcrumbs.length > 0 && (
          <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}

        {/* Контент с плавными переходами */}
        <FadeTransition show={navigationLevel === 'session-details'}>
          {navigationLevel === 'session-details' && currentSessionId && (
            <ImportMappingTable
              sessionId={currentSessionId}
              companyAccountNumber={companyAccountNumber}
              onClose={handleBackToMain}
              onImportSuccess={handleClose}
            />
          )}
        </FadeTransition>

        <FadeTransition show={navigationLevel === 'main'}>
          {navigationLevel === 'main' && (
            <div className="space-y-6">
              {/* Секция загрузки файла */}
              <div className="space-y-4 relative">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Загрузка файла
                </h3>

                {/* Индикатор загрузки */}
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2
                          className="animate-spin text-primary-600 dark:text-primary-400"
                          size={48}
                        />
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Загрузка выписки...
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Пожалуйста, подождите. Обработка большой выписки
                            может занять несколько минут.
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Вы можете свернуть это окно, загрузка продолжится в
                            фоновом режиме.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                          : 'Как система понимает, деньги пришли или ушли'}
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
                          ? 'Укажите ИНН компании в настройках — так система сама будет определять, это поступление или списание денег. Без ИНН придётся выбирать вручную для каждой операции.'
                          : 'Система смотрит на ваш ИНН в платёжке и сама понимает, это поступление или списание.'}
                      </p>
                      <p>
                        <strong>Как это работает:</strong>
                      </p>
                      <ul className="space-y-2 ml-2">
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 font-bold mt-0.5">
                            ↗
                          </span>
                          <span>
                            Ваш ИНН в поле <strong>"Плательщик"</strong> → это{' '}
                            <strong>списание</strong> (деньги ушли)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 font-bold mt-0.5">
                            ↙
                          </span>
                          <span>
                            Ваш ИНН в поле <strong>"Получатель"</strong> → это{' '}
                            <strong>поступление</strong> (деньги пришли)
                          </span>
                        </li>
                      </ul>
                      {!company?.inn && (
                        <div className="mt-4 space-y-2">
                          <p className="font-medium text-orange-700 dark:text-orange-300">
                            💡 Добавьте ИНН прямо сейчас:
                          </p>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={innValue}
                              onChange={(e) => setInnValue(e.target.value)}
                              placeholder="Введите ИНН (10 или 12 цифр)"
                              className="flex-1"
                              disabled={isUpdatingInn}
                              maxLength={12}
                            />
                            <Button
                              onClick={handleSaveInn}
                              disabled={isUpdatingInn || !innValue.trim()}
                              variant="primary"
                              className="whitespace-nowrap"
                            >
                              {isUpdatingInn ? (
                                <>
                                  <Loader2
                                    size={16}
                                    className="animate-spin mr-2"
                                  />
                                  Сохранение...
                                </>
                              ) : (
                                <>
                                  <Save size={16} className="mr-2" />
                                  Сохранить
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <label
                  className={`block ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <div
                    onDragOver={isLoading ? undefined : handleDragOver}
                    onDragLeave={isLoading ? undefined : handleDragLeave}
                    onDrop={isLoading ? undefined : handleDrop}
                    className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${
                    isLoading
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-50'
                      : isDragging
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                  }
                `}
                  >
                    <Upload
                      className={`mx-auto mb-4 ${
                        isLoading
                          ? 'text-gray-300 dark:text-gray-600'
                          : isDragging
                            ? 'text-primary-500'
                            : 'text-gray-400'
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

              {/* Разделитель */}
              <div className="border-t border-gray-200 dark:border-gray-700"></div>

              {/* Секция истории импортов */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  История импортов
                </h3>
                <ImportHistory
                  onClose={handleClose}
                  onViewingChange={() => {}}
                  onViewSession={handleViewSession}
                  viewingSessionId={null}
                  hideHeader={true}
                />
              </div>
            </div>
          )}
        </FadeTransition>
      </div>
    </Modal>
  );
};
