import { useState, useCallback } from 'react';

/**
 * Hook for managing bulk selection of items
 * @param initialSelectedIds - Initial array of selected IDs
 * @returns Object with selectedIds, toggleSelectOne, toggleSelectAll, clearSelection, and isSelected
 */
export const useBulkSelection = <T extends string = string>(
  initialSelectedIds: T[] = []
) => {
  const [selectedIds, setSelectedIds] = useState<T[]>(initialSelectedIds);

  const toggleSelectOne = useCallback((id: T) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(
    (allIds: T[]) => {
      const allSelected = allIds.every((id) => selectedIds.includes(id));
      if (allSelected) {
        setSelectedIds((prev) => prev.filter((id) => !allIds.includes(id)));
      } else {
        setSelectedIds((prev) => [
          ...prev,
          ...allIds.filter((id) => !prev.includes(id)),
        ]);
      }
    },
    [selectedIds]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isSelected = useCallback(
    (id: T) => selectedIds.includes(id),
    [selectedIds]
  );

  return {
    selectedIds,
    toggleSelectOne,
    toggleSelectAll,
    clearSelection,
    isSelected,
    setSelectedIds,
  };
};
