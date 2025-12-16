import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface PlanBadgeProps {
  compact?: boolean;
}

const planConfig = {
  START: {
    label: 'START',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    icon: '⭐',
  },
  TEAM: {
    label: 'TEAM',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: '👥',
  },
  BUSINESS: {
    label: 'BUSINESS',
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: '🚀',
  },
};

/**
 * Компонент для отображения текущего тарифа
 * Показывает в хедере/сайдбаре текущий план подписки
 */
export const PlanBadge = ({ compact = false }: PlanBadgeProps) => {
  const navigate = useNavigate();
  // use a tolerant selector so tests / mock stores without `subscription` key don't crash
  const subscriptionData = useSelector(
    (state: RootState) => state.subscription?.data ?? null
  );

  if (!subscriptionData || !subscriptionData.plan) {
    return null;
  }

  const plan = subscriptionData.plan as 'START' | 'TEAM' | 'BUSINESS';
  const config = planConfig[plan];

  const handleClick = () => {
    navigate('/company/tarif');
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${config.color} cursor-pointer hover:opacity-80 transition-opacity`}
        title={`Тариф: ${config.label}`}
      >
        <span className="mr-1">{config.icon}</span>
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${config.color} cursor-pointer hover:opacity-80 transition-opacity`}
    >
      <span className="mr-2">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
};
