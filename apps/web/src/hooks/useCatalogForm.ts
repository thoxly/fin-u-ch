// packages/shared/src/features/catalog/useCatalogForm.ts
import { useState, useCallback } from 'react';

export interface CatalogItem {
  id?: string;
}

/**
 * Хук для управления состоянием формы справочника (создание/редактирование).
 * Обеспечивает открытие/закрытие формы и хранение редактируемого элемента.
 */
export const useCatalogForm = <T extends CatalogItem>() => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingItem(null);
  }, []);

  return {
    isFormOpen,
    editingItem,
    openCreate,
    openEdit,
    closeForm,
  };
};
