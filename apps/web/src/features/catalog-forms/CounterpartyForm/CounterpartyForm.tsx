import { Input, Select, Button } from '@/shared/ui';
import {
  useCreateCounterpartyMutation,
  useUpdateCounterpartyMutation,
} from '@/store/api/catalogsApi';
import { Counterparty } from '@shared/types/catalogs';
import { useState, useEffect } from 'react';
import { useNotification } from '@/shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '@/constants/notificationMessages';

interface CounterpartyFormProps {
  counterparty: Counterparty | null;
  onClose: () => void;
  onSuccess?: (createdId: string) => void;
  initialName?: string;
  initialInn?: string;
  initialAccountId?: string; // ID счета для автоматической установки после создания
}

export const CounterpartyForm = ({
  counterparty,
  onClose,
  onSuccess,
  initialName = '',
  initialInn = '',
  initialAccountId,
}: CounterpartyFormProps) => {
  const [name, setName] = useState(counterparty?.name || initialName);
  const [inn, setInn] = useState(counterparty?.inn || initialInn);
  const [category, setCategory] = useState(counterparty?.category || 'other');
  const [create, { isLoading: isCreating }] = useCreateCounterpartyMutation();
  const [update, { isLoading: isUpdating }] = useUpdateCounterpartyMutation();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    setName(counterparty?.name || initialName);
    setInn(counterparty?.inn || initialInn);
    setCategory(counterparty?.category || 'other');
  }, [counterparty, initialName, initialInn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (counterparty) {
        await update({
          id: counterparty.id,
          data: { name, inn, category },
        }).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.COUNTERPARTY.UPDATE_SUCCESS);
        onClose();
      } else {
        const result = await create({ name, inn, category }).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.COUNTERPARTY.CREATE_SUCCESS);
        if (onSuccess && result.id) {
          onSuccess(result.id);
        } else {
          onClose();
        }
      }
    } catch (error) {
      const rawErrorMessage =
        error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data &&
        typeof error.data === 'object' &&
        'message' in error.data &&
        typeof error.data.message === 'string'
          ? error.data.message
          : undefined;

      const errorMessage = rawErrorMessage
        ? rawErrorMessage
            .replace(/Операция\s+[\w-]+:\s*/gi, '')
            .replace(/^[^:]+:\s*/i, '')
            .trim()
        : counterparty
          ? NOTIFICATION_MESSAGES.COUNTERPARTY.UPDATE_ERROR
          : NOTIFICATION_MESSAGES.COUNTERPARTY.CREATE_ERROR;

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : counterparty
            ? NOTIFICATION_MESSAGES.COUNTERPARTY.UPDATE_ERROR
            : NOTIFICATION_MESSAGES.COUNTERPARTY.CREATE_ERROR
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input label="ИНН" value={inn} onChange={(e) => setInn(e.target.value)} />
      <Select
        label="Категория"
        value={category}
        onChange={(value) => setCategory(value)}
        options={[
          { value: 'supplier', label: 'Поставщик' },
          { value: 'customer', label: 'Клиент' },
          { value: 'gov', label: 'Гос. орган' },
          { value: 'employee', label: 'Сотрудник' },
          { value: 'other', label: 'Другое' },
        ]}
        required
      />
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {counterparty ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
