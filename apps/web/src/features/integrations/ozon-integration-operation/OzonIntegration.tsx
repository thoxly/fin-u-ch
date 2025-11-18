/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { OzonIcon } from '../OzonIcon';
import { useSaveOzonIntegrationMutation } from '../../../store/api/integrationsApi';
import {
  useGetArticlesQuery,
  useCreateArticleMutation,
  useGetAccountsQuery,
  useCreateAccountMutation,
} from '../../../store/api/catalogsApi';
import { useGetCounterpartiesQuery } from '../../../store/api/catalogsApi';
import { useNotification } from '../../../shared/hooks/useNotification';

interface OzonIntegrationProps {
  onSave: (data: {
    clientKey: string;
    apiKey: string;
    paymentSchedule: 'next_week' | 'week_after';
    articleId: string;
    accountId: string;
  }) => void;
  onCancel: () => void;
  initialData?: {
    clientKey?: string;
    apiKey?: string;
    paymentSchedule?: 'next_week' | 'week_after';
    articleId?: string;
    accountId?: string;
  };
}

interface Article {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  activity?: 'operating' | 'investing' | 'financing';
  counterpartyId?: string;
  isActive: boolean;
}

interface Account {
  id: string;
  name: string;
  number?: string;
  currency: string;
  openingBalance?: number;
  isActive: boolean;
}

interface Counterparty {
  id: string;
  name: string;
}

export const OzonIntegration = ({
  onSave,
  onCancel,
  initialData,
}: OzonIntegrationProps) => {
  const [clientKey, setClientKey] = useState(initialData?.clientKey || '');
  const [apiKey, setApiKey] = useState(initialData?.apiKey || '');
  const [paymentSchedule, setPaymentSchedule] = useState<
    'next_week' | 'week_after'
  >(initialData?.paymentSchedule || 'next_week');
  const [selectedArticleId, setSelectedArticleId] = useState(
    initialData?.articleId || ''
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialData?.accountId || ''
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showArticleSearch, setShowArticleSearch] = useState(false);
  const [showAccountSearch, setShowAccountSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [isCreatingArticle, setIsCreatingArticle] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Поля для создания новой статьи
  const [newArticleName, setNewArticleName] = useState('Доходы Ozon');
  const [newArticleType, setNewArticleType] = useState<
    'income' | 'expense' | 'transfer'
  >('income');
  const [newArticleActivity, setNewArticleActivity] = useState<
    'operating' | 'investing' | 'financing'
  >('operating');
  const [newArticleCounterpartyId, setNewArticleCounterpartyId] = useState('');

  // Поля для создания нового счета
  const [newAccountName, setNewAccountName] = useState('Ozon');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountCurrency, setNewAccountCurrency] = useState('RUB');
  const [newAccountOpeningBalance, setNewAccountOpeningBalance] = useState(0);

  const [saveIntegration, { isLoading: isSavingIntegration }] =
    useSaveOzonIntegrationMutation();
  const [createArticle, { isLoading: isCreatingArticleMutation }] =
    useCreateArticleMutation();
  const [createAccount, { isLoading: isCreatingAccountMutation }] =
    useCreateAccountMutation();
  const { showSuccess, showError } = useNotification();

  // Загружаем статьи, счета и контрагентов
  const { data: articles = [], isLoading: isLoadingArticles } =
    useGetArticlesQuery({
      type: 'income',
      isActive: true,
    });

  const { data: accounts = [], isLoading: isLoadingAccounts } =
    useGetAccountsQuery();
  const { data: counterparties = [] } = useGetCounterpartiesQuery();

  // Фильтруем статьи и счета по поисковому запросу
  const filteredArticles = articles.filter((article) =>
    article.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAccounts = accounts.filter(
    (account) =>
      account.name.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
      (account.number && account.number.includes(accountSearchQuery))
  );

  // Автоматически выбираем существующие статьи и счета с "Ozon"
  // Автоматически выбираем существующие статьи и счета
  useEffect(() => {
    if (articles.length > 0 && !selectedArticleId) {
      const existingOzonArticle = articles.find(
        (article) =>
          article.name.toLowerCase().includes('ozon') ||
          article.name.toLowerCase().includes('озон') ||
          article.name.toLowerCase().includes('выручка')
      );

      if (existingOzonArticle) {
        setSelectedArticleId(existingOzonArticle.id);
      }
    }

    if (accounts.length > 0 && !selectedAccountId) {
      // Сначала ищем счет с точным названием "Выручка"
      const existingRevenueAccount = accounts.find(
        (account) => account.name.toLowerCase() === 'выручка'
      );

      // Если не нашли, ищем счета содержащие "выручка"
      const existingOzonAccount =
        existingRevenueAccount ||
        accounts.find((account) =>
          account.name.toLowerCase().includes('выручка')
        );

      if (existingOzonAccount) {
        setSelectedAccountId(existingOzonAccount.id);
      }
    }
  }, [articles, accounts, selectedArticleId, selectedAccountId]);

  const handleCreateArticle = async () => {
    if (!newArticleName.trim()) {
      showError('Введите название статьи');
      return;
    }

    try {
      const articleData: any = {
        name: newArticleName.trim(),
        type: newArticleType,
        activity: newArticleActivity,
        counterpartyId: newArticleCounterpartyId || undefined,
        isActive: true,
      };

      const result = await createArticle(articleData).unwrap();
      setSelectedArticleId(result.id);
      setIsCreatingArticle(false);
      setShowArticleSearch(false);
      showSuccess('Статья успешно создана');
    } catch (error) {
      console.error('Failed to create article:', error);
      showError('Ошибка при создании статьи');
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      showError('Введите название счета');
      return;
    }

    try {
      const accountData = {
        name: newAccountName.trim(),
        number: newAccountNumber || undefined,
        currency: newAccountCurrency,
        openingBalance: newAccountOpeningBalance,
        isActive: true,
      };

      const result = await createAccount(accountData).unwrap();
      setSelectedAccountId(result.id);
      setIsCreatingAccount(false);
      setShowAccountSearch(false);
      showSuccess('Счет успешно создан');
    } catch (error) {
      console.error('Failed to create account:', error);
      showError('Ошибка при создании счета');
    }
  };

  const handleSave = async () => {
    if (!clientKey.trim() || !apiKey.trim()) {
      showError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (!selectedArticleId) {
      showError('Пожалуйста, выберите или создайте статью для операций Ozon');
      return;
    }

    if (!selectedAccountId) {
      showError('Пожалуйста, выберите или создайте счет для операций Ozon');
      return;
    }

    try {
      const integrationData = {
        clientKey: clientKey.trim(),
        apiKey: apiKey.trim(),
        paymentSchedule,
        articleId: selectedArticleId,
        accountId: selectedAccountId,
      };

      // Отправляем запрос на backend
      const result = await saveIntegration(integrationData).unwrap();

      if (result.success) {
        showSuccess('Интеграция с Ozon успешно подключена');
        // Вызываем колбэк onSave с данными
        onSave(integrationData);
      } else {
        showError(result.error || 'Ошибка при подключении интеграции');
      }
    } catch (error) {
      console.error('Failed to save Ozon integration:', error);
      showError(
        'Ошибка при подключении интеграции. Проверьте введенные данные.'
      );
    }
  };

  const selectedArticle = articles.find(
    (article) => article.id === selectedArticleId
  );
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );
  const isFormValid =
    clientKey.trim() && apiKey.trim() && selectedArticleId && selectedAccountId;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
          <OzonIcon size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Интеграция с Ozon
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Подключите ваш аккаунт Ozon для автоматизации операций
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          {/* Поля для ввода ключей */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client-Key *
              </label>
              <input
                type="text"
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Введите ваш Client-Key"
                disabled={isSavingIntegration}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Api-Key *
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Введите ваш Api-Key"
                disabled={isSavingIntegration}
              />
            </div>
          </div>

          {/* Выбор статьи */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Статья для операций *
            </label>

            {!showArticleSearch && !isCreatingArticle ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedArticle
                        ? selectedArticle.name
                        : 'Статья не выбрана'}
                    </div>
                    {selectedArticle && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedArticle.type === 'income'
                          ? 'Поступления'
                          : 'Списания'}{' '}
                        •{' '}
                        {selectedArticle.activity === 'operating'
                          ? 'Операционная'
                          : selectedArticle.activity}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowArticleSearch(true)}
                    variant="secondary"
                    size="sm"
                    disabled={isSavingIntegration}
                  >
                    Изменить
                  </Button>
                </div>

                <button
                  onClick={() => setIsCreatingArticle(true)}
                  disabled={isSavingIntegration}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors w-full p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                >
                  <Plus size={16} />
                  Создать новую статью
                </button>
              </div>
            ) : isCreatingArticle ? (
              <div className="space-y-4 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название статьи *
                  </label>
                  <input
                    type="text"
                    value={newArticleName}
                    onChange={(e) => setNewArticleName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="Введите название статьи"
                    disabled={isCreatingArticleMutation}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тип операции
                  </label>
                  <select
                    value={newArticleType}
                    onChange={(e) =>
                      setNewArticleType(
                        e.target.value as 'income' | 'expense' | 'transfer'
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    disabled={isCreatingArticleMutation}
                  >
                    <option value="income">Поступления</option>
                    <option value="expense">Списания</option>
                    <option value="transfer">Переводы</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Деятельность
                  </label>
                  <select
                    value={newArticleActivity}
                    onChange={(e) =>
                      setNewArticleActivity(
                        e.target.value as
                          | 'operating'
                          | 'investing'
                          | 'financing'
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    disabled={isCreatingArticleMutation}
                  >
                    <option value="operating">Операционная</option>
                    <option value="investing">Инвестиционная</option>
                    <option value="financing">Финансовая</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Контрагент
                  </label>
                  <select
                    value={newArticleCounterpartyId}
                    onChange={(e) =>
                      setNewArticleCounterpartyId(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    disabled={isCreatingArticleMutation}
                  >
                    <option value="">Не указан</option>
                    {counterparties.map((counterparty) => (
                      <option key={counterparty.id} value={counterparty.id}>
                        {counterparty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateArticle}
                    disabled={
                      !newArticleName.trim() || isCreatingArticleMutation
                    }
                    size="sm"
                  >
                    {isCreatingArticleMutation ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Создание...
                      </>
                    ) : (
                      'Создать статью'
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreatingArticle(false);
                      // Сбрасываем значения к предзаполненным
                      setNewArticleName('Доходы Ozon');
                      setNewArticleType('income');
                      setNewArticleActivity('operating');
                      setNewArticleCounterpartyId('');
                    }}
                    variant="secondary"
                    size="sm"
                    disabled={isCreatingArticleMutation}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="Поиск статей..."
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1">
                  {isLoadingArticles ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Загрузка статей...
                    </div>
                  ) : filteredArticles.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Статьи не найдены
                    </div>
                  ) : (
                    filteredArticles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => {
                          setSelectedArticleId(article.id);
                          setShowArticleSearch(false);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedArticleId === article.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {article.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {article.type === 'income'
                            ? 'Поступления'
                            : 'Списания'}{' '}
                          •{' '}
                          {article.activity === 'operating'
                            ? 'Операционная'
                            : article.activity}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowArticleSearch(false);
                      setSearchQuery('');
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Отмена
                  </Button>
                  <button
                    onClick={() => {
                      setShowArticleSearch(false);
                      setIsCreatingArticle(true);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  >
                    <Plus size={16} />
                    Создать новую
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Выбор счета */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Счет для операций *
            </label>

            {!showAccountSearch && !isCreatingAccount ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedAccount
                        ? selectedAccount.name
                        : 'Счет не выбран'}
                    </div>
                    {selectedAccount && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedAccount.number
                          ? `№ ${selectedAccount.number} • `
                          : ''}
                        {selectedAccount.currency}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowAccountSearch(true)}
                    variant="secondary"
                    size="sm"
                    disabled={isSavingIntegration}
                  >
                    Изменить
                  </Button>
                </div>

                <button
                  onClick={() => setIsCreatingAccount(true)}
                  disabled={isSavingIntegration}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors w-full p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                >
                  <Plus size={16} />
                  Создать новый счет
                </button>
              </div>
            ) : isCreatingAccount ? (
              <div className="space-y-4 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название счета *
                  </label>
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="Введите название счета"
                    disabled={isCreatingAccountMutation}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Номер счета
                  </label>
                  <input
                    type="text"
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="Введите номер счета (необязательно)"
                    disabled={isCreatingAccountMutation}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Валюта
                  </label>
                  <select
                    value={newAccountCurrency}
                    onChange={(e) => setNewAccountCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    disabled={isCreatingAccountMutation}
                  >
                    <option value="RUB">RUB - Российский рубль</option>
                    <option value="USD">USD - Доллар США</option>
                    <option value="EUR">EUR - Евро</option>
                    <option value="CNY">CNY - Китайский юань</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Начальный остаток
                  </label>
                  <input
                    type="number"
                    value={newAccountOpeningBalance}
                    onChange={(e) =>
                      setNewAccountOpeningBalance(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="0"
                    disabled={isCreatingAccountMutation}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateAccount}
                    disabled={
                      !newAccountName.trim() || isCreatingAccountMutation
                    }
                    size="sm"
                  >
                    {isCreatingAccountMutation ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Создание...
                      </>
                    ) : (
                      'Создать счет'
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreatingAccount(false);
                      // Сбрасываем значения к предзаполненным
                      setNewAccountName('Ozon');
                      setNewAccountNumber('');
                      setNewAccountCurrency('RUB');
                      setNewAccountOpeningBalance(0);
                    }}
                    variant="secondary"
                    size="sm"
                    disabled={isCreatingAccountMutation}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="Поиск счетов..."
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1">
                  {isLoadingAccounts ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Загрузка счетов...
                    </div>
                  ) : filteredAccounts.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Счета не найдены
                    </div>
                  ) : (
                    filteredAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setSelectedAccountId(account.id);
                          setShowAccountSearch(false);
                          setAccountSearchQuery('');
                        }}
                        className={`w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedAccountId === account.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {account.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {account.number ? `№ ${account.number} • ` : ''}
                          {account.currency}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowAccountSearch(false);
                      setAccountSearchQuery('');
                    }}
                    variant="secondary"
                    size="sm"
                  >
                    Отмена
                  </Button>
                  <button
                    onClick={() => {
                      setShowAccountSearch(false);
                      setIsCreatingAccount(true);
                      setAccountSearchQuery('');
                    }}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  >
                    <Plus size={16} />
                    Создать новый
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Выбор графика выплат */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ваш график выплат *
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setPaymentSchedule('next_week')}
                disabled={isSavingIntegration}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  paymentSchedule === 'next_week'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${isSavingIntegration ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Выплата на следующей неделе
                  </span>
                  {paymentSchedule === 'next_week' && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentSchedule('week_after')}
                disabled={isSavingIntegration}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  paymentSchedule === 'week_after'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${isSavingIntegration ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Выплата через неделю
                  </span>
                  {paymentSchedule === 'week_after' && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Кнопка показа подсказки */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            disabled={isSavingIntegration}
            className={`flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg ${
              isSavingIntegration ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <HelpCircle size={16} />
            <span>Подробнее о графиках выплат</span>
            {showHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Текст подсказки */}
          {showHelp && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 space-y-4">
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 text-sm">
                  1. Выплата на следующей неделе
                </h4>
                <p className="mb-2 text-xs">
                  В понедельник посчитаем сумму к оплате за прошедшую неделю, в
                  среду переведём деньги.
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  Пример: вы заработали 300 000 ₽ за неделю с 14 по 20 октября.
                  <br />
                  Рассчитаем сумму выплаты: в понедельник, 21 октября.
                  <br />
                  Переведём деньги: в среду, 23 октября.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 text-sm">
                  2. Выплата через неделю
                </h4>
                <p className="mb-2 text-xs">
                  Расчётная неделя завершится в воскресенье. Ещё через неделю —
                  в понедельник — посчитаем сумму вашего заработка и переведём
                  эти деньги в ближайшую среду.
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  Пример: за неделю с 14 по 20 октября вы заработали 300 000 ₽.
                  <br />
                  Рассчитаем сумму выплаты: в понедельник, 28 октября.
                  <br />
                  Переведём деньги: в среду, 30 октября.
                </p>
              </div>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!isFormValid || isSavingIntegration}
              size="sm"
            >
              {isSavingIntegration ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
            <Button
              onClick={onCancel}
              variant="secondary"
              className="flex-1"
              size="sm"
              disabled={isSavingIntegration}
            >
              Отмена
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
