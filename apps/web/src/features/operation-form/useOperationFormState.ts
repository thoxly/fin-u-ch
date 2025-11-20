import { useState } from 'react';
import { toISODate } from '../../shared/lib/date';
import { formatAmountInput } from '../../shared/lib/numberInput';
import type { Operation } from '@fin-u-ch/shared';
import { OperationType, Periodicity } from '@fin-u-ch/shared';

// Вспомогательная функция для преобразования даты
function convertToDateString(date: Date | string | undefined): string {
  if (!date) return '';
  if (date instanceof Date) {
    return toISODate(date);
  }
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return '';
}

export const useOperationFormState = (operation: Operation | null) => {
  const [type, setType] = useState<OperationType>(
    operation?.type || OperationType.EXPENSE
  );

  const [operationDate, setOperationDate] = useState(
    operation?.operationDate
      ? convertToDateString(operation.operationDate)
      : toISODate(new Date())
  );

  const [amount, setAmount] = useState(
    operation?.amount != null ? formatAmountInput(String(operation.amount)) : ''
  );

  const [currency, setCurrency] = useState(operation?.currency || 'RUB');

  const [articleId, setArticleId] = useState(operation?.articleId || '');

  const [accountId, setAccountId] = useState(operation?.accountId || '');

  const [sourceAccountId, setSourceAccountId] = useState(
    operation?.sourceAccountId || ''
  );

  const [targetAccountId, setTargetAccountId] = useState(
    operation?.targetAccountId || ''
  );

  const [counterpartyId, setCounterpartyId] = useState(
    operation?.counterpartyId || ''
  );

  const [dealId, setDealId] = useState(operation?.dealId || '');

  const [departmentId, setDepartmentId] = useState(
    operation?.departmentId || ''
  );

  const [description, setDescription] = useState(operation?.description || '');

  const [repeat, setRepeat] = useState<Periodicity>(
    operation?.repeat || Periodicity.NONE
  );

  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    convertToDateString(operation?.recurrenceEndDate)
  );

  const [updateScope, setUpdateScope] = useState<'current' | 'all'>('current');

  return {
    formState: {
      type,
      operationDate,
      amount,
      currency,
      articleId,
      accountId,
      sourceAccountId,
      targetAccountId,
      counterpartyId,
      dealId,
      departmentId,
      description,
      repeat,
      recurrenceEndDate,
      updateScope,
    },
    formSetters: {
      setType,
      setOperationDate,
      setAmount,
      setCurrency,
      setArticleId,
      setAccountId,
      setSourceAccountId,
      setTargetAccountId,
      setCounterpartyId,
      setDealId,
      setDepartmentId,
      setDescription,
      setRepeat,
      setRecurrenceEndDate,
      setUpdateScope,
    },
  };
};
