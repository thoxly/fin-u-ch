import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export const Breadcrumb = ({
  items,
  className = '',
  showHome = false,
}: BreadcrumbProps) => {
  return (
    <nav
      className={`flex items-center space-x-2 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <button
            onClick={items[0]?.onClick}
            className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
            aria-label="На главную"
          >
            <Home size={16} />
          </button>
          <ChevronRight
            size={16}
            className="text-gray-400 dark:text-gray-600"
          />
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = !isLast && item.onClick;

        return (
          <div key={index} className="flex items-center space-x-2">
            {isClickable ? (
              <button
                onClick={item.onClick}
                className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors font-medium hover:underline"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`${
                  isLast
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight
                size={16}
                className="text-gray-400 dark:text-gray-600"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
};
