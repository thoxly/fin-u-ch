import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { CompanyLayout } from './CompanyLayout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { PricingCard } from '../../shared/ui/PricingCard';
import {
  useGetSubscriptionQuery,
  useActivatePromoMutation,
} from '../../store/api/subscriptionApi';
import { useNotification } from '../../shared/hooks/useNotification';

type SubscriptionPlan = 'START' | 'TEAM' | 'BUSINESS';

interface PlanFeature {
  name: string;
  features: string[];
  maxUsers: number;
  description: string;
}

const PLANS: Record<SubscriptionPlan, PlanFeature> = {
  START: {
    name: 'START',
    description: 'Для одного пользователя',
    maxUsers: 1,
    features: [
      'Управление операциями',
      'Справочники (статьи, счета, контрагенты)',
      'Дашборд',
      'Экспорт данных',
    ],
  },
  TEAM: {
    name: 'TEAM',
    description: 'Для команды до 5 человек',
    maxUsers: 5,
    features: [
      'Всё из START +',
      'Планирование (БДДС, план-факт)',
      'Роли и права доступа',
      'Отчеты ОДДС',
      'Повторяющиеся операции',
      'Правила маппинга для импорта',
      'Интеграции (Ozon и другие)',
    ],
  },
  BUSINESS: {
    name: 'BUSINESS',
    description: 'Для больших организаций',
    maxUsers: Infinity,
    features: [
      'Всё из TEAM +',
      'Неограниченное количество пользователей',
      'Доступ к API',
      'Приоритетная поддержка',
    ],
  },
};

export const TariffPage = () => {
  const { data: subscription } = useGetSubscriptionQuery();
  const [activatePromo, { isLoading: isActivatingPromo }] =
    useActivatePromoMutation();
  const { showSuccess, showError } = useNotification();
  const [promoCode, setPromoCode] = useState('');
  const [selectedPlanForPromo, setSelectedPlanForPromo] =
    useState<SubscriptionPlan | null>(null);

  const currentPlan = (subscription?.plan as SubscriptionPlan) || 'START';

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlanForPromo(plan);
    const promoForm = document.getElementById('promo-form-tariff');
    if (promoForm) {
      promoForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleActivatePromo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!promoCode.trim()) {
      showError('Пожалуйста, введите промокод');
      return;
    }

    try {
      const result = await activatePromo({
        promoCode: promoCode.trim(),
      }).unwrap();
      showSuccess(`Тариф успешно обновлён на ${result.plan || 'новый'}`);
      setPromoCode('');
      setSelectedPlanForPromo(null);
    } catch (error) {
      showError(
        'Ошибка при активации промокода. Пожалуйста, проверьте промокод и попробуйте снова.'
      );
      console.error('Failed to activate promo:', error);
    }
  };

  return (
    <CompanyLayout>
      <div className="space-y-6 md:space-y-8">
        <Card className="p-6 sm:p-8">
          <div className="space-y-6 sm:space-y-8">
            {/* Заголовок */}
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Выберите тариф
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Расширьте возможности вашей компании
              </p>
            </div>

            {/* Карточки тарифов */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {Object.entries(PLANS).map(([planKey, plan]) => (
                <PricingCard
                  key={planKey}
                  plan={planKey as SubscriptionPlan}
                  description={plan.description}
                  maxUsers={plan.maxUsers}
                  features={plan.features}
                  isCurrentPlan={currentPlan === planKey}
                  isMostPopular={planKey === 'TEAM'}
                  onSelectPlan={() =>
                    handleSelectPlan(planKey as SubscriptionPlan)
                  }
                />
              ))}
            </div>

            {/* Форма ввода промокода */}
            {selectedPlanForPromo && currentPlan !== selectedPlanForPromo && (
              <div id="promo-form-tariff" className="px-4 sm:px-0">
                <Card className="mt-6 sm:mt-8 p-6 sm:p-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900">
                  <div className="max-w-2xl mx-auto">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                      Активировать промокод для {selectedPlanForPromo}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                      Введите ваш промокод для получения доступа к тарифу{' '}
                      <strong>{selectedPlanForPromo}</strong>
                    </p>

                    <form onSubmit={handleActivatePromo} className="space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Промокод
                        </label>
                        <Input
                          type="text"
                          placeholder="Введите промокод (например: USER-ABC123-20250109)"
                          value={promoCode}
                          onChange={(e) =>
                            setPromoCode(e.target.value.toUpperCase())
                          }
                          disabled={isActivatingPromo}
                          className="uppercase"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          type="submit"
                          disabled={isActivatingPromo || !promoCode.trim()}
                          className="flex-1"
                        >
                          {isActivatingPromo
                            ? 'Активирую промокод...'
                            : 'Активировать'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setSelectedPlanForPromo(null);
                            setPromoCode('');
                          }}
                          disabled={isActivatingPromo}
                          className="sm:w-auto"
                        >
                          Отмена
                        </Button>
                      </div>
                    </form>

                    <div className="mt-6 p-3 sm:p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <strong>💡 Совет:</strong> Если у вас нет промокода,
                        свяжитесь с нашей поддержкой.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* FAQ */}
            <Card className="p-6 sm:p-8 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                ❓ Часто задаваемые вопросы
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <p>
                  <strong>Когда я могу обновить свой тариф?</strong> Вы можете
                  обновить свой тариф в любой момент, используя промокод.
                </p>
                <p>
                  <strong>
                    Что происходит с моими данными при смене тарифа?
                  </strong>{' '}
                  Все ваши данные сохраняются. При переходе на более высокий
                  тариф вам станут доступны дополнительные функции.
                </p>
                <p>
                  <strong>Могу ли я вернуться на более низкий тариф?</strong> К
                  сожалению, сейчас доступно только повышение тарифа. Свяжитесь
                  с поддержкой для обсуждения других вариантов.
                </p>
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </CompanyLayout>
  );
};
