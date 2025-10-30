import React from 'react';

type LegendPayloadItem = {
  value: string;
  color: string;
  type?: string;
};

interface ChartLegendProps {
  payload?: LegendPayloadItem[];
  preferredOrder?: string[];
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  payload = [],
  preferredOrder,
}) => {
  const items = React.useMemo(() => {
    if (!preferredOrder || preferredOrder.length === 0) return payload;
    const orderMap = new Map(preferredOrder.map((name, idx) => [name, idx]));
    return [...payload].sort((a, b) => {
      const ai = orderMap.has(a.value)
        ? (orderMap.get(a.value) as number)
        : Number.MAX_SAFE_INTEGER;
      const bi = orderMap.has(b.value)
        ? (orderMap.get(b.value) as number)
        : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }, [payload, preferredOrder]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2">
      {items.map((entry) => (
        <span
          key={entry.value}
          className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 10, height: 10, backgroundColor: entry.color }}
          />
          <span className="align-middle leading-none">{entry.value}</span>
        </span>
      ))}
    </div>
  );
};
