import { useCallback, useMemo, useState } from 'react';

type Operation = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  accountId: string | null;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  article: { id: string; name: string } | null;
};

export type AccountBalancesPoint = {
  date: string;
  label: string;
  operations?: Operation[];
  hasOperations?: boolean;
} & {
  [accountName: string]: string | number | Operation[] | boolean | undefined;
};

export type ExportRow = {
  date: string;
  category: string;
  amount: number;
  type: string;
};

export function useAccountBalancesChart(
  data: AccountBalancesPoint[] | undefined,
  highContrast: boolean
) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    null
  );
  const [hoveredOnce, setHoveredOnce] = useState(false);

  const selectedPoint = useMemo(() => {
    if (selectedPointIndex == null || !data) return null;
    return data[selectedPointIndex] ?? null;
  }, [selectedPointIndex, data]);

  const handleOpenPanel = useCallback((index: number) => {
    setSelectedPointIndex(index);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const accountKeys = useMemo(() => {
    if (!data || data.length === 0) return [] as string[];
    return Object.keys(data[0]).filter(
      (key) =>
        key !== 'date' &&
        key !== 'label' &&
        key !== 'operations' &&
        key !== 'hasOperations'
    );
  }, [data]);

  const accountsWithBalance = useMemo(() => {
    if (!data) return [] as string[];
    return accountKeys.filter((accountKey) =>
      data.some(
        (point) =>
          typeof point[accountKey] === 'number' &&
          (point[accountKey] as number) > 0
      )
    );
  }, [accountKeys, data]);

  const hasData = accountsWithBalance.length > 0;

  const getAccountColor = useCallback(
    (index: number) => {
      const colors = highContrast
        ? ['#1f2937', '#000000', '#065f46', '#7c2d12', '#111827']
        : ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
      return colors[index % colors.length];
    },
    [highContrast]
  );

  const buildExportRows = useCallback((): ExportRow[] => {
    const rows: ExportRow[] = [];
    (data || []).forEach((point) => {
      accountsWithBalance.forEach((accountName) => {
        const value = point[accountName];
        if (typeof value === 'number') {
          rows.push({
            date: point.date || point.label,
            category: accountName,
            amount: value,
            type: 'balance',
          });
        }
      });
    });
    return rows;
  }, [data, accountsWithBalance]);

  return {
    // state
    isPanelOpen,
    selectedPointIndex,
    hoveredOnce,
    // setters/handlers
    setHoveredOnce,
    handleOpenPanel,
    handleClosePanel,
    // derived
    selectedPoint,
    accountsWithBalance,
    hasData,
    getAccountColor,
    buildExportRows,
  } as const;
}
