import React from 'react';
import './TableSkeleton.css';

interface TableSkeletonProps {
  rows?: number; // количество строк (по умолчанию 5)
  columns?: number; // количество колонок (по умолчанию 4)
  showHeader?: boolean; // показывать ли заголовок (по умолчанию true)
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
}) => {
  // Генерируем случайные ширины для колонок (от 20% до 40%)
  const getColumnWidth = (index: number) => {
    const widths = [30, 25, 35, 20, 28, 32, 24, 26]; // Предустановленные ширины
    return widths[index % widths.length];
  };

  // Создаем массив строк
  const renderRows = () => {
    return Array.from({ length: rows }, (_, rowIndex) => (
      <tr
        key={rowIndex}
        className="border-b border-gray-200 dark:border-gray-700"
      >
        {Array.from({ length: columns }, (_, colIndex) => (
          <td key={colIndex} className="px-4 py-3">
            <div
              className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              style={{
                width: `${getColumnWidth(colIndex)}%`,
                animationDelay: `${rowIndex * 0.1}s`,
              }}
            />
          </td>
        ))}
      </tr>
    ));
  };

  // Создаем заголовок
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          {Array.from({ length: columns }, (_, colIndex) => (
            <th key={colIndex} className="px-4 py-3 text-left">
              <div
                className="h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"
                style={{
                  width: `${getColumnWidth(colIndex)}%`,
                  animationDelay: `${colIndex * 0.1}s`,
                }}
              />
            </th>
          ))}
        </tr>
      </thead>
    );
  };

  return (
    <div className="w-full overflow-hidden">
      <table className="w-full border-collapse">
        {renderHeader()}
        <tbody>{renderRows()}</tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;
