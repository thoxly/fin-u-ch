import { useState } from 'react';
import { Pencil, Trash2, X, Copy, Check } from 'lucide-react';

import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { Table } from '../shared/ui/Table';
import { Select } from '../shared/ui/Select';
import { Input } from '../shared/ui/Input';
import TableSkeleton from '../shared/ui/TableSkeleton';
import { EmptyState } from '../shared/ui/EmptyState';
import { FolderOpen } from 'lucide-react';
import { Modal } from '../shared/ui/Modal';
import { OperationForm } from '../features/operation-form/OperationForm';
import { RecurringOperations } from '../features/recurring-operations/RecurringOperations';
import {
  useGetOperationsQuery,
  useDeleteOperationMutation,
  useConfirmOperationMutation,
} from '../store/api/operationsApi';
import {
  useGetArticlesQuery,
  useGetCounterpartiesQuery,
  useGetDealsQuery,
  useGetDepartmentsQuery,
} from '../store/api/catalogsApi';
import { formatDate } from '../shared/lib/date';
import { formatMoney } from '../shared/lib/money';
import type { Operation } from '@shared/types/operations';
import { useNotification } from '../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../constants/notificationMessages';

export const OperationsPage = () => {
  type OperationWithRelations = Operation & {
    article?: { name?: string } | null;
    account?: { name?: string } | null;
    sourceAccount?: { name?: string } | null;
    targetAccount?: { name?: string } | null;
  };
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(
    null
  );
  const [isCopying, setIsCopying] = useState(false);

  // Фильтры
  const [typeFilter, setTypeFilter] = useState<
    'income' | 'expense' | 'transfer' | ''
  >('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [articleIdFilter, setArticleIdFilter] = useState('');
  const [counterpartyIdFilter, setCounterpartyIdFilter] = useState('');
  const [dealIdFilter, setDealIdFilter] = useState('');
  const [departmentIdFilter, setDepartmentIdFilter] = useState('');

  // Загружаем справочники для фильтров
  const { data: articles = [] } = useGetArticlesQuery({ isActive: true });
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();

  // Формируем объект фильтров
  const filters: {
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    articleId?: string;
    counterpartyId?: string;
    dealId?: string;
    departmentId?: string;
  } = {};

  if (typeFilter) filters.type = typeFilter;
  if (dateFromFilter) filters.dateFrom = dateFromFilter;
  if (dateToFilter) filters.dateTo = dateToFilter;
  if (articleIdFilter) filters.articleId = articleIdFilter;
  if (counterpartyIdFilter) filters.counterpartyId = counterpartyIdFilter;
  if (dealIdFilter) filters.dealId = dealIdFilter;
  if (departmentIdFilter) filters.departmentId = departmentIdFilter;

  const hasActiveFilters = Object.keys(filters).length > 0;

  const { data: operations = [], isLoading } = useGetOperationsQuery(
    hasActiveFilters ? filters : undefined
  );
  const [deleteOperation] = useDeleteOperationMutation();
  const [confirmOperation] = useConfirmOperationMutation();
  const { showSuccess, showError } = useNotification();

  const handleCreate = () => {
    setEditingOperation(null);
    setIsCopying(false);
    setIsFormOpen(true);
  };

  const handleEdit = (operation: Operation) => {
    setEditingOperation(operation);
    setIsCopying(false);
    setIsFormOpen(true);
  };

  const handleCopy = (operation: Operation) => {
    // Создаем копию операции без id для создания новой
    const { id, createdAt, updatedAt, ...operationCopy } = operation;
    setEditingOperation(operationCopy as Operation);
    setIsCopying(true);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту операцию?')) {
      try {
        await deleteOperation(id).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.OPERATION.DELETE_SUCCESS);
      } catch (error) {
        console.error('Failed to delete operation:', error);
        showError(NOTIFICATION_MESSAGES.OPERATION.DELETE_ERROR);
      }
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await confirmOperation(id).unwrap();
      showSuccess('Операция успешно подтверждена');
    } catch (error) {
      console.error('Failed to confirm operation:', error);
      showError('Ошибка при подтверждении операции');
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingOperation(null);
    setIsCopying(false);
  };

  const getOperationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: 'Поступление',
      expense: 'Списание',
      transfer: 'Перевод',
    };
    return labels[type] || type;
  };

  const getPeriodicityLabel = (repeat: string) => {
    const labels: Record<string, string> = {
      none: '-',
      daily: 'Ежедневно',
      weekly: 'Еженедельно',
      monthly: 'Ежемесячно',
      quarterly: 'Ежеквартально',
      semiannual: 'Раз в полгода',
      annual: 'Ежегодно',
    };
    return labels[repeat] || repeat;
  };

  const handleClearFilters = () => {
    setTypeFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setArticleIdFilter('');
    setCounterpartyIdFilter('');
    setDealIdFilter('');
    setDepartmentIdFilter('');
  };

  const columns = [
    {
      key: 'operationDate',
      header: 'Дата',
      render: (op: Operation) => formatDate(op.operationDate),
      width: '120px',
    },
    {
      key: 'type',
      header: 'Тип',
      render: (op: Operation) => getOperationTypeLabel(op.type),
      width: '100px',
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (op: Operation) => formatMoney(op.amount, op.currency),
      width: '150px',
    },
    {
      key: 'article',
      header: 'Статья',
      render: (op: OperationWithRelations) => op.article?.name || '-',
    },
    {
      key: 'account',
      header: 'Счет',
      render: (op: OperationWithRelations) => {
        if (op.type === 'transfer') {
          const left = op.sourceAccount?.name || '-';
          const right = op.targetAccount?.name || '-';
          return `${left} → ${right}`;
        }
        return op.account?.name || '-';
      },
    },
    {
      key: 'description',
      header: 'Описание',
      render: (op: Operation) => op.description || '-',
    },
    {
      key: 'repeat',
      header: 'Периодичность',
      render: (op: Operation) => getPeriodicityLabel(op.repeat),
      width: '130px',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (op: Operation) => (
        <div className="flex gap-2">
          {!op.isConfirmed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConfirm(op.id);
              }}
              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
              title="Подтвердить"
            >
              <Check size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(op);
            }}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(op);
            }}
            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
            title="Копировать"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(op.id);
            }}
            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
            title="Удалить"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      width: '180px',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Операции
          </h1>
          <div className="flex items-center gap-3">
            <RecurringOperations onEdit={handleEdit} />
            <Button onClick={handleCreate}>Создать операцию</Button>
          </div>
        </div>

        <Card>
          <div className="mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Тип"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(
                    e.target.value as 'income' | 'expense' | 'transfer' | ''
                  )
                }
                options={[
                  { value: '', label: 'Все типы' },
                  { value: 'income', label: 'Поступление' },
                  { value: 'expense', label: 'Списание' },
                  { value: 'transfer', label: 'Перевод' },
                ]}
                placeholder="Выберите тип"
                fullWidth={false}
              />
              <Input
                label="Дата от"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                fullWidth={false}
              />
              <Input
                label="Дата до"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                fullWidth={false}
              />
              <Select
                label="Статья"
                value={articleIdFilter}
                onChange={(e) => setArticleIdFilter(e.target.value)}
                options={[
                  { value: '', label: 'Все статьи' },
                  ...articles.map((a) => ({ value: a.id, label: a.name })),
                ]}
                placeholder="Выберите статью"
                fullWidth={false}
              />
              <Select
                label="Контрагент"
                value={counterpartyIdFilter}
                onChange={(e) => setCounterpartyIdFilter(e.target.value)}
                options={[
                  { value: '', label: 'Все контрагенты' },
                  ...counterparties.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
                placeholder="Выберите контрагента"
                fullWidth={false}
              />
              <Select
                label="Сделка"
                value={dealIdFilter}
                onChange={(e) => setDealIdFilter(e.target.value)}
                options={[
                  { value: '', label: 'Все сделки' },
                  ...deals.map((d) => ({ value: d.id, label: d.name })),
                ]}
                placeholder="Выберите сделку"
                fullWidth={false}
              />
              <Select
                label="Отдел"
                value={departmentIdFilter}
                onChange={(e) => setDepartmentIdFilter(e.target.value)}
                options={[
                  { value: '', label: 'Все отделы' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                placeholder="Выберите отдел"
                fullWidth={false}
              />
              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button
                    onClick={handleClearFilters}
                    className="btn-secondary flex items-center gap-2 w-full"
                  >
                    <X size={16} />
                    Сбросить фильтры
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : operations.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Нет операций"
              description="Создайте первую операцию, чтобы начать."
            />
          ) : (
            <Table
              columns={columns}
              data={operations}
              keyExtractor={(op) => op.id}
              rowClassName={(op) => (!op.isConfirmed ? 'bg-yellow-50' : '')}
            />
          )}
        </Card>

        <Modal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={
            isCopying
              ? 'Копировать операцию'
              : editingOperation
                ? 'Редактировать операцию'
                : 'Создать операцию'
          }
          size="lg"
        >
          <OperationForm
            operation={editingOperation}
            isCopy={isCopying}
            onClose={handleCloseForm}
          />
        </Modal>
      </div>
    </Layout>
  );
};
