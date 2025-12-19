import React from 'react';
import { Search, X, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';

interface ArticleTreeSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showLeavesOnly: boolean;
  onShowLeavesOnlyChange: (value: boolean) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  isAllExpanded?: boolean;
}

export const ArticleTreeSearch = ({
  searchQuery,
  onSearchChange,
  showLeavesOnly,
  onShowLeavesOnlyChange,
  onExpandAll,
  onCollapseAll,
  isAllExpanded = false,
}: ArticleTreeSearchProps) => {
  const handleClearSearch = () => {
    onSearchChange('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Поиск */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 tracking-wide uppercase">
            Поиск статей
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Введите название статьи..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              icon={<Search size={16} />}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Очистить поиск"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Действия */}
        {(onExpandAll || onCollapseAll) && (
          <div className="flex items-end">
            <Button
              onClick={isAllExpanded ? onCollapseAll : onExpandAll}
              variant="secondary"
              size="md"
              icon={
                isAllExpanded ? (
                  <ChevronsUpDown size={16} />
                ) : (
                  <ChevronsDownUp size={16} />
                )
              }
            >
              {isAllExpanded ? 'Свернуть все' : 'Развернуть все'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
