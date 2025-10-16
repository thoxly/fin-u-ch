import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

export interface MenuPopoverItem {
  name: string;
  href: string;
  icon?: string;
  createAction?: {
    label: string;
    onClick: () => void;
  };
}

export interface MenuPopoverAction {
  label: string;
  icon?: string;
  onClick: () => void;
}

interface MenuPopoverProps {
  items: MenuPopoverItem[];
  onClose: () => void;
  anchorPosition: { top: number; left: number; right?: number };
  renderIcon?: (iconName?: string) => JSX.Element;
  className?: string;
  createAction?: MenuPopoverAction;
  position?: 'left' | 'right';
}

export const MenuPopover = ({
  items,
  onClose,
  anchorPosition,
  renderIcon,
  className = '',
  createAction,
  position = 'left',
}: MenuPopoverProps): JSX.Element => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const defaultRenderIcon = (iconName?: string): JSX.Element => {
    if (!iconName) {
      return <></>;
    }
    const IconComponent = Icons[iconName as keyof typeof Icons] as
      | Icons.LucideIcon
      | undefined;
    if (!IconComponent) {
      return <></>;
    }
    return <IconComponent size={16} />;
  };

  const iconRenderer = renderIcon || defaultRenderIcon;

  const offset = 8; // Offset to make popover feel "attached" to trigger element
  const positionStyle =
    position === 'right' && anchorPosition.right !== undefined
      ? {
          top: `${anchorPosition.top + offset}px`,
          left: `${anchorPosition.right}px`,
        }
      : {
          top: `${anchorPosition.top + offset}px`,
          left: `${anchorPosition.left}px`,
        };

  return (
    <div
      ref={popoverRef}
      className={`fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[200px] dark:bg-[#1E1E2A] dark:border-gray-700 ${className}`}
      style={positionStyle}
      role="menu"
      aria-orientation="vertical"
    >
      <div className="py-1">
        {items.map((item) => (
          <div key={item.href} className="relative group">
            <Link
              to={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700/50 pr-10"
              role="menuitem"
            >
              {item.icon && (
                <span className="flex-shrink-0">{iconRenderer(item.icon)}</span>
              )}
              <span>{item.name}</span>
            </Link>
            {item.createAction && (
              <button
                onClick={() => {
                  item.createAction!.onClick();
                  onClose();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-primary-600 hover:bg-primary-50 transition-colors dark:text-primary-400 dark:hover:bg-primary-900/30"
                role="menuitem"
                title={item.createAction.label}
                aria-label={item.createAction.label}
              >
                <Icons.Plus size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {createAction && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          <button
            onClick={() => {
              createAction.onClick();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors dark:text-primary-400 dark:hover:bg-primary-900/30"
            role="menuitem"
          >
            <span className="flex-shrink-0">
              {createAction.icon ? (
                iconRenderer(createAction.icon)
              ) : (
                <Icons.Plus size={16} />
              )}
            </span>
            <span className="font-medium">{createAction.label}</span>
          </button>
        </>
      )}

      {items.length === 0 && !createAction && (
        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Нет доступных пунктов
        </div>
      )}
    </div>
  );
};
