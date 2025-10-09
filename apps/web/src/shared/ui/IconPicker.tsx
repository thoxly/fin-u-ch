import { useState } from 'react';
import * as Icons from 'lucide-react';

interface IconPickerProps {
  currentIcon: string;
  onSelectIcon: (iconName: string) => void;
  onClose: () => void;
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

export const IconPicker = ({
  currentIcon,
  onSelectIcon,
  onClose,
}: IconPickerProps) => {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);

  const handleSelect = (iconName: string) => {
    setSelectedIcon(iconName);
    onSelectIcon(iconName);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-4 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Выберите иконку
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icons.X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-6 gap-2 max-h-96 overflow-y-auto">
          {AVAILABLE_ICONS.map((iconName) => {
            const IconComponent = Icons[iconName] as Icons.LucideIcon;
            const isSelected = iconName === selectedIcon;

            return (
              <button
                key={iconName}
                onClick={() => handleSelect(iconName)}
                className={`p-3 rounded-lg transition-all hover:scale-110 ${
                  isSelected
                    ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                title={iconName}
              >
                <IconComponent size={24} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
