import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Trash2, X, Copy, Check, FileUp, Plus } from 'lucide-react';

import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { Table } from '../shared/ui/Table';
import { Select } from '../shared/ui/Select';
import { DateRangePicker } from '../shared/ui/DateRangePicker';
import TableSkeleton from '../shared/ui/TableSkeleton';
import { EmptyState } from '../shared/ui/EmptyState';
import { FolderOpen } from 'lucide-react';
import { Modal } from '../shared/ui/Modal';
import { ConfirmDeleteModal } from '../shared/ui/ConfirmDeleteModal';
import { OperationForm } from '../features/operation-form/OperationForm';
import { RecurringOperations } from '../features/recurring-operations/RecurringOperations';
import { MappingRules } from '../features/bank-import/MappingRules';
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
  useGetAccountsQuery,
} from '../store/api/catalogsApi';
import { useGetCompanyQuery } from '../store/api/companiesApi';
import { formatDate } from '../shared/lib/date';
import { formatMoney } from '../shared/lib/money';
import type { Operation } from '@shared/types/operations';
import { useNotification } from '../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../constants/notificationMessages';
import { useBulkSelection } from '../shared/hooks/useBulkSelection';
import { useIntersectionObserver } from '../shared/hooks/useIntersectionObserver';
import { useIsMobile } from '../shared/hooks/useIsMobile';
import { BulkActionsBar } from '../shared/ui/BulkActionsBar';
import { BankImportModal } from '../features/bank-import/BankImportModal';
import { ExportMenu } from '../shared/ui/ExportMenu';
import type { ExportRow } from '../shared/lib/exportData';

export const OperationsPage = () => {
  type OperationWithRelations = Operation & {
    article?: { name?: string } | null;
    account?: { name?: string } | null;
    sourceAccount?: { name?: string } | null;
    targetAccount?: { name?: string } | null;
    counterparty?: { name?: string } | null;
    deal?: { name?: string } | null;
    department?: { name?: string } | null;
    recurrenceParent?: {
      id: string;
      repeat: string;
      operationDate: Date | string;
    } | null;
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Состояния для модалок подтверждения удаления
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    type: 'delete' | 'reject' | 'bulk';
    ids?: string[];
  }>({
    isOpen: false,
    id: null,
    type: 'delete',
  });

  // Фильтры
  const [typeFilter, setTypeFilter] = useState<
    'income' | 'expense' | 'transfer' | ''
  >('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(
    undefined
  );
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(undefined);
  const [articleIdFilter, setArticleIdFilter] = useState('');
  const [counterpartyIdFilter, setCounterpartyIdFilter] = useState('');
  const [dealIdFilter, setDealIdFilter] = useState('');
  const [departmentIdFilter, setDepartmentIdFilter] = useState('');
  const [accountIdFilter, setAccountIdFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Сортировка
  const [sortKey, setSortKey] = useState<string>('operationDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Загружаем справочники для фильтров
  const { data: articles = [] } = useGetArticlesQuery({ isActive: true });
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: company } = useGetCompanyQuery();

  // Фильтруем статьи по типу операции
  const filteredArticles = useMemo(() => {
    if (typeFilter === 'expense') {
      return articles.filter((a) => a.type === 'expense');
    }
    if (typeFilter === 'income') {
      return articles.filter((a) => a.type === 'income');
    }
    return articles;
  }, [articles, typeFilter]);

  // Фильтруем сделки по контрагенту
  const filteredDeals = useMemo(() => {
    if (counterpartyIdFilter) {
      return deals.filter((d) => d.counterpartyId === counterpartyIdFilter);
    }
    return deals;
  }, [deals, counterpartyIdFilter]);

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
      accountId?: string;
    } = {};

    if (typeFilter) result.type = typeFilter;
    if (dateFromFilter) result.dateFrom = dateFromFilter;
    if (dateToFilter) result.dateTo = dateToFilter;
    if (articleIdFilter) result.articleId = articleIdFilter;
    if (counterpartyIdFilter) result.counterpartyId = counterpartyIdFilter;
    if (dealIdFilter) result.dealId = dealIdFilter;
    if (departmentIdFilter) result.departmentId = departmentIdFilter;
    if (accountIdFilter) result.accountId = accountIdFilter;

    return result;
  }, [
    typeFilter,
    dateFromFilter,
    dateToFilter,
    articleIdFilter,
    counterpartyIdFilter,
    dealIdFilter,
    departmentIdFilter,
    accountIdFilter,
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

  const { selectedIds, toggleSelectOne, toggleSelectAll, clearSelection } =
    useBulkSelection();
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const isMobile = useIsMobile();

  // Extract data reloading logic to avoid duplication
  const reloadOperationsData = useCallback(async () => {
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
  }, [hasActiveFilters, filters, trigger, clearSelection]);

  // Memoize loadMore callback to prevent unnecessary re-renders
  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore) return;
    const params: OpsQuery = {
      ...(hasActiveFilters ? filters : {}),
      limit: PAGE_SIZE,
      offset,
    };
    const result = await trigger(params).unwrap();
    const page = result || [];
    // Фильтруем дубликаты по id при добавлении новых элементов
    setItems((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const newItems = page.filter((item) => !existingIds.has(item.id));
      return [...prev, ...newItems];
    });
    setOffset((prevOffset) => prevOffset + page.length);
    setHasMore(page.length === PAGE_SIZE);
  }, [isFetching, hasMore, hasActiveFilters, filters, offset, trigger]);

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
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadOperationsData]);

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
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...operationData
    } = operation;
    // Use structuredClone for deep copy to ensure nested objects are properly copied
    const operationCopy = structuredClone(operationData) as Operation;
    setEditingOperation(operationCopy);
    setIsCopying(true);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id, type: 'delete' });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteOperation(deleteModal.id).unwrap();
      showSuccess(NOTIFICATION_MESSAGES.OPERATION.DELETE_SUCCESS);
      await reloadOperationsData();
    } catch (error) {
      console.error('Failed to delete operation:', error);
      showError(NOTIFICATION_MESSAGES.OPERATION.DELETE_ERROR);
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

  const handleReject = (id: string) => {
    setDeleteModal({ isOpen: true, id, type: 'reject' });
  };

  const confirmReject = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteOperation(deleteModal.id).unwrap();
      showSuccess('Операция отклонена');
      await reloadOperationsData();
    } catch (error) {
      console.error('Failed to reject operation:', error);
      showError('Ошибка при отклонении операции');
    }
  };

  const confirmBulkDelete = async () => {
    if (!deleteModal.ids || deleteModal.ids.length === 0) return;
    try {
      await bulkDeleteOperations(deleteModal.ids).unwrap();
      await reloadOperationsData();
      showSuccess(NOTIFICATION_MESSAGES.OPERATION.DELETE_SUCCESS);
      clearSelection();
    } catch (error) {
      console.error('Failed to bulk delete operations:', error);
      showError('Ошибка при удалении операций');
    }
  };

  const handleModalConfirm = async () => {
    if (deleteModal.type === 'delete') {
      await confirmDelete();
    } else if (deleteModal.type === 'reject') {
      await confirmReject();
    } else if (deleteModal.type === 'bulk') {
      await confirmBulkDelete();
    }
    setDeleteModal({ isOpen: false, id: null, type: 'delete' });
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

  const handleImportClick = () => {
    if (!company?.inn) {
      showError(
        'Рекомендуем указать ИНН компании в настройках для автоматического определения направления операций (списание/поступление)'
      );
    }
    setIsImportModalOpen(true);
  };

  const getOperationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: 'Поступление',
      expense: 'Списание',
      transfer: 'Перевод',
    };
    return labels[type] || type;
  };

  const getPeriodicityLabel = (op: OperationWithRelations) => {
    // Если это дочерняя операция (есть родитель)
    if (op.recurrenceParentId && op.recurrenceParent) {
      const parentRepeat = op.recurrenceParent.repeat;
      const parentDate = op.recurrenceParent.operationDate;
      const labels: Record<string, string> = {
        daily: 'Ежедневно',
        weekly: 'Еженедельно',
        monthly: 'Ежемесячно',
        quarterly: 'Ежеквартально',
        semiannual: 'Раз в полгода',
        annual: 'Ежегодно',
      };
      const periodLabel = labels[parentRepeat] || parentRepeat;
      const formattedDate = formatDate(parentDate);
      return `${periodLabel} с ${formattedDate}`;
    }

    // Если это родительская операция или обычная операция
    const labels: Record<string, string> = {
      none: '-',
      daily: 'Ежедневно',
      weekly: 'Еженедельно',
      monthly: 'Ежемесячно',
      quarterly: 'Ежеквартально',
      semiannual: 'Раз в полгода',
      annual: 'Ежегодно',
    };
    return labels[op.repeat] || op.repeat;
  };

  // Обработчик сортировки
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Переключаем направление сортировки
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // Новая колонка для сортировки
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Сортированные данные
  const sortedItems = useMemo(() => {
    if (!sortKey) return items;

    return [...items].sort((a, b) => {
      let aValue: unknown;
      let bValue: unknown;

      // Получаем значения для сортировки в зависимости от колонки
      switch (sortKey) {
        case 'operationDate':
          aValue = new Date(a.operationDate).getTime();
          bValue = new Date(b.operationDate).getTime();
          break;
        case 'type':
          aValue = getOperationTypeLabel(a.type);
          bValue = getOperationTypeLabel(b.type);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'article':
          aValue = a.article?.name || '';
          bValue = b.article?.name || '';
          break;
        case 'account':
          if (a.type === 'transfer' && b.type === 'transfer') {
            aValue = `${a.sourceAccount?.name || ''} → ${a.targetAccount?.name || ''}`;
            bValue = `${b.sourceAccount?.name || ''} → ${b.targetAccount?.name || ''}`;
          } else {
            aValue = a.account?.name || '';
            bValue = b.account?.name || '';
          }
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'repeat':
          aValue = getPeriodicityLabel(a);
          bValue = getPeriodicityLabel(b);
          break;
        default:
          return 0;
      }

      // Сравнение значений
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, sortDirection]);

  const selectableIds = useMemo(
    () =>
      sortedItems.map((op) => op.id).filter((id): id is string => Boolean(id)),
    [sortedItems]
  );
  const areAllVisibleSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));
  const hasSomeVisibleSelected = selectableIds.some((id) =>
    selectedIds.includes(id)
  );

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate =
        hasSomeVisibleSelected && !areAllVisibleSelected;
    }
  }, [hasSomeVisibleSelected, areAllVisibleSelected]);

  // Определение колонок для экспорта
  const exportColumns = [
    'Дата',
    'Тип',
    'Сумма',
    'Валюта',
    'Статья',
    'Счет',
    'Контрагент',
    'Сделка',
    'Отдел',
    'Описание',
    'Периодичность',
    'Статус подтверждения',
  ];

  // Функция для преобразования операций в формат экспорта
  const buildExportRows = useCallback((): ExportRow[] => {
    return sortedItems.map((op) => {
      // Форматируем счет в зависимости от типа операции
      let accountDisplay = '-';
      if (op.type === 'transfer') {
        const source = op.sourceAccount?.name || '-';
        const target = op.targetAccount?.name || '-';
        accountDisplay = `${source} → ${target}`;
      } else {
        accountDisplay = op.account?.name || '-';
      }

      return {
        Дата: formatDate(op.operationDate),
        Тип: getOperationTypeLabel(op.type),
        Сумма: op.amount,
        Валюта: op.currency,
        Статья: op.article?.name || '-',
        Счет: accountDisplay,
        Контрагент: op.counterparty?.name || '-',
        Сделка: op.deal?.name || '-',
        Отдел: op.department?.name || '-',
        Описание: op.description || '-',
        Периодичность: getPeriodicityLabel(op),
        'Статус подтверждения': op.isConfirmed
          ? 'Подтверждена'
          : 'Не подтверждена',
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedItems]);

  const handleClearFilters = () => {
    setTypeFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setDateRangeStart(undefined);
    setDateRangeEnd(undefined);
    setArticleIdFilter('');
    setCounterpartyIdFilter('');
    setDealIdFilter('');
    setDepartmentIdFilter('');
    setAccountIdFilter('');
  };

  // Сбрасываем связанные фильтры при изменении родительских
  useEffect(() => {
    if (typeFilter !== 'expense' && articleIdFilter) {
      const selectedArticle = articles.find((a) => a.id === articleIdFilter);
      if (
        selectedArticle &&
        selectedArticle.type === 'expense' &&
        typeFilter === 'income'
      ) {
        setArticleIdFilter('');
      }
    }
  }, [typeFilter, articleIdFilter, articles]);

  useEffect(() => {
    if (!counterpartyIdFilter && dealIdFilter) {
      const selectedDeal = deals.find((d) => d.id === dealIdFilter);
      if (selectedDeal && selectedDeal.counterpartyId) {
        // Если контрагент был удален, сбрасываем сделку
        setDealIdFilter('');
      }
    } else if (counterpartyIdFilter && dealIdFilter) {
      const selectedDeal = deals.find((d) => d.id === dealIdFilter);
      if (
        selectedDeal &&
        selectedDeal.counterpartyId !== counterpartyIdFilter
      ) {
        setDealIdFilter('');
      }
    }
  }, [counterpartyIdFilter, dealIdFilter, deals]);

  // Автоматически открываем модальное окно импорта, если есть флаг в sessionStorage
  useEffect(() => {
    const shouldOpen = sessionStorage.getItem('openImportModal');
    const tab = sessionStorage.getItem('importModalTab');

    if (shouldOpen === 'true') {
      setIsImportModalOpen(true);
      sessionStorage.removeItem('openImportModal');
      sessionStorage.removeItem('importModalTab');
    }
  }, []);

  // Слушаем событие storage для открытия модального окна из свернутых секций
  useEffect(() => {
    const handleStorageEvent = () => {
      const shouldOpen = sessionStorage.getItem('openImportModal');
      if (shouldOpen === 'true') {
        setIsImportModalOpen(true);
        sessionStorage.removeItem('openImportModal');
        sessionStorage.removeItem('importModalTab');
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateRangeStart(startDate);
    setDateRangeEnd(endDate);

    // Отправляем полные ISO даты с временем вместо формата YYYY-MM-DD
    // Это гарантирует правильную обработку часовых поясов на backend
    setDateFromFilter(startDate.toISOString());
    setDateToFilter(endDate.toISOString());
  };

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Выбрать все операции на странице"
          ref={selectAllCheckboxRef}
          checked={areAllVisibleSelected && selectableIds.length > 0}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelectAll(selectableIds);
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={selectableIds.length === 0}
          className="rounded border-gray-300"
        />
      ),
      render: (op: Operation) => (
        <input
          type="checkbox"
          aria-label="Выбрать операцию"
          checked={selectedIds.includes(op.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelectOne(op.id);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: '40px',
      sortable: false,
    },
    {
      key: 'operationDate',
      header: 'Дата',
      render: (op: Operation) => formatDate(op.operationDate),
      width: '120px',
      sortable: true,
    },
    {
      key: 'type',
      header: 'Тип',
      render: (op: Operation) => getOperationTypeLabel(op.type),
      width: '100px',
      sortable: true,
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (op: Operation) => formatMoney(op.amount, op.currency),
      width: '150px',
      sortable: true,
    },
    {
      key: 'article',
      header: 'Статья',
      render: (op: OperationWithRelations) => op.article?.name || '-',
      sortable: true,
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
      sortable: true,
    },
    {
      key: 'description',
      header: 'Описание',
      render: (op: Operation) => op.description || '-',
      sortable: true,
    },
    {
      key: 'repeat',
      header: 'Периодичность',
      render: (op: OperationWithRelations) => getPeriodicityLabel(op),
      width: '130px',
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Действия',
      sortable: false,
      render: (op: Operation) => (
        <div className="flex gap-2">
          {!op.isConfirmed ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirm(op.id);
                }}
                className="text-green-600 hover:text-green-800 dark:text-green-500 dark:hover:text-green-400 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                title="Подтвердить"
              >
                <Check size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(op.id);
                }}
                className="text-orange-600 hover:text-orange-800 dark:text-orange-500 dark:hover:text-orange-400 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
                title="Отклонить"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(op);
                }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                title="Копировать"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(op.id);
                }}
                className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      ),
      width: '120px',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Операции
          </h1>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <RecurringOperations onEdit={handleEdit} />
            <MappingRules />
            <ExportMenu
              filenameBase={`operations-${new Date().toISOString().split('T')[0]}`}
              buildRows={buildExportRows}
              columns={exportColumns}
            />
            <button
              onClick={handleImportClick}
              className="relative p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex items-center justify-center"
              title="Импорт выписки"
            >
              <FileUp
                size={18}
                className="text-primary-600 dark:text-primary-400"
              />
            </button>
            <Button
              onClick={handleCreate}
              size="sm"
              className="text-sm sm:text-base whitespace-nowrap"
            >
              <span className="hidden sm:inline">Создать операцию</span>
              <span className="sm:hidden">Создать</span>
            </Button>
          </div>
        </div>

        <Card>
          <div className="mb-4 space-y-4">
            {/* Основные фильтры - всегда видимы */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Основное
              </div>
              {/* На мобильных устройствах - горизонтальная прокрутка в один ряд */}
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 filters-scroll md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:overflow-x-visible md:pb-0 md:-mx-0 md:px-0">
                <div className="flex-shrink-0 w-[200px] md:w-auto md:flex-shrink">
                  <DateRangePicker
                    startDate={dateRangeStart}
                    endDate={dateRangeEnd}
                    onChange={handleDateRangeChange}
                    placeholder="Период"
                  />
                </div>
                <div className="flex-shrink-0 w-[160px] md:w-auto md:flex-shrink">
                  <Select
                    value={typeFilter}
                    onChange={(value) =>
                      setTypeFilter(
                        value as 'income' | 'expense' | 'transfer' | ''
                      )
                    }
                    options={[
                      { value: '', label: 'Тип операции' },
                      { value: 'income', label: 'Поступление' },
                      { value: 'expense', label: 'Списание' },
                      { value: 'transfer', label: 'Перевод' },
                    ]}
                    placeholder="Тип операции"
                    fullWidth={false}
                  />
                </div>
                <div className="flex-shrink-0 w-[160px] md:w-auto md:flex-shrink">
                  <Select
                    value={articleIdFilter}
                    onChange={(value) => setArticleIdFilter(value)}
                    options={[
                      { value: '', label: 'Статья' },
                      ...filteredArticles.map((a) => ({
                        value: a.id,
                        label: a.name,
                      })),
                    ]}
                    placeholder="Статья"
                    fullWidth={false}
                  />
                </div>
              </div>
            </div>

            {/* Дополнительные фильтры - показываются по кнопке */}
            {showAdvancedFilters && (
              <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-zinc-700">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Контекст
                </div>
                {/* На мобильных устройствах - горизонтальная прокрутка в один ряд */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 filters-scroll md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:overflow-x-visible md:pb-0 md:-mx-0 md:px-0">
                  <div className="flex-shrink-0 w-[160px] md:w-auto md:flex-shrink">
                    <Select
                      value={counterpartyIdFilter}
                      onChange={(value) => {
                        setCounterpartyIdFilter(value);
                        // Сбрасываем сделку при смене контрагента
                        if (!value) {
                          setDealIdFilter('');
                        }
                      }}
                      options={[
                        { value: '', label: 'Контрагент' },
                        ...counterparties.map((c) => ({
                          value: c.id,
                          label: c.name,
                        })),
                      ]}
                      placeholder="Контрагент"
                      fullWidth={false}
                    />
                  </div>
                  <div className="flex-shrink-0 w-[160px] md:w-auto md:flex-shrink">
                    <Select
                      value={dealIdFilter}
                      onChange={(value) => setDealIdFilter(value)}
                      options={[
                        { value: '', label: 'Сделка' },
                        ...filteredDeals.map((d) => ({
                          value: d.id,
                          label: d.name,
                        })),
                      ]}
                      placeholder="Сделка"
                      fullWidth={false}
                      disabled={
                        !counterpartyIdFilter && filteredDeals.length === 0
                      }
                    />
                  </div>
                  <div className="flex-shrink-0 w-[160px] md:w-auto md:flex-shrink">
                    <Select
                      value={departmentIdFilter}
                      onChange={(value) => setDepartmentIdFilter(value)}
                      options={[
                        { value: '', label: 'Отдел' },
                        ...departments.map((d) => ({
                          value: d.id,
                          label: d.name,
                        })),
                      ]}
                      placeholder="Отдел"
                      fullWidth={false}
                    />
                  </div>
                  <div className="flex-shrink-0 w-[160px] md:w-auto md:flex-shrink">
                    <Select
                      value={accountIdFilter}
                      onChange={(value) => setAccountIdFilter(value)}
                      options={[
                        { value: '', label: 'Счёт' },
                        ...accounts.map((a) => ({
                          value: a.id,
                          label: a.name,
                        })),
                      ]}
                      placeholder="Счёт"
                      fullWidth={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Кнопки управления фильтрами */}
            <div className="flex items-center justify-between gap-2">
              <Button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                variant="secondary"
                size="sm"
                className="text-sm"
              >
                {showAdvancedFilters
                  ? 'Скрыть дополнительные'
                  : 'Дополнительные фильтры'}
              </Button>
              {hasActiveFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 text-sm"
                >
                  <X size={16} />
                  <span>Сбросить фильтры</span>
                </Button>
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
          ) : isMobile ? (
            <div className="space-y-3">
              {sortedItems.map((op, index) => (
                <div
                  key={op.id || `operation-${index}`}
                  onClick={() => {
                    // Не открываем модальное окно редактирования, если есть выбранные элементы
                    if (selectedIds.length > 0) {
                      return;
                    }
                    handleEdit(op);
                  }}
                  className={`rounded-lg border p-4 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${
                    !op.isConfirmed
                      ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700'
                      : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      aria-label="Выбрать операцию"
                      checked={selectedIds.includes(op.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectOne(op.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 flex justify-between items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-zinc-400">
                        {formatDate(op.operationDate)}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getOperationTypeLabel(op.type)} —{' '}
                        {formatMoney(op.amount, op.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="text-gray-500 dark:text-zinc-400">
                        Статья:
                      </span>{' '}
                      {op.article?.name || '-'}
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-zinc-400">
                        Счёт:
                      </span>{' '}
                      {op.type === 'transfer'
                        ? `${op.sourceAccount?.name || '-'} → ${
                            op.targetAccount?.name || '-'
                          }`
                        : op.account?.name || '-'}
                    </div>
                    {(op.repeat !== 'none' || op.recurrenceParentId) && (
                      <div>
                        <span className="text-gray-500 dark:text-zinc-400">
                          Периодичность:
                        </span>{' '}
                        {getPeriodicityLabel(op)}
                      </div>
                    )}
                    {op.description && (
                      <div>
                        <span className="text-gray-500 dark:text-zinc-400">
                          Описание:
                        </span>{' '}
                        {op.description}
                      </div>
                    )}
                  </div>

                  <div
                    className="flex justify-end gap-3 mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!op.isConfirmed ? (
                      <>
                        <button
                          onClick={() => handleConfirm(op.id)}
                          title="Подтвердить"
                          className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded transition-colors"
                        >
                          <Check
                            size={16}
                            className="text-green-600 dark:text-green-500"
                          />
                        </button>
                        <button
                          onClick={() => handleReject(op.id)}
                          title="Отклонить"
                          className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded transition-colors"
                        >
                          <X
                            size={16}
                            className="text-orange-600 dark:text-orange-500"
                          />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCopy(op)}
                          title="Копировать"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                        >
                          <Copy
                            size={16}
                            className="text-blue-500 dark:text-blue-300"
                          />
                        </button>
                        <button
                          onClick={() => handleDelete(op.id)}
                          title="Удалить"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                        >
                          <Trash2
                            size={16}
                            className="text-red-600 dark:text-red-500"
                          />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table
              columns={columns}
              data={sortedItems}
              keyExtractor={(op, index) => op.id || `operation-${index}`}
              rowClassName={(op) =>
                !op.isConfirmed ? 'bg-yellow-50 dark:bg-yellow-950/30' : ''
              }
              onRowClick={(op) => {
                // Не открываем модальное окно редактирования, если есть выбранные элементы
                if (selectedIds.length > 0) {
                  return;
                }
                handleEdit(op);
              }}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}
          <BulkActionsBar
            selectedCount={selectedIds.length}
            onClear={clearSelection}
            className="sticky top-4 z-30 shadow-sm"
            actions={[
              {
                label: `Удалить выбранные (${selectedIds.length})`,
                variant: 'danger',
                onClick: () => {
                  setDeleteModal({
                    isOpen: true,
                    id: null,
                    type: 'bulk',
                    ids: selectedIds,
                  });
                },
              },
            ]}
          />
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
          size="2xl"
        >
          <OperationForm
            operation={editingOperation}
            isCopy={isCopying}
            onClose={handleCloseForm}
          />
        </Modal>

        <ConfirmDeleteModal
          isOpen={deleteModal.isOpen}
          onClose={() =>
            setDeleteModal({ isOpen: false, id: null, type: 'delete' })
          }
          onConfirm={handleModalConfirm}
          title={
            deleteModal.type === 'reject'
              ? 'Подтверждение отклонения'
              : deleteModal.type === 'bulk'
                ? 'Подтверждение удаления'
                : 'Подтверждение удаления'
          }
          message={
            deleteModal.type === 'reject'
              ? 'Вы уверены, что хотите отклонить эту операцию?'
              : deleteModal.type === 'bulk'
                ? `Вы уверены, что хотите удалить выбранные операции (${deleteModal.ids?.length || 0})?`
                : 'Вы уверены, что хотите удалить эту операцию?'
          }
          confirmText={
            deleteModal.type === 'reject'
              ? 'Отклонить'
              : deleteModal.type === 'bulk'
                ? `Удалить ${deleteModal.ids?.length || 0}`
                : 'Удалить'
          }
          variant={deleteModal.type === 'reject' ? 'warning' : 'delete'}
        />

        <BankImportModal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            // Перезагружаем операции после закрытия модального окна импорта
            reloadOperationsData();
          }}
        />
      </div>
    </Layout>
  );
};
