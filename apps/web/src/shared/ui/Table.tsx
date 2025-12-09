import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string | ReactNode;
  render?: (item: T) => ReactNode;
  width?: string;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index?: number) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowClassName?: (item: T) => string;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading,
  emptyMessage = 'Нет данных',
  rowClassName,
  onSort,
  sortKey,
  sortDirection,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-visible">
      <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isRulesColumn = column.key === 'rules';
              return (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={`overflow-visible ${isRulesColumn ? '!text-center' : ''} ${
                    column.sortable
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      : ''
                  }`}
                  onClick={() => column.sortable && onSort?.(column.key)}
                >
                  {isRulesColumn ? (
                    <div className="flex justify-center items-center">
                      {column.header}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {column.header}
                      {sortKey === column.key && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const baseClassName = onRowClick ? 'cursor-pointer' : '';
            const customClassName = rowClassName ? rowClassName(item) : '';
            const className = [baseClassName, customClassName]
              .filter(Boolean)
              .join(' ');

            return (
              <tr
                key={keyExtractor(item, index)}
                onClick={() => onRowClick?.(item)}
                className={className}
              >
                {columns.map((column) => {
                  const isRulesColumn = column.key === 'rules';
                  return (
                    <td
                      key={column.key}
                      className={`overflow-visible relative ${isRulesColumn ? 'text-center' : ''}`}
                    >
                      {column.render
                        ? column.render(item)
                        : String(
                            (item as Record<string, unknown>)[column.key] ?? ''
                          )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
