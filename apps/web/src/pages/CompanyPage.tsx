import { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  CreditCard,
  Link as LinkIcon,
  Save,
} from 'lucide-react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { PricingCard } from '../shared/ui/PricingCard';
import { useGetMeQuery } from '../store/api/authApi';
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
} from '../store/api/companiesApi';
import {
  useGetSubscriptionQuery,
  useActivatePromoMutation,
} from '../store/api/subscriptionApi';
import { useNotification } from '../shared/hooks/useNotification';
import { CurrencySelect } from '../shared/ui/CurrencySelect';

type TabType = 'general' | 'currency' | 'tariff' | 'integrations';
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

export const CompanyPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const { data: user } = useGetMeQuery();
  const { data: company, isLoading } = useGetCompanyQuery();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    companyName: '',
    companyInn: '',
    currencyBase: 'RUB',
  });

  const { data: subscription } = useGetSubscriptionQuery(undefined);

  // const [promoCodeInput, setPromoCodeInput] = useState('');
  const [activatePromo, { isLoading: isActivatingPromo }] =
    useActivatePromoMutation();
  const [selectedPlanForPromo, setSelectedPlanForPromo] =
    useState<SubscriptionPlan | null>(null);
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    if (user && company) {
      setFormData({
        companyName: user.companyName || '',
        companyInn: company.inn || '',
        currencyBase: company.currencyBase || 'RUB',
      });
    }
  }, [user, company]);

  const handleSave = async () => {
    try {
      await updateCompany({
        name: formData.companyName,
        inn: formData.companyInn || undefined,
        currencyBase: formData.currencyBase,
      }).unwrap();
      showSuccess('Данные компании успешно обновлены');
    } catch (error) {
      console.error('Ошибка при обновлении данных компании:', error);
      showError('Ошибка при обновлении данных компании');
    }
  };

  const currentPlan = (subscription?.plan as SubscriptionPlan) || 'START';

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlanForPromo(plan);
    // Scroll to promo form
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
      showSuccess(
        `Тариф успешно обновлён на ${result.plan || 'новый'}`,
        'Тариф'
      );
      setPromoCode('');
      setSelectedPlanForPromo(null);
    } catch (error) {
      showError(
        'Ошибка при активации промокода. Пожалуйста, проверьте промокод и попробуйте снова.',
        'Ошибка'
      );
      console.error('Failed to activate promo:', error);
    }
  };

  const tabs = [
    { id: 'general' as TabType, label: 'Основные настройки', icon: Building2 },
    { id: 'currency' as TabType, label: 'Валюта', icon: DollarSign },
    { id: 'tariff' as TabType, label: 'Тариф', icon: CreditCard },
    { id: 'integrations' as TabType, label: 'Интеграции', icon: LinkIcon },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2">Загрузка...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Моя компания
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Управление настройками и параметрами компании
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <Card>
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Основные настройки компании
                </h2>
                <div className="space-y-4">
                  <Input
                    label="Название компании"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    icon={<Building2 size={16} />}
                    placeholder="Введите название компании"
                    required
                  />
                  <Input
                    label="ИНН"
                    value={formData.companyInn}
                    onChange={(e) =>
                      setFormData({ ...formData, companyInn: e.target.value })
                    }
                    placeholder="Введите ИНН компании"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating || !formData.companyName.trim()}
                  icon={<Save size={16} />}
                >
                  {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'currency' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Настройки валюты
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Базовая валюта
                    </label>
                    <CurrencySelect
                      value={formData.currencyBase}
                      onChange={(value) =>
                        setFormData({ ...formData, currencyBase: value })
                      }
                      placeholder="Выберите базовую валюту"
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Базовая валюта используется для отображения сумм в отчётах
                      и операциях
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  icon={<Save size={16} />}
                >
                  {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'tariff' && (
            <div className="space-y-8">
              {/* Заголовок */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Выберите тариф
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Расширьте возможности вашей компании
                </p>
              </div>

              {/* Карточки тарифов */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div id="promo-form-tariff">
                  <Card className="mt-8 p-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900">
                    <div className="max-w-2xl mx-auto">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        Активировать промокод для {selectedPlanForPromo}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Введите ваш промокод для получения доступа к тарифу{' '}
                        <strong>{selectedPlanForPromo}</strong>
                      </p>

                      <form
                        onSubmit={handleActivatePromo}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

                        <div className="flex gap-3">
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
                          >
                            Отмена
                          </Button>
                        </div>
                      </form>

                      <div className="mt-6 p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>💡 Совет:</strong> Если у вас нет промокода,
                          свяжитесь с нашей поддержкой.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* FAQ */}
              <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  ❓ Часто задаваемые вопросы
                </h3>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
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
                    <strong>Могу ли я вернуться на более низкий тариф?</strong>{' '}
                    К сожалению, сейчас доступно только повышение тарифа.
                    Свяжитесь с поддержкой для обсуждения других вариантов.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Интеграции
                </h2>
                <div className="text-gray-600 dark:text-gray-400">
                  <p>
                    Настройка интеграций с банками, бухгалтерскими системами и
                    другими сервисами.
                  </p>
                  <p className="mt-2 text-sm italic">Раздел в разработке</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Building2
              size={20}
              className="text-blue-600 dark:text-blue-400 mt-0.5"
            />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                О настройках компании
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Изменения в настройках компании применяются для всех
                пользователей организации. Некоторые настройки могут потребовать
                прав администратора.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
