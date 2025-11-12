import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { usePermissions } from '../shared/hooks/usePermissions';
import { ProtectedAction } from '../shared/components/ProtectedAction';
import {
  useLazyGetOperationsQuery,
  useDeleteOperationMutation,
  useConfirmOperationMutation,
  useBulkDeleteOperationsMutation,
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
import { useBulkSelection } from '../shared/hooks/useBulkSelection';
import { useIntersectionObserver } from '../shared/hooks/useIntersectionObserver';
import { BulkActionsBar } from '../shared/ui/BulkActionsBar';

export const OperationsPage = () => {
  type OperationWithRelations = Operation & {
    article?: { name?: string } | null;
    account?: { name?: string } | null;
    sourceAccount?: { name?: string } | null;
    targetAccount?: { name?: string } | null;
  };

  type OpsQuery = {
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    articleId?: string;
    counterpartyId?: string;
    dealId?: string;
    departmentId?: string;
    limit?: number;
    offset?: number;
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

  const { canRead } = usePermissions();

  // Загружаем справочники для фильтров (только если есть права на просмотр операций)
  const { data: articles = [] } = useGetArticlesQuery(
    { isActive: true },
    { skip: !canRead('operations') }
  );
  const { data: counterparties = [] } = useGetCounterpartiesQuery(undefined, {
    skip: !canRead('operations'),
  });
  const { data: deals = [] } = useGetDealsQuery(undefined, {
    skip: !canRead('operations'),
  });
  const { data: departments = [] } = useGetDepartmentsQuery(undefined, {
    skip: !canRead('operations'),
  });

  // Формируем объект фильтров с useMemo для избежания ненужных пересозданий
  const filters = useMemo(() => {
    const result: {
      type?: string;
      dateFrom?: string;
      dateTo?: string;
      articleId?: string;
      counterpartyId?: string;
      dealId?: string;
      departmentId?: string;
    } = {};

    if (typeFilter) result.type = typeFilter;
    if (dateFromFilter) result.dateFrom = dateFromFilter;
    if (dateToFilter) result.dateTo = dateToFilter;
    if (articleIdFilter) result.articleId = articleIdFilter;
    if (counterpartyIdFilter) result.counterpartyId = counterpartyIdFilter;
    if (dealIdFilter) result.dealId = dealIdFilter;
    if (departmentIdFilter) result.departmentId = departmentIdFilter;

    return result;
  }, [
    typeFilter,
    dateFromFilter,
    dateToFilter,
    articleIdFilter,
    counterpartyIdFilter,
    dealIdFilter,
    departmentIdFilter,
  ]);

  const hasActiveFilters = Object.keys(filters).length > 0;

  const PAGE_SIZE = 50;
  const [items, setItems] = useState<OperationWithRelations[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [trigger, { isFetching }] = useLazyGetOperationsQuery();
  const [deleteOperation] = useDeleteOperationMutation();
  const [confirmOperation] = useConfirmOperationMutation();
  const [bulkDeleteOperations] = useBulkDeleteOperationsMutation();
  const { showSuccess, showError } = useNotification();

  const { selectedIds, toggleSelectOne, clearSelection } = useBulkSelection();

  // Extract data reloading logic to avoid duplication
  const reloadOperationsData = useCallback(async () => {
    if (!canRead('operations')) {
      setItems([]);
      setHasMore(false);
      return;
    }
    setItems([]);
    setOffset(0);
    setHasMore(true);
    clearSelection();
    const params: OpsQuery = {
      ...(hasActiveFilters ? filters : {}),
      limit: PAGE_SIZE,
      offset: 0,
    };
    const result = await trigger(params).unwrap();
    setItems(result as OperationWithRelations[]);
    setHasMore(result.length === PAGE_SIZE);
    setOffset(result.length);
  }, [hasActiveFilters, filters, trigger, clearSelection, canRead]);

  // Memoize loadMore callback to prevent unnecessary re-renders
  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore || !canRead('operations')) return;
    const params: OpsQuery = {
      ...(hasActiveFilters ? filters : {}),
      limit: PAGE_SIZE,
      offset,
    };
    const result = await trigger(params).unwrap();
    const page = result || [];
    setItems((prev) => [...prev, ...page]);
    setOffset((prevOffset) => prevOffset + page.length);
    setHasMore(page.length === PAGE_SIZE);
  }, [
    isFetching,
    hasMore,
    hasActiveFilters,
    filters,
    offset,
    trigger,
    canRead,
  ]);

  // Initial and filters-changed load with proper dependencies
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      await reloadOperationsData();
      if (cancelled) {
        // Reset state if cancelled
        setItems([]);
        setOffset(0);
        setHasMore(true);
      }
    };
    if (canRead('operations')) {
      load();
    } else {
      setItems([]);
      setHasMore(false);
    }
    return () => {
      cancelled = true;
    };
  }, [reloadOperationsData, canRead]);

  // Use IntersectionObserver hook for infinite scroll
  const sentinelRef = useIntersectionObserver(
    useCallback(
      (entry) => {
        if (entry.isIntersecting && !isFetching && hasMore) {
          loadMore();
        }
      },
      [isFetching, hasMore, loadMore]
    ),
    { rootMargin: '200px', enabled: hasMore && !isFetching }
  );

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
    // Создаем глубокую копию операции без id для создания новой
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, ...operationData } = operation;
    // Use structuredClone for deep copy to ensure nested objects are properly copied
    const operationCopy = structuredClone(operationData) as Operation;
    setEditingOperation(operationCopy);
    setIsCopying(true);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту операцию?')) {
      try {
        await deleteOperation(id).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.OPERATION.DELETE_SUCCESS);
        await reloadOperationsData();
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
      await reloadOperationsData();
    } catch (error) {
      console.error('Failed to confirm operation:', error);
      showError('Ошибка при подтверждении операции');
    }
  };

  const handleCloseForm = async () => {
    setIsFormOpen(false);
    setEditingOperation(null);
    setIsCopying(false);

    // Перезагружаем данные после закрытия формы (операция была создана/обновлена)
    try {
      await reloadOperationsData();
    } catch (error) {
      console.error('Failed to reload operations after form close:', error);
    }
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
      key: 'select',
      header: '',
      render: (op: Operation) => (
        <input
          type="checkbox"
          aria-label="Выбрать операцию"
          checked={selectedIds.includes(op.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelectOne(op.id);
          }}
        />
      ),
      width: '40px',
    },
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
            <ProtectedAction entity="operations" action="confirm">
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
            </ProtectedAction>
          )}
          <ProtectedAction
            entity="operations"
            action="update"
            fallback={
              <button
                disabled
                className="text-gray-400 p-1 rounded cursor-not-allowed"
                title="Нет прав на редактирование"
              >
                <Pencil size={16} />
              </button>
            }
          >
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
          </ProtectedAction>
          <ProtectedAction entity="operations" action="create">
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
          </ProtectedAction>
          <ProtectedAction
            entity="operations"
            action="delete"
            fallback={
              <button
                disabled
                className="text-gray-400 p-1 rounded cursor-not-allowed"
                title="Нет прав на удаление"
              >
                <Trash2 size={16} />
              </button>
            }
          >
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
          </ProtectedAction>
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
            <ProtectedAction entity="operations" action="read">
              <RecurringOperations onEdit={handleEdit} />
            </ProtectedAction>
            <ProtectedAction entity="operations" action="create">
              <Button onClick={handleCreate}>Создать операцию</Button>
            </ProtectedAction>
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

          {items.length === 0 && isFetching ? (
            <TableSkeleton rows={5} columns={6} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Нет операций"
              description="Создайте первую операцию, чтобы начать."
            />
          ) : (
            <Table
              columns={columns}
              data={items}
              keyExtractor={(op) => op.id}
              rowClassName={(op) => (!op.isConfirmed ? 'bg-yellow-50' : '')}
            />
          )}
          <ProtectedAction entity="operations" action="delete">
            <BulkActionsBar
              selectedCount={selectedIds.length}
              onClear={clearSelection}
              actions={[
                {
                  label: `Удалить выбранные (${selectedIds.length})`,
                  variant: 'danger',
                  onClick: async () => {
                    if (
                      window.confirm(
                        `Удалить выбранные операции (${selectedIds.length})?`
                      )
                    ) {
                      try {
                        await bulkDeleteOperations(selectedIds).unwrap();
                        await reloadOperationsData();
                        showSuccess(
                          NOTIFICATION_MESSAGES.OPERATION.DELETE_SUCCESS
                        );
                      } catch (error) {
                        console.error(
                          'Failed to bulk delete operations:',
                          error
                        );
                        showError(NOTIFICATION_MESSAGES.OPERATION.DELETE_ERROR);
                      }
                    }
                  },
                },
              ]}
            />
          </ProtectedAction>
          <div ref={sentinelRef as React.RefObject<HTMLDivElement>} />
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
