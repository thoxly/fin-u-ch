import React, { useState, useRef, useEffect } from 'react';
import { Download } from 'lucide-react';
import { downloadCsv, ExportRow } from '../lib/exportData';
import { downloadExcelXml } from '../lib/exportExcelXml';
import { usePermissions } from '../hooks/usePermissions';

interface ExportMenuProps {
  filenameBase: string;
  buildRows: () => ExportRow[];
  columns?: string[];
  className?: string;
  entity?: string; // Сущность для проверки прав на экспорт (например, 'reports', 'operations')
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  filenameBase,
  buildRows,
  columns,
  className = '',
  entity = 'reports', // По умолчанию проверяем права на экспорт отчётов
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { canExport } = usePermissions();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleCsv = () => {
    const rows = buildRows();
    downloadCsv(rows, `${filenameBase}.csv`, columns);
    setOpen(false);
  };

  const handleXlsx = () => {
    const rows = buildRows();
    downloadExcelXml(rows, `${filenameBase}.xlsx`, columns);
    setOpen(false);
  };

  // Если нет прав на экспорт, не показываем меню
  if (!canExport(entity)) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
        aria-label="Экспорт"
        title="Экспорт"
      >
        <Download size={16} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-50">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={handleCsv}
          >
            Экспорт CSV
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={handleXlsx}
          >
            Экспорт Excel
          </button>
        </div>
      )}
    </div>
  );
};
