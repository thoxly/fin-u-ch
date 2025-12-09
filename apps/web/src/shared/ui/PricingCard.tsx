import React from 'react';
import { Check } from 'lucide-react';
import { Button } from './Button';

interface PricingCardProps {
  plan: 'START' | 'TEAM' | 'BUSINESS';
  price?: string;
  description: string;
  maxUsers: number;
  features: string[];
  isCurrentPlan: boolean;
  isMostPopular?: boolean;
  onSelectPlan: (plan: string) => void;
}

const planColors = {
  START: 'border-gray-200 dark:border-gray-700',
  TEAM: 'border-blue-200 dark:border-blue-900 shadow-lg',
  BUSINESS: 'border-purple-200 dark:border-purple-900 shadow-lg',
};

const planBgHighlight = {
  START: 'bg-gray-50 dark:bg-gray-900/30',
  TEAM: 'bg-blue-50 dark:bg-blue-900/20',
  BUSINESS: 'bg-purple-50 dark:bg-purple-900/20',
};

const badgeColor = {
  START: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  TEAM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  BUSINESS:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  price,
  description,
  maxUsers,
  features,
  isCurrentPlan,
  isMostPopular = false,
  onSelectPlan,
}) => {
  return (
    <div
      className={`relative rounded-lg border-2 p-6 transition-all duration-300 hover:shadow-xl ${
        planColors[plan]
      } ${isCurrentPlan ? planBgHighlight[plan] : 'bg-white dark:bg-gray-800'}`}
    >
      {/* Популярный план - лента */}
      {isMostPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-1 rounded-full text-xs font-semibold text-white">
            Популярный выбор
          </span>
        </div>
      )}

      {/* Текущий план - бэйдж */}
      {isCurrentPlan && (
        <div className="mb-4">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeColor[plan]}`}
          >
            Текущий тариф
          </span>
        </div>
      )}

      {/* Заголовок */}
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {plan}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      {/* Цена */}
      {price && (
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {price}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {plan === 'START' && 'Бесплатно'}
            {plan === 'TEAM' && 'Доступ по промокоду'}
            {plan === 'BUSINESS' && 'Доступ по промокоду'}
          </p>
        </div>
      )}
      {!price && (
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {plan === 'START' && 'Бесплатно'}
            {plan === 'TEAM' && 'Доступ по промокоду'}
            {plan === 'BUSINESS' && 'Доступ по промокоду'}
          </p>
        </div>
      )}

      {/* Количество пользователей */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Пользователи
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {maxUsers === Infinity
            ? 'Неограниченно'
            : `до ${maxUsers} пользователей`}
        </div>
      </div>

      {/* Кнопка действия */}
      {!isCurrentPlan && (
        <Button
          onClick={() => onSelectPlan(plan)}
          className="w-full mb-6"
          variant={isMostPopular ? 'primary' : 'secondary'}
        >
          {plan === 'START' ? 'Уже включен' : 'Активировать промокод'}
        </Button>
      )}

      {isCurrentPlan && (
        <div className="w-full mb-6 py-2 px-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-center text-sm font-medium">
          Текущий тариф
        </div>
      )}

      {/* Особенности */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Включённые возможности:
        </h4>
        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
