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
  const tooltipRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (open && containerRef.current && tooltipRef.current) {
      // Используем requestAnimationFrame, чтобы тултип успел отрендериться
      requestAnimationFrame(() => {
        if (!containerRef.current || !tooltipRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Позиционируем тултип снизу от иконки по умолчанию
        let left = containerRect.left;
        let top = containerRect.bottom + 8;

        // Если тултип выходит справа, позиционируем слева от иконки
        if (left + tooltipRect.width > viewportWidth - 16) {
          left = containerRect.right - tooltipRect.width;
        }

        // Если тултип выходит слева, позиционируем справа от иконки
        if (left < 16) {
          left = containerRect.right + 8;
        }

        // Если тултип выходит снизу, показываем сверху
        if (top + tooltipRect.height > viewportHeight - 16) {
          top = containerRect.top - tooltipRect.height - 8;
        }

        tooltipRef.current.style.left = `${left}px`;
        tooltipRef.current.style.top = `${top}px`;
      });
    }
  }, [open]);

  return (
    <>
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
      </div>
      {open && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl px-4 py-3 min-w-[280px] max-w-[420px] text-xs text-gray-700 dark:text-gray-300 pointer-events-none"
        >
          {content}
        </div>
      )}
    </>
  );
};
