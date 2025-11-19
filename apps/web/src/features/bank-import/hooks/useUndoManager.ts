import { useState, useCallback, useRef, useEffect } from 'react';
import { useUpdateImportedOperationMutation } from '../../../store/api/importsApi';

interface UndoState {
  operationId?: string;
  operationIds?: string[];
  previousState?: Record<string, unknown>;
  previousStates?: Array<{ id: string; state: Record<string, unknown> }>;
  description: string;
  sessionId?: string;
  anchorPosition?: { top: number; left: number };
  isBulk: boolean;
}

interface UseUndoManagerOptions {
  timeout?: number; // Время в миллисекундах, по умолчанию 5000 (5 секунд)
  onUndo?: () => void;
  onTimeout?: () => void;
  sessionId?: string;
}

export const useUndoManager = (options: UseUndoManagerOptions = {}) => {
  const { timeout = 5000, onUndo, onTimeout, sessionId } = options;

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
   * Регистрирует изменение для возможности отмены (одна операция)
   */
  const registerChange = useCallback(
    (
      operationId: string,
      previousState: Record<string, unknown>,
      description: string,
      anchorPosition?: { top: number; left: number }
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
        anchorPosition,
        isBulk: false,
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
   * Регистрирует изменение для возможности отмены (несколько операций)
   */
  const registerBulkChange = useCallback(
    (
      operationIds: string[],
      previousStates: Array<{ id: string; state: Record<string, unknown> }>,
      description: string,
      anchorPosition?: { top: number; left: number }
    ) => {
      // Очищаем предыдущий таймер
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Устанавливаем новое состояние undo для массовой операции
      setUndoState({
        operationIds,
        previousStates,
        description,
        sessionId,
        anchorPosition,
        isBulk: true,
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
    [timeout, onTimeout, sessionId]
  );

  /**
   * Отменяет последнее изменение
   */
  const undo = useCallback(async () => {
    if (!undoState) {
      return false;
    }

    try {
      if (undoState.isBulk) {
        // Массовая отмена
        if (
          !undoState.operationIds ||
          !undoState.previousStates ||
          !undoState.sessionId
        ) {
          console.error('Invalid bulk undo state');
          return false;
        }

        // Откатываем каждую операцию индивидуально
        // Это безопаснее чем использовать bulkUpdate, т.к. мы восстанавливаем точные предыдущие состояния
        const promises = undoState.previousStates.map(({ id, state }) =>
          updateOperation({
            id,
            data: state,
          }).unwrap()
        );

        await Promise.all(promises);
      } else {
        // Одиночная отмена
        if (!undoState.operationId || !undoState.previousState) {
          console.error('Invalid undo state');
          return false;
        }

        await updateOperation({
          id: undoState.operationId,
          data: undoState.previousState,
        }).unwrap();
      }

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
    undoAnchorPosition: undoState?.anchorPosition,
    registerChange,
    registerBulkChange,
    undo,
    cancelUndo,
  };
};
