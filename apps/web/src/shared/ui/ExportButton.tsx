import React from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  onClick: () => void;
  className?: string;
  title?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onClick,
  className = '',
  title = 'Экспорт',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 ${className}`}
      aria-label={title}
      title={title}
    >
      <Download size={16} />
    </button>
  );
};
