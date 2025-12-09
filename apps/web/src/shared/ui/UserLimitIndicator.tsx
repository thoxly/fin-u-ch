import { AlertCircle } from 'lucide-react';
import { useAppSelector } from '../hooks/useRedux';

interface UserLimitIndicatorProps {
  showLabel?: boolean;
  showTooltip?: boolean;
}

interface RootState {
  subscription: {
    data: {
      userLimit: {
        current: number;
        max: number;
        remaining: number;
        isUnlimited: boolean;
      } | null;
    } | null;
  };
}

/**
 * Компонент для отображения прогресса использования лимита пользователей
 * Показывает "используется X из Y" и прогресс-бар
 */
export const UserLimitIndicator = ({
  showLabel = true,
  showTooltip = true,
}: UserLimitIndicatorProps) => {
  const subscriptionData = useAppSelector(
    (state: RootState) => state.subscription.data
  );

  if (!subscriptionData || !subscriptionData.userLimit) {
    return null;
  }

  const { current, max, remaining, isUnlimited } = subscriptionData.userLimit;

  if (isUnlimited) {
    return (
      <div className="text-sm text-green-600 dark:text-green-400 font-medium">
        ✓ Безлимитные пользователи
      </div>
    );
  }

  const percentage = max ? Math.round((current / max) * 100) : 0;
  const isLimitReached = remaining === 0;
  const isNearLimit = remaining !== null && remaining <= 1;

  return (
    <div className={`space-y-2 ${showTooltip ? 'group relative' : ''}`}>
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Пользователи
          </span>
          <span
            className={`text-sm font-semibold ${
              isLimitReached
                ? 'text-red-600 dark:text-red-400'
                : isNearLimit
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {current} / {max}
          </span>
        </div>
      )}

      {/* Прогресс-бар */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isLimitReached
              ? 'bg-red-500'
              : isNearLimit
                ? 'bg-amber-500'
                : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Сообщение о статусе */}
      {isLimitReached && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} />
          <span>Лимит пользователей достигнут</span>
        </div>
      )}

      {isNearLimit && !isLimitReached && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle size={16} />
          <span>Осталось {remaining} место</span>
        </div>
      )}

      {/* Скрытый tooltip при наведении */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {isLimitReached
            ? 'Обновите тариф для добавления новых пользователей'
            : `${remaining} место доступно`}
        </div>
      )}
    </div>
  );
};
