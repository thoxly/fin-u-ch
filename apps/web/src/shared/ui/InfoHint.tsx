import React, { useState, useRef, useEffect } from 'react';

interface InfoHintProps {
  content: React.ReactNode;
  className?: string;
}

export const InfoHint: React.FC<InfoHintProps> = ({
  content,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 cursor-default select-none text-[11px]"
        aria-label="Подсказка"
      >
        ?
      </span>
      {open && (
        <div className="absolute z-50 top-[130%] right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg px-3 py-2 min-w-[220px] max-w-[280px] text-xs text-gray-700 dark:text-gray-300">
          {content}
        </div>
      )}
    </div>
  );
};
