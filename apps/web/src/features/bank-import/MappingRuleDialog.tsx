import { useState, useEffect } from 'react';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import {
  useCreateMappingRuleMutation,
  useUpdateMappingRuleMutation,
  useGetMappingRulesQuery,
} from '../../store/api/importsApi';
import {
  useGetArticlesQuery,
  useGetCounterpartiesQuery,
  useGetAccountsQuery,
} from '../../store/api/catalogsApi';
import { useNotification } from '../../shared/hooks/useNotification';
import type { MappingRule } from '@shared/types/imports';

interface MappingRuleDialogProps {
  rule?: MappingRule | null;
  onClose: () => void;
}

export const MappingRuleDialog = ({
  rule,
  onClose,
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

  const { data: articles = [] } = useGetArticlesQuery({ isActive: true });
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();

  const [createRule, { isLoading: isCreating }] =
    useCreateMappingRuleMutation();
  const [updateRule, { isLoading: isUpdating }] =
    useUpdateMappingRuleMutation();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pattern.trim()) {
      showError('Поле "Текст для поиска" обязательно');
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
    } catch (error: any) {
      showError(error?.data?.error || 'Ошибка при сохранении правила');
    }
  };

  const getTargetOptions = () => {
    switch (targetType) {
      case 'article':
        return [
          { value: '', label: 'Создать новую' },
          ...articles.map((a) => ({ value: a.id, label: a.name })),
        ];
      case 'counterparty':
        return [
          { value: '', label: 'Создать нового' },
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Где искать
        </label>
        <Select
          value={sourceField}
          onChange={(e) =>
            setSourceField(
              e.target.value as 'description' | 'receiver' | 'payer' | 'inn'
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
        <label className="block text-sm font-medium mb-1">
          Тип поиска
        </label>
        <Select
          value={ruleType}
          onChange={(e) =>
            setRuleType(
              e.target.value as 'contains' | 'equals' | 'regex' | 'alias'
            )
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
        <label className="block text-sm font-medium mb-1">
          Текст для поиска *
        </label>
        <Input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Введите текст или регулярное выражение"
          fullWidth
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Сопоставить с
        </label>
        <Select
          value={targetType}
          onChange={(e) =>
            setTargetType(
              e.target.value as
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
      </div>

      {targetType !== 'operationType' && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Выбор значения
          </label>
          <Select
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              if (e.target.value) {
                const option = getTargetOptions().find(
                  (opt) => opt.value === e.target.value
                );
                setTargetName(option?.label || '');
              }
            }}
            options={getTargetOptions()}
            fullWidth
          />
          {!targetId && (
            <Input
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="Имя для нового элемента"
              className="mt-2"
              fullWidth
            />
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          onClick={onClose}
          className="btn-secondary"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isCreating || isUpdating}
          className="btn-primary"
        >
          {rule ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
};

