import { useEffect, useState } from 'react';
import { FileText, FileCheck, X, Maximize2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../shared/ui/Button';

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

export const CollapsedImportSections = () => {
  const [state, setState] = useState<StoredState | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadState = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsedState: StoredState = JSON.parse(stored);
          const now = Date.now();
          const hoursPassed = (now - parsedState.timestamp) / (1000 * 60 * 60);
          
          // Если прошло больше 24 часов, удаляем состояние
          if (hoursPassed >= EXPIRY_HOURS) {
            localStorage.removeItem(STORAGE_KEY);
            setState(null);
            return;
          }
          
          setState(parsedState);
        } catch (error) {
          console.error('Failed to load collapsed state:', error);
          localStorage.removeItem(STORAGE_KEY);
          setState(null);
        }
      } else {
        setState(null);
      }
    };

    loadState();
    
    // Слушаем изменения в localStorage (для других вкладок)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadState();
      }
    };
    
    // Слушаем кастомное событие для изменений в той же вкладке
    const handleLocalStorageChange = () => {
      loadState();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleLocalStorageChange);
    
    // Проверяем состояние каждую секунду (на случай изменений в той же вкладке)
    const interval = setInterval(loadState, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleLocalStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleExpand = (type: 'history' | 'mapping') => {
    // Обновляем состояние в localStorage, чтобы развернуть секцию
    if (state) {
      const updatedState: StoredState = {
        ...state,
        collapsedHistory: type === 'history' ? false : state.collapsedHistory,
        collapsedMapping: type === 'mapping' ? false : state.collapsedMapping,
        minimized: false,
        activeTab: type === 'history' ? 'history' : 'upload',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
      setState(updatedState);
      // Триггерим кастомное событие для обновления других компонентов
      window.dispatchEvent(new Event('localStorageChange'));
    }
    
    // Сохраняем флаг для открытия модального окна
    sessionStorage.setItem('openImportModal', 'true');
    sessionStorage.setItem('importModalTab', type === 'history' ? 'history' : 'upload');
    
    // Если мы уже на странице операций, просто обновляем страницу
    if (location.pathname === '/operations') {
      window.dispatchEvent(new Event('storage'));
      // Даем время на обновление состояния, затем триггерим событие для открытия модального окна
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      // Переходим на страницу операций
      navigate('/operations');
    }
  };

  const handleClose = (type: 'history' | 'mapping') => {
    if (state) {
      const updatedState: StoredState = {
        ...state,
        collapsedHistory: type === 'history' ? false : state.collapsedHistory,
        collapsedMapping: type === 'mapping' ? false : state.collapsedMapping,
      };
      
      // Если обе секции закрыты, удаляем состояние
      if (!updatedState.collapsedHistory && !updatedState.collapsedMapping && !updatedState.minimized) {
        localStorage.removeItem(STORAGE_KEY);
        setState(null);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
        setState(updatedState);
      }
      // Триггерим кастомное событие для обновления других компонентов
      window.dispatchEvent(new Event('localStorageChange'));
    }
  };

  // Отображаем компонент, если есть свернутые секции
  if (!state) {
    return null;
  }

  // Проверяем, есть ли свернутые секции для отображения
  const hasCollapsedSections = state.collapsedHistory || 
    (state.collapsedMapping && (state.sessionId || state.viewingSessionId));

  if (!hasCollapsedSections) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 space-y-3 flex flex-col items-end">
      {state.collapsedHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-primary-500 dark:border-primary-400 p-4 min-w-[280px] max-w-[320px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary-600 dark:text-primary-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                История импортов
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExpand('history')}
                className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Развернуть"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={() => handleClose('history')}
                className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Закрыть"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            История импортов свернута
          </p>
        </div>
      )}
      
      {state.collapsedMapping && (state.sessionId || state.viewingSessionId) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-primary-500 dark:border-primary-400 p-4 min-w-[280px] max-w-[320px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileCheck size={18} className="text-primary-600 dark:text-primary-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Импортированные операции
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExpand('mapping')}
                className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Развернуть"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={() => handleClose('mapping')}
                className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Закрыть"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Таблица маппинга свернута
          </p>
        </div>
      )}
    </div>
  );
};

