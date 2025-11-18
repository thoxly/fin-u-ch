import { useState, useEffect, useMemo } from 'react';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { OffCanvas } from '../../shared/ui/OffCanvas';
import {
  useCreateMappingRuleMutation,
  useUpdateMappingRuleMutation,
  useGetImportedOperationsQuery,
} from '../../store/api/importsApi';
import {
  useGetArticlesQuery,
  useGetCounterpartiesQuery,
  useGetAccountsQuery,
} from '../../store/api/catalogsApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { ArticleForm } from '../catalog-forms/ArticleForm/ArticleForm';
import { CounterpartyForm } from '../catalog-forms/CounterpartyForm/CounterpartyForm';
import { AccountForm } from '../catalog-forms/AccountForm/AccountForm';
import {
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  CheckIcon,
} from '@heroicons/react/20/solid';
import type { MappingRule } from '@shared/types/imports';

interface MappingRuleDialogProps {
  rule?: MappingRule | null;
  onClose: () => void;
  sessionId?: string; // Для предпросмотра совпадений
}

export const MappingRuleDialog = ({
  rule,
  onClose,
  sessionId,
}: MappingRuleDialogProps) => {
  const [ruleType, setRuleType] = useState<
    'contains' | 'equals' | 'regex' | 'alias'
  >(rule?.ruleType || 'contains');
  const [pattern, setPattern] = useState(rule?.pattern || '');
  const [targetType, setTargetType] = useState<
    'article' | 'counterparty' | 'account' | 'operationType'
  >(rule?.targetType || 'article');
  const [targetId, setTargetId] = useState(rule?.targetId || '');
  const [targetName, setTargetName] = useState(rule?.targetName || '');
  const [sourceField, setSourceField] = useState<
    'description' | 'receiver' | 'payer' | 'inn'
  >(rule?.sourceField || 'description');
  const [patternError, setPatternError] = useState<string>('');

  const { data: articles = [], refetch: refetchArticles } = useGetArticlesQuery(
    { isActive: true }
  );
  const { data: counterparties = [], refetch: refetchCounterparties } =
    useGetCounterpartiesQuery();
  const { data: accounts = [], refetch: refetchAccounts } =
    useGetAccountsQuery();

  // Получаем операции для предпросмотра совпадений
  const { data: operationsData } = useGetImportedOperationsQuery(
    { sessionId: sessionId || '', limit: 1000 },
    { skip: !sessionId || !pattern.trim() }
  );

  const [createRule, { isLoading: isCreating }] =
    useCreateMappingRuleMutation();
  const [updateRule, { isLoading: isUpdating }] =
    useUpdateMappingRuleMutation();
  const { showSuccess, showError } = useNotification();

  // Состояние для модалки создания элемента
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    field: 'article' | 'counterparty' | 'account' | null;
  }>({
    isOpen: false,
    field: null,
  });

  // Подсчет совпадений для предпросмотра
  const matchCount = useMemo(() => {
    if (!sessionId || !pattern.trim() || !operationsData?.operations) {
      return null;
    }

    try {
      let regex: RegExp | null = null;
      if (ruleType === 'regex') {
        regex = new RegExp(pattern, 'i');
      }

      const count = operationsData.operations.filter((op) => {
        let fieldValue = '';
        switch (sourceField) {
          case 'description':
            fieldValue = op.description || '';
            break;
          case 'receiver':
            fieldValue = op.receiver || '';
            break;
          case 'payer':
            fieldValue = op.payer || '';
            break;
          case 'inn':
            // Используем оба ИНН (плательщика и получателя)
            fieldValue =
              [op.payerInn, op.receiverInn].filter(Boolean).join(' ') || '';
            break;
        }

        if (!fieldValue) return false;

        switch (ruleType) {
          case 'contains':
            return fieldValue.toLowerCase().includes(pattern.toLowerCase());
          case 'equals':
            return fieldValue.toLowerCase() === pattern.toLowerCase();
          case 'regex':
            return regex ? regex.test(fieldValue) : false;
          default:
            return false;
        }
      }).length;

      return count;
    } catch (error) {
      return null;
    }
  }, [pattern, ruleType, sourceField, operationsData, sessionId]);

  // Валидация паттерна при изменении
  useEffect(() => {
    if (!pattern.trim()) {
      setPatternError('');
      return;
    }

    if (ruleType === 'regex') {
      try {
        new RegExp(pattern);
        setPatternError('');
      } catch (error) {
        setPatternError('Некорректное регулярное выражение');
      }
    } else {
      setPatternError('');
    }
  }, [pattern, ruleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pattern.trim()) {
      setPatternError('Поле обязательно для заполнения');
      showError('Поле "Текст для поиска" обязательно');
      return;
    }

    if (patternError) {
      showError(patternError);
      return;
    }

    try {
      const data = {
        ruleType,
        pattern: pattern.trim(),
        targetType,
        targetId: targetId || undefined,
        targetName: targetName || undefined,
        sourceField,
      };

      if (rule) {
        await updateRule({ id: rule.id, data }).unwrap();
        showSuccess('Правило обновлено');
      } else {
        await createRule(data).unwrap();
        showSuccess('Правило создано');
      }

      onClose();
    } catch (error: unknown) {
      const errorMessage: string =
        error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data &&
        typeof error.data === 'object' &&
        'error' in error.data &&
        typeof error.data.error === 'string'
          ? (error.data as { error: string }).error
          : 'Ошибка при сохранении правила';
      showError(errorMessage);
    }
  };

  const getTargetOptions = () => {
    switch (targetType) {
      case 'article':
        return [
          { value: '', label: 'Не выбрано' },
          ...articles.map((a) => ({ value: a.id, label: a.name })),
        ];
      case 'counterparty':
        return [
          { value: '', label: 'Не выбрано' },
          ...counterparties.map((c) => ({ value: c.id, label: c.name })),
        ];
      case 'account':
        return [
          { value: '', label: 'Не выбрано' },
          ...accounts
            .filter((a) => a.isActive)
            .map((a) => ({ value: a.id, label: a.name })),
        ];
      default:
        return [];
    }
  };

  const handleTargetIdChange = (value: string) => {
    setTargetId(value);
    if (value) {
      const option = getTargetOptions().find((opt) => opt.value === value);
      setTargetName(option?.label || '');
    } else {
      setTargetName('');
    }
  };

  const handleCreateNew = () => {
    setCreateModal({
      isOpen: true,
      field: targetType as 'article' | 'counterparty' | 'account',
    });
  };

  const handleCloseCreateModal = () => {
    setCreateModal({
      isOpen: false,
      field: null,
    });
  };

  const handleCreateSuccess = async (createdId: string) => {
    handleCloseCreateModal();

    // Обновляем списки и находим созданный элемент
    if (createModal.field === 'article') {
      const { data: updatedArticles } = await refetchArticles();
      const createdArticle = updatedArticles?.find((a) => a.id === createdId);
      if (createdArticle) {
        setTargetId(createdId);
        setTargetName(createdArticle.name);
      }
    } else if (createModal.field === 'counterparty') {
      const { data: updatedCounterparties } = await refetchCounterparties();
      const createdCounterparty = updatedCounterparties?.find(
        (c) => c.id === createdId
      );
      if (createdCounterparty) {
        setTargetId(createdId);
        setTargetName(createdCounterparty.name);
      }
    } else if (createModal.field === 'account') {
      const { data: updatedAccounts } = await refetchAccounts();
      const createdAccount = updatedAccounts?.find((a) => a.id === createdId);
      if (createdAccount) {
        setTargetId(createdId);
        setTargetName(createdAccount.name);
      }
    }

    showSuccess('Элемент создан и выбран');
  };

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4">
      {/* Блок УСЛОВИЕ */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Условие
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Где искать
            </label>
            <Select
              value={sourceField}
              onChange={(value) =>
                setSourceField(
                  value as 'description' | 'receiver' | 'payer' | 'inn'
                )
              }
              options={[
                { value: 'description', label: 'Назначение платежа' },
                { value: 'receiver', label: 'Имя получателя' },
                { value: 'payer', label: 'Имя плательщика' },
                { value: 'inn', label: 'ИНН' },
              ]}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Тип поиска
            </label>
            <Select
              value={ruleType}
              onChange={(value) =>
                setRuleType(value as 'contains' | 'equals' | 'regex' | 'alias')
              }
              options={[
                { value: 'contains', label: 'Содержит' },
                { value: 'equals', label: 'Совпадает' },
                { value: 'regex', label: 'Регулярное выражение' },
                { value: 'alias', label: 'Псевдоним' },
              ]}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Текст для поиска *
            </label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Введите текст или регулярное выражение"
              fullWidth
              required
              error={patternError}
              icon={<MagnifyingGlassIcon className="w-5 h-5" />}
              className={
                !patternError ? '!bg-gray-50 dark:!bg-gray-700/50' : ''
              }
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Можно вводить часть слова или использовать регулярные выражения
              (например, Аренда офиса, Сбербанк, и проч. )
            </p>
            {matchCount !== null && pattern.trim() && (
              <p className="mt-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium">
                Найдено {matchCount}{' '}
                {matchCount === 1
                  ? 'операция'
                  : matchCount < 5
                    ? 'операции'
                    : 'операций'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Блок ДЕЙСТВИЕ */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Действие
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Сопоставить с
            </label>
            <Select
              value={targetType}
              onChange={(value) =>
                setTargetType(
                  value as
                    | 'article'
                    | 'counterparty'
                    | 'account'
                    | 'operationType'
                )
              }
              options={[
                { value: 'article', label: 'Статья' },
                { value: 'counterparty', label: 'Контрагент' },
                { value: 'account', label: 'Счет' },
                { value: 'operationType', label: 'Тип операции' },
              ]}
              fullWidth
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Какое поле будет заполнено автоматически при совпадении
            </p>
          </div>

          {targetType !== 'operationType' && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Значение
              </label>
              <Select
                value={targetId}
                onChange={handleTargetIdChange}
                onCreateNew={handleCreateNew}
                options={getTargetOptions()}
                fullWidth
              />
            </div>
          )}
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" onClick={onClose} className="btn-secondary">
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isCreating || isUpdating || !!patternError}
          className="btn-primary flex items-center gap-2"
        >
          {rule ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Сохранить
            </>
          ) : (
            <>
              <Cog6ToothIcon className="w-4 h-4" />
              Создать правило
            </>
          )}
        </Button>
      </div>

      {/* OffCanvas для создания элементов */}
      <OffCanvas
        isOpen={createModal.isOpen && !!createModal.field}
        title={
          createModal.field === 'counterparty'
            ? 'Создание контрагента'
            : createModal.field === 'article'
              ? 'Создание статьи'
              : createModal.field === 'account'
                ? 'Создание счета'
                : ''
        }
        onClose={handleCloseCreateModal}
      >
        {createModal.field === 'counterparty' ? (
          <CounterpartyForm
            counterparty={null}
            onClose={handleCloseCreateModal}
            onSuccess={handleCreateSuccess}
          />
        ) : createModal.field === 'article' ? (
          <ArticleForm
            article={null}
            onClose={handleCloseCreateModal}
            onSuccess={handleCreateSuccess}
          />
        ) : createModal.field === 'account' ? (
          <AccountForm
            account={null}
            onClose={handleCloseCreateModal}
            onSuccess={handleCreateSuccess}
          />
        ) : null}
      </OffCanvas>
    </form>
  );
};
