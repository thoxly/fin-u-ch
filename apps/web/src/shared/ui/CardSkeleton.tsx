import React from 'react';
import './CardSkeleton.css';

interface CardSkeletonProps {
  size?: 'sm' | 'md' | 'lg'; // размер карточки
  lines?: number; // количество строк контента
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({
  size = 'md',
  lines = 3,
}) => {
  // Размеры карточки
  const sizeClasses = {
    sm: 'p-4 max-w-sm',
    md: 'p-6 max-w-md',
    lg: 'p-8 max-w-lg',
  };

  // Размеры заголовка
  const titleSizes = {
    sm: 'h-4 w-3/4',
    md: 'h-5 w-3/4',
    lg: 'h-6 w-3/4',
  };

  // Размеры строк контента
  const lineSizes = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-4',
  };

  // Генерируем случайные ширины для строк контента
  const getLineWidth = (index: number) => {
    const widths = [100, 85, 90, 75, 95, 80, 88, 92]; // Проценты
    return widths[index % widths.length];
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 ${sizeClasses[size]} animate-pulse`}
      data-testid="card-skeleton"
    >
      {/* Заголовок карточки */}
      <div className="mb-4">
        <div
          className={`bg-gray-300 dark:bg-gray-600 rounded ${titleSizes[size]}`}
          style={{ animationDelay: '0.1s' }}
        />
      </div>

      {/* Контент карточки */}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={`line-${index}`}
            className={`bg-gray-200 dark:bg-gray-700 rounded ${lineSizes[size]}`}
            style={{
              width: `${getLineWidth(index)}%`,
              animationDelay: `${(index + 1) * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CardSkeleton;
