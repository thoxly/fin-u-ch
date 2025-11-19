import { ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Tooltip } from './Tooltip';

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
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading,
  emptyMessage = 'Нет данных',
  rowClassName,
  sortKey,
  sortDirection,
  onSort,
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
              const isSortable = column.sortable && onSort;
              const isActiveSortKey = sortKey === column.key;

              return (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={`overflow-visible ${isRulesColumn ? '!text-center' : ''} ${isSortable ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => isSortable && onSort(column.key)}
                >
                  {isRulesColumn ? (
                    <div className="flex justify-center items-center">
                      {column.header}
                    </div>
                  ) : isSortable ? (
                    <div className="flex items-center gap-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group">
                      {column.header}
                      {isActiveSortKey ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp
                            size={16}
                            className="text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110"
                          />
                        ) : (
                          <ArrowDown
                            size={16}
                            className="text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110"
                          />
                        )
                      ) : (
                        <ArrowUpDown
                          size={16}
                          className="text-gray-400 dark:text-gray-600 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-all"
                        />
                      )}
                    </div>
                  ) : (
                    column.header
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
                  const isActionsColumn = column.key === 'actions';
                  const isSelectColumn = column.key === 'select';
                  const shouldEllipsis =
                    !isRulesColumn && !isActionsColumn && !isSelectColumn;

                  const content = column.render
                    ? column.render(item)
                    : String(
                        (item as Record<string, unknown>)[column.key] ?? ''
                      );

                  // Извлекаем текстовый контент для тултипа
                  let textContent = '';
                  if (typeof content === 'string') {
                    textContent = content;
                  } else if (typeof content === 'number') {
                    textContent = String(content);
                  } else if (
                    content &&
                    typeof content === 'object' &&
                    'props' in content
                  ) {
                    // Попытка извлечь текст из React элемента
                    const props = (
                      content as { props?: { children?: unknown } }
                    ).props;
                    if (props && typeof props.children === 'string') {
                      textContent = props.children;
                    }
                  }

                  return (
                    <td
                      key={column.key}
                      className={`${isRulesColumn || isActionsColumn ? 'overflow-visible relative' : ''} ${isRulesColumn ? 'text-center' : ''}`}
                      style={
                        shouldEllipsis
                          ? {
                              maxWidth: '200px',
                            }
                          : undefined
                      }
                    >
                      {shouldEllipsis && textContent ? (
                        <Tooltip content={textContent} delay={100}>
                          <div className="line-clamp-2 overflow-hidden break-words">
                            {content}
                          </div>
                        </Tooltip>
                      ) : (
                        content
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
