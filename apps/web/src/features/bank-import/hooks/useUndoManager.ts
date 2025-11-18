import { useState, useCallback, useRef, useEffect } from 'react';
import { useUpdateImportedOperationMutation } from '../../../store/api/importsApi';

interface UndoState {
  operationId: string;
  previousState: Record<string, unknown>;
  description: string;
}

interface UseUndoManagerOptions {
  timeout?: number; // Время в миллисекундах, по умолчанию 5000 (5 секунд)
  onUndo?: () => void;
  onTimeout?: () => void;
}

export const useUndoManager = (options: UseUndoManagerOptions = {}) => {
  const { timeout = 5000, onUndo, onTimeout } = options;

  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [isUndoAvailable, setIsUndoAvailable] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [updateOperation] = useUpdateImportedOperationMutation();

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Регистрирует изменение для возможности отмены
   */
  const registerChange = useCallback(
    (
      operationId: string,
      previousState: Record<string, unknown>,
      description: string
    ) => {
      // Очищаем предыдущий таймер
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Устанавливаем новое состояние undo
      setUndoState({
        operationId,
        previousState,
        description,
      });
      setIsUndoAvailable(true);

      // Запускаем таймер на автоматическое удаление возможности отмены
      timeoutRef.current = setTimeout(() => {
        setUndoState(null);
        setIsUndoAvailable(false);
        if (onTimeout) {
          onTimeout();
        }
      }, timeout);
    },
    [timeout, onTimeout]
  );

  /**
   * Отменяет последнее изменение
   */
  const undo = useCallback(async () => {
    if (!undoState) {
      return false;
    }

    try {
      // Откатываем изменение через API
      await updateOperation({
        id: undoState.operationId,
        data: undoState.previousState,
      }).unwrap();

      // Очищаем состояние undo
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setUndoState(null);
      setIsUndoAvailable(false);

      if (onUndo) {
        onUndo();
      }

      return true;
    } catch (error) {
      console.error('Failed to undo operation:', error);
      return false;
    }
  }, [undoState, updateOperation, onUndo]);

  /**
   * Отменяет возможность отмены (например, если пользователь сделал другое действие)
   */
  const cancelUndo = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setUndoState(null);
    setIsUndoAvailable(false);
  }, []);

  return {
    isUndoAvailable,
    undoDescription: undoState?.description || '',
    registerChange,
    undo,
    cancelUndo,
  };
};
