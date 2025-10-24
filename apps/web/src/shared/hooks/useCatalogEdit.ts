import { useState } from 'react';

interface CatalogEditState {
  isOpen: boolean;
  title: string;
  catalogType: string;
  editingData?: unknown;
}

export const useCatalogEdit = () => {
  const [editState, setEditState] = useState<CatalogEditState>({
    isOpen: false,
    title: '',
    catalogType: '',
    editingData: undefined,
  });

  const openEdit = (catalogName: string, data: unknown) => {
    setEditState({
      isOpen: true,
      title: `Редактировать ${catalogName.toLowerCase()}`,
      catalogType: catalogName,
      editingData: data,
    });
  };

  const closeEdit = () => {
    setEditState({
      isOpen: false,
      title: '',
      catalogType: '',
      editingData: undefined,
    });
  };

  return {
    editState,
    openEdit,
    closeEdit,
  };
};
