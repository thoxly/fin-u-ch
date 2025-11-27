import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface UndoToastProps {
  message: string;
  duration?: number; // Длительность в миллисекундах
  onUndo: () => void;
  onClose: () => void;
  isVisible: boolean;
  anchorPosition?: { top: number; left: number };
}

export const UndoToast = ({
  message,
  duration = 5000,
  onUndo,
  onClose,
  isVisible,
  anchorPosition,
}: UndoToastProps) => {
  const [progress, setProgress] = useState(100);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setProgress(100);
      setIsClosing(false);
      return;
    }

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setProgress((remaining / duration) * 100);

      if (remaining === 0) {
        clearInterval(intervalId);
        handleClose();
      }
    }, 50);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleUndo = () => {
    onUndo();
    handleClose();
  };

  if (!isVisible && !isClosing) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 50,
      }}
      className={`transition-all duration-300 ${
        isVisible && !isClosing
          ? 'translate-y-0 opacity-100'
          : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden min-w-[320px] max-w-md">
        {/* Прогресс-бар */}
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-primary-500 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Содержимое */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex-1 text-sm">{message}</div>

          <button
            onClick={handleUndo}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium transition-colors"
            aria-label="Отменить"
          >
            <RotateCcw size={14} />
            Отменить
          </button>
        </div>
      </div>
    </div>
  );
};
