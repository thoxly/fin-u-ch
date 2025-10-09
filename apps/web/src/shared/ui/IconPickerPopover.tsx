import { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';

interface IconPickerPopoverProps {
  currentIcon: string;
  onSelectIcon: (iconName: string) => void;
  onClose: () => void;
  anchorPosition: { top: number; left: number };
}

// Список популярных иконок для выбора
const AVAILABLE_ICONS = [
  'LayoutDashboard',
  'Receipt',
  'ClipboardList',
  'BarChart3',
  'FileText',
  'Wallet',
  'Building2',
  'Users',
  'Handshake',
  'DollarSign',
  'Home',
  'Settings',
  'Calendar',
  'TrendingUp',
  'PieChart',
  'FolderOpen',
  'BookOpen',
  'Calculator',
  'CreditCard',
  'Briefcase',
  'Target',
  'Activity',
  'Package',
  'ShoppingCart',
  'UserCheck',
  'Building',
  'MapPin',
  'Phone',
  'Mail',
  'Globe',
] as const;

export const IconPickerPopover = ({
  currentIcon,
  onSelectIcon,
  onClose,
  anchorPosition,
}: IconPickerPopoverProps): JSX.Element => {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
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

  const handleSelect = (iconName: string) => {
    setSelectedIcon(iconName);
    onSelectIcon(iconName);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50"
      style={{
        top: `${anchorPosition.top}px`,
        left: `${anchorPosition.left}px`,
        maxWidth: '280px',
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Выбрать иконку</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Закрыть"
        >
          <Icons.X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1 max-h-64 overflow-y-auto">
        {AVAILABLE_ICONS.map((iconName) => {
          const IconComponent =
            (Icons[iconName] as Icons.LucideIcon | undefined) || Icons.Circle;
          const isSelected = iconName === selectedIcon;

          return (
            <button
              key={iconName}
              onClick={() => handleSelect(iconName)}
              className={`p-2 rounded transition-all hover:scale-110 ${
                isSelected
                  ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-500'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              title={iconName}
              aria-label={iconName}
            >
              <IconComponent size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
