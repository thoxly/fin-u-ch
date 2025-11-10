import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string | ReactNode;
  render?: (item: T) => ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowClassName?: (item: T) => string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading,
  emptyMessage = 'Нет данных',
  rowClassName,
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
    <div className="overflow-x-auto">
      <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
             {columns.map((column) => {
              const isRulesColumn = column.key === 'rules';
              return (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={`overflow-hidden ${isRulesColumn ? '!text-center' : ''}`}
                >
                  {isRulesColumn ? (
                    <div className="flex justify-center items-center">{column.header}</div>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const baseClassName = onRowClick ? 'cursor-pointer' : '';
            const customClassName = rowClassName ? rowClassName(item) : '';
            const className = [baseClassName, customClassName]
              .filter(Boolean)
              .join(' ');

            return (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={className}
              >
                {columns.map((column) => {
                  const isRulesColumn = column.key === 'rules';
                  return (
                    <td 
                      key={column.key} 
                      className={`overflow-hidden ${isRulesColumn ? 'text-center' : ''}`}
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
