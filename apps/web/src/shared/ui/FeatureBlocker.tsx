import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useRedux';

interface FeatureBlockerProps {
  feature: string;
  requiredPlan: 'TEAM' | 'BUSINESS';
  children?: ReactNode;
  title?: string;
  description?: string;
}

const featureDescriptions: Record<
  string,
  { title: string; description: string }
> = {
  planning: {
    title: 'Планирование',
    description:
      'Функция планирования и управления бюджетами доступна только на тарифе TEAM и выше.',
  },
  roles: {
    title: 'Управление ролями',
    description:
      'Создание и управление кастомными ролями доступно только на тарифе TEAM и выше.',
  },
  api_access: {
    title: 'API Access',
    description: 'Доступ к внешнему API доступен только на тарифе BUSINESS.',
  },
  integrations: {
    title: 'Интеграции',
    description:
      'Подключение интеграций (Ozon и др.) доступно только на тарифе BUSINESS.',
  },
  reports_odds: {
    title: 'Отчёты ОДДС',
    description: 'Расширенные отчёты доступны только на тарифе TEAM и выше.',
  },
};

/**
 * Компонент заглушки для заблокированных функций
 * Показывает сообщение о том, что функция недоступна на текущем тарифе
 */
export const FeatureBlocker = ({
  feature,
  requiredPlan,
  children: _children,
  title,
  description,
}: FeatureBlockerProps) => {
  const navigate = useNavigate();
  const metadata = featureDescriptions[feature] || {
    title: 'Функция недоступна',
    description: `Эта функция требует тариф ${requiredPlan}. Обновите свой план для доступа.`,
  };

  const displayTitle = title || metadata.title;
  const displayDescription = description || metadata.description;

  const handleUpgrade = () => {
    navigate('/company?tab=billing');
  };

  return (
    <Card className="border-2 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <Lock className="w-12 h-12 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          🔒 {displayTitle}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-md mx-auto">
          {displayDescription}
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={handleUpgrade}
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Обновить тариф
          </Button>
        </div>
      </div>
    </Card>
  );
};

/**
 * HOC для обёртывания компонента с проверкой доступа к фиче
 */
interface RootState {
  subscription: {
    data: { plan: 'START' | 'TEAM' | 'BUSINESS' } | null;
  };
}

export function withFeatureAccess<P extends object>(
  Component: React.ComponentType<P>,
  feature: string,
  requiredPlan: 'TEAM' | 'BUSINESS'
) {
  return function WrappedComponent(props: P) {
    // Используем hook для получения подписки
    const subscriptionData = useAppSelector(
      (state: RootState) => state.subscription.data
    );

    // Если подписка не загружена, показываем лоадер
    if (!subscriptionData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Загрузка...</div>
        </div>
      );
    }

    // Проверяем доступ к фиче
    const planHierarchy = { START: 0, TEAM: 1, BUSINESS: 2 };
    const requiredLevel = planHierarchy[requiredPlan];
    const currentLevel = planHierarchy[subscriptionData.plan] || 0;

    if (currentLevel < requiredLevel) {
      return <FeatureBlocker feature={feature} requiredPlan={requiredPlan} />;
    }

    return <Component {...props} />;
  };
}
