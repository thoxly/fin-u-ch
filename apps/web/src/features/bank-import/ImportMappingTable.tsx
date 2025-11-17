/**
 * TODO: Написать E2E тесты для функционала импорта
 * Файл тестов: apps/web/e2e/bank-import.spec.ts
 * См. ТЗ: раздел "Тестирование" → "E2E тесты (Playwright)"
 * Тесты должны покрывать: загрузку файла, редактирование маппинга, импорт операций
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Check,
  Download,
  FileCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Copy,
} from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { OffCanvas } from '../../shared/ui/OffCanvas';
import {
  useGetImportedOperationsQuery,
  useLazyGetAllImportedOperationsQuery,
  useBulkUpdateImportedOperationsMutation,
  useImportOperationsMutation,
  useUpdateImportedOperationMutation,
} from '../../store/api/importsApi';
import {
  useGetDealsQuery,
  useGetDepartmentsQuery,
  useGetArticlesQuery,
  useGetAccountsQuery,
} from '../../store/api/catalogsApi';
import { useGetCompanyQuery } from '../../store/api/companiesApi';
import { formatDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { useNotification } from '../../shared/hooks/useNotification';
import type { ImportedOperation } from '@shared/types/imports';
import { ImportMappingRow } from './ImportMappingRow';
import { SaveRulesCell } from './SaveRulesCell';
import { CounterpartyForm } from '../catalog-forms/CounterpartyForm/CounterpartyForm';
import { ArticleForm } from '../catalog-forms/ArticleForm/ArticleForm';
import { AccountForm } from '../catalog-forms/AccountForm/AccountForm';
import { DealForm } from '../catalog-forms/DealForm/DealForm';
import { DepartmentForm } from '../catalog-forms/DepartmentForm/DepartmentForm';
import { ApplySimilarPopover } from './ApplySimilarPopover';
import { findSimilarOperations } from './utils/findSimilarOperations';
import { useUndoManager } from './hooks/useUndoManager';
import { UndoToast } from '../../shared/ui/UndoToast';

interface ImportMappingTableProps {
  sessionId: string;
  onClose: () => void;
  onImportSuccess?: () => void;
}

type SortField = 'date' | 'amount' | 'number' | null;
type SortDirection = 'asc' | 'desc';

export const ImportMappingTable = ({
  sessionId,
  onClose,
  onImportSuccess,
}: ImportMappingTableProps) => {
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchedFilter, setMatchedFilter] = useState<boolean | undefined>(
    undefined
  );
  const [duplicateFilter, setDuplicateFilter] = useState<boolean | undefined>(
    undefined
  );
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [operationsToSaveRules, setOperationsToSaveRules] = useState<
    Set<string>
  >(new Set());

  // Состояние для модалки создания
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    field:
      | 'counterparty'
      | 'article'
      | 'account'
      | 'deal'
      | 'department'
      | 'currency'
      | null;
    operation: ImportedOperation | null;
  }>({
    isOpen: false,
    field: null,
    operation: null,
  });

  // Состояние для попо вера применения к похожим операциям
  const [similarPopover, setSimilarPopover] = useState<{
    isOpen: boolean;
    field:
      | 'counterparty'
      | 'article'
      | 'account'
      | 'deal'
      | 'department'
      | 'currency'
      | 'direction'
      | null;
    value: string;
    operation: ImportedOperation | null;
    similarOperations: ImportedOperation[];
    anchorPosition: { top: number; left: number; right?: number };
    updateData: Record<string, unknown>; // Данные для обновления, которые будут применены после выбора
  }>({
    isOpen: false,
    field: null,
    value: '',
    operation: null,
    similarOperations: [],
    anchorPosition: { top: 0, left: 0 },
    updateData: {},
  });

  const limit = 20;

  const [getAllOperations] = useLazyGetAllImportedOperationsQuery();

  const { data, isLoading, refetch } = useGetImportedOperationsQuery({
    sessionId,
    limit,
    offset: page * limit,
    matched: matchedFilter,
    duplicate: duplicateFilter,
  });

  const { data: articles = [] } = useGetArticlesQuery({ isActive: true });
  const { data: accounts = [] } = useGetAccountsQuery();

  const [importOperations, { isLoading: isImporting }] =
    useImportOperationsMutation();
  const [updateImportedOperation] = useUpdateImportedOperationMutation();
  const [bulkUpdate] = useBulkUpdateImportedOperationsMutation();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const location: ReturnType<typeof useLocation> = useLocation();

  // Undo manager
  const { isUndoAvailable, undoDescription, registerChange, undo, cancelUndo } =
    useUndoManager({
      onUndo: () => {
        showSuccess('Изменение отменено');
        refetch();
      },
    });

  // Проверяем, все ли операции сопоставлены
  const checkOperationMatched = (op: ImportedOperation): boolean => {
    if (!op.direction) return false;

    const currency = op.currency || 'RUB';
    const hasRequiredFields = !!(
      op.matchedArticleId &&
      op.matchedAccountId &&
      currency
    );

    if (op.direction === 'transfer') {
      return hasRequiredFields && !!(op.payerAccount && op.receiverAccount);
    }
    return hasRequiredFields;
  };

  let operations = data?.operations || [];
  const total = data?.total || 0;
  const unmatchedCount = data?.unmatched || 0;
  const duplicatesCount = data?.duplicates || 0;

  // Сортировка операций
  operations = [...operations].sort((a, b) => {
    // Сначала проверяем сопоставление (несопоставленные сверху)
    const aMatched = checkOperationMatched(a);
    const bMatched = checkOperationMatched(b);

    if (aMatched !== bMatched) {
      return aMatched ? 1 : -1; // несопоставленные (false) идут первыми
    }

    // Если есть выбранное поле сортировки, используем его
    if (sortField) {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'number': {
          const numA = parseInt(a.number || '0', 10);
          const numB = parseInt(b.number || '0', 10);
          comparison = numA - numB;
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    }

    // По умолчанию сортируем по дате (новые сверху)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Функция для открытия модалки создания
  const handleOpenCreateModal = (
    field:
      | 'counterparty'
      | 'article'
      | 'account'
      | 'deal'
      | 'department'
      | 'currency',
    operation: ImportedOperation
  ) => {
    setCreateModal({
      isOpen: true,
      field,
      operation,
    });
  };

  // Функция для закрытия модалки
  const handleCloseModal = () => {
    setCreateModal({
      isOpen: false,
      field: null,
      operation: null,
    });
  };

  // Функция для обработки успешного создания элемента
  const handleCreateSuccess = async (createdId: string) => {
    if (createModal.operation && createModal.field) {
      try {
        const updateData: Record<string, unknown> = {};
        if (createModal.field === 'counterparty') {
          updateData.matchedCounterpartyId = createdId;
          // Автоматически устанавливаем счет, если он был найден в операции
          const account = getAccountFromOperation(createModal.operation);
          if (account) {
            updateData.matchedAccountId = account.id;
          }
        } else if (createModal.field === 'article') {
          updateData.matchedArticleId = createdId;
          // Автоматически устанавливаем тип операции из статьи
          const article = articles.find((a) => a.id === createdId);
          if (article && article.type) {
            // Статьи могут быть только income или expense, не transfer
            updateData.direction = article.type as 'income' | 'expense';
          }
        } else if (createModal.field === 'account') {
          updateData.matchedAccountId = createdId;
        } else if (createModal.field === 'deal') {
          updateData.matchedDealId = createdId;
        } else if (createModal.field === 'department') {
          updateData.matchedDepartmentId = createdId;
        } else if (createModal.field === 'currency') {
          updateData.currency = createdId;
        }

        await updateImportedOperation({
          id: createModal.operation.id,
          data: updateData,
        }).unwrap();

        showSuccess('Элемент создан и выбран');
        handleCloseModal();
      } catch (error) {
        showError('Ошибка при выборе созданного элемента');
      }
    }
  };

  // Функция для проверки наличия похожих операций после изменения поля
  const handleFieldUpdate = async (
    operation: ImportedOperation,
    field:
      | 'counterparty'
      | 'article'
      | 'account'
      | 'deal'
      | 'department'
      | 'currency'
      | 'direction',
    value: string,
    updateData: Record<string, unknown>,
    event: React.MouseEvent
  ) => {
    try {
      // Получаем ВСЕ операции сессии для поиска похожих
      const response = await getAllOperations({ sessionId }).unwrap();
      const allOperations = response.operations || [];

      // Находим похожие операции
      const similar = findSimilarOperations(operation, allOperations);

      // Если есть похожие операции, показываем popover БЕЗ обновления текущей операции
      if (similar.length > 0) {
        // Получаем позицию элемента для показа popover
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        setSimilarPopover({
          isOpen: true,
          field,
          value,
          operation,
          similarOperations: similar,
          anchorPosition: {
            top: rect.bottom,
            left: rect.left,
            right: rect.right,
          },
          updateData, // Сохраняем данные для последующего обновления
        });

        return true; // Возвращаем true чтобы ImportMappingRow знал что показан popover
      }

      return false; // Нет похожих операций
    } catch (error) {
      console.error('Error loading all operations:', error);
      return false;
    }
  };

  // Обработчик применения значения ко всем похожим операциям
  const handleApplySimilar = async () => {
    if (!similarPopover.operation || !similarPopover.field) {
      return;
    }

    try {
      // Используем сохраненные данные для обновления
      const updateData = similarPopover.updateData;

      // Применяем обновление ко всем похожим операциям + текущая операция
      const operationIds = [
        similarPopover.operation.id, // Текущая операция
        ...similarPopover.similarOperations.map((op) => op.id), // Похожие операции
      ];

      await bulkUpdate({
        sessionId,
        data: {
          operationIds,
          ...updateData,
        },
      }).unwrap();

      showSuccess(
        `✓ Применено к ${similarPopover.similarOperations.length} похожим операциям`
      );

      // Закрываем popover
      setSimilarPopover({
        isOpen: false,
        field: null,
        value: '',
        operation: null,
        similarOperations: [],
        anchorPosition: { top: 0, left: 0 },
        updateData: {},
      });

      // Обновляем данные
      refetch();
    } catch (error) {
      showError('Ошибка при применении к похожим операциям');
    }
  };

  // Обработчик пропуска применения к похожим операциям (обновляем только текущую операцию)
  const handleSkipSimilar = async () => {
    if (!similarPopover.operation) {
      return;
    }

    try {
      // Обновляем только текущую операцию
      await updateImportedOperation({
        id: similarPopover.operation.id,
        data: similarPopover.updateData,
      }).unwrap();

      showSuccess('Обновлено');

      // Закрываем popover
      setSimilarPopover({
        isOpen: false,
        field: null,
        value: '',
        operation: null,
        similarOperations: [],
        anchorPosition: { top: 0, left: 0 },
        updateData: {},
      });

      // Обновляем данные
      refetch();
    } catch (error) {
      showError('Ошибка при обновлении');
    }
  };

  // Обработчик закрытия попо вера без действий (отменяет изменения)
  const handleClosePopover = () => {
    // Просто закрываем попо вер без обновления - операция остается в прежнем состоянии
    setSimilarPopover({
      isOpen: false,
      field: null,
      value: '',
      operation: null,
      similarOperations: [],
      anchorPosition: { top: 0, left: 0 },
      updateData: {},
    });
  };

  // Функция для получения паттерна для предзаполнения
  const getPatternForRule = (
    operation: ImportedOperation,
    field: 'counterparty' | 'article' | 'account' | 'deal' | 'department'
  ) => {
    switch (field) {
      case 'counterparty':
        return operation.direction === 'expense'
          ? operation.receiver
          : operation.payer;
      case 'article':
        return operation.description;
      case 'account':
        return operation.payerAccount || operation.receiverAccount || '';
      case 'deal':
        return operation.description;
      case 'department':
        return '';
      default:
        return null;
    }
  };

  // Функция для получения ИНН из операции
  const getInnFromOperation = (operation: ImportedOperation) => {
    return operation.direction === 'expense'
      ? operation.receiverInn
      : operation.payerInn;
  };

  // Функция для получения счета из операции (по номеру счета)
  const getAccountFromOperation = (operation: ImportedOperation) => {
    const accountNumber =
      operation.direction === 'expense'
        ? operation.payerAccount
        : operation.receiverAccount;

    if (accountNumber) {
      return accounts.find((a) => a.number === accountNumber && a.isActive);
    }
    return null;
  };

  const isAllMatched = operations.every(checkOperationMatched);
  const selectedOperations = operations.filter((op) =>
    selectedIds.includes(op.id)
  );
  const isSelectedMatched =
    selectedIds.length === 0
      ? isAllMatched
      : selectedOperations.every(checkOperationMatched);

  // Проверяем, есть ли необработанные операции
  const unprocessedOperations = operations.filter((op) => !op.processed);
  const hasUnprocessedOperations = unprocessedOperations.length > 0;
  const selectedUnprocessedCount =
    selectedIds.length > 0
      ? selectedOperations.filter((op) => !op.processed).length
      : unprocessedOperations.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Выбираем только необработанные операции
      setSelectedIds(
        operations.filter((op) => !op.processed).map((op) => op.id)
      );
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    // Не позволяем выбирать обработанные операции
    const operation = operations.find((op) => op.id === id);
    if (operation?.processed) {
      return;
    }

    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const handleToggleRuleSave = (operationId: string, shouldSave: boolean) => {
    setOperationsToSaveRules((prev) => {
      const next = new Set(prev);
      if (shouldSave) {
        next.add(operationId);
      } else {
        next.delete(operationId);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Переключаем направление, если кликнули на ту же колонку
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Устанавливаем новую колонку с направлением по умолчанию
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <ArrowUp
          size={14}
          className="opacity-0 group-hover:opacity-30 transition-opacity"
        />
      );
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="text-primary-600 dark:text-primary-400" />
    ) : (
      <ArrowDown size={14} className="text-primary-600 dark:text-primary-400" />
    );
  };

  const handleImport = async () => {
    try {
      const operationIds = selectedIds.length > 0 ? selectedIds : undefined;
      const saveRulesForIds = Array.from(operationsToSaveRules).filter(
        (id) => !operationIds || operationIds.includes(id)
      );

      const result = await importOperations({
        sessionId,
        data: {
          operationIds,
          saveRulesForIds:
            saveRulesForIds.length > 0 ? saveRulesForIds : undefined,
        },
      }).unwrap();
      showSuccess(
        `Импортировано операций: ${result.created}. Ошибок: ${result.errors}`
      );
      refetch();
      if (result.errors === 0) {
        // Вызываем callback для полного закрытия модального окна и обновления данных
        if (onImportSuccess) {
          onImportSuccess();
        } else {
          // Fallback: просто закрываем текущий экран
          onClose();
        }
        // Переходим на страницу операций, если мы не на ней
        if (location.pathname !== '/operations') {
          navigate('/operations');
        }
      }
    } catch (error) {
      showError('Ошибка при импорте операций');
    }
  };

  const columns = [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={
            operations.length > 0 &&
            operations.filter((op) => !op.processed).length > 0 &&
            selectedIds.length ===
              operations.filter((op) => !op.processed).length
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300"
        />
      ),
      render: (op: ImportedOperation) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(op.id)}
          onChange={(e) => handleSelectOne(op.id, e.target.checked)}
          disabled={op.processed}
          className="rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title={op.processed ? 'Операция распределена' : ''}
        />
      ),
      width: '50px',
    },
    {
      key: 'number',
      header: (
        <button
          onClick={() => handleSort('number')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          № <SortIcon field="number" />
        </button>
      ),
      render: (op: ImportedOperation) => op.number || '-',
      width: '80px',
    },
    {
      key: 'date',
      header: (
        <button
          onClick={() => handleSort('date')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          Дата <SortIcon field="date" />
        </button>
      ),
      render: (op: ImportedOperation) => formatDate(op.date),
      width: '120px',
    },
    {
      key: 'description',
      header: 'Назначение',
      render: (op: ImportedOperation) => (
        <div className="truncate" title={op.description}>
          {op.description}
        </div>
      ),
      width: '200px',
    },
    {
      key: 'amount',
      header: (
        <button
          onClick={() => handleSort('amount')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          Сумма <SortIcon field="amount" />
        </button>
      ),
      render: (op: ImportedOperation) => formatMoney(op.amount, 'RUB'),
      width: '120px',
    },
    {
      key: 'payer',
      header: 'Плательщик',
      render: (op: ImportedOperation) => (
        <div className="text-xs">
          <div className="truncate" title={op.payer || ''}>
            {op.payer || '-'}
          </div>
          {op.payerInn && (
            <div className="text-gray-500 dark:text-gray-400 mt-1">
              ИНН: {op.payerInn}
            </div>
          )}
        </div>
      ),
      width: '180px',
    },
    {
      key: 'receiver',
      header: 'Получатель',
      render: (op: ImportedOperation) => (
        <div className="text-xs">
          <div className="truncate" title={op.receiver || ''}>
            {op.receiver || '-'}
          </div>
          {op.receiverInn && (
            <div className="text-gray-500 dark:text-gray-400 mt-1">
              ИНН: {op.receiverInn}
            </div>
          )}
        </div>
      ),
      width: '180px',
    },
    {
      key: 'direction',
      header: (
        <span className="flex items-center gap-1">
          Тип операции
          <span className="text-red-500" title="Обязательное поле">
            *
          </span>
        </span>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="direction"
          _sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          onRegisterChange={registerChange}
          disabled={op.processed}
        />
      ),
      width: '120px',
    },
    {
      key: 'counterparty',
      header: 'Контрагент',
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="counterparty"
          _sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          disabled={op.processed}
        />
      ),
      width: '180px',
    },
    {
      key: 'article',
      header: (
        <span className="flex items-center gap-1">
          Статья
          <span className="text-red-500" title="Обязательное поле">
            *
          </span>
        </span>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="article"
          _sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          onRegisterChange={registerChange}
          disabled={op.processed}
        />
      ),
      width: '180px',
    },
    {
      key: 'account',
      header: (
        <span className="flex items-center gap-1">
          Счет
          <span className="text-red-500" title="Обязательное поле">
            *
          </span>
        </span>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="account"
          _sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          onRegisterChange={registerChange}
          disabled={op.processed}
        />
      ),
      width: '150px',
    },
    {
      key: 'deal',
      header: 'Сделка',
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="deal"
          _sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          onRegisterChange={registerChange}
          disabled={op.processed}
        />
      ),
      width: '150px',
    },
    {
      key: 'department',
      header: 'Подразделение',
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="department"
          _sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          onRegisterChange={registerChange}
          disabled={op.processed}
        />
      ),
      width: '150px',
    },
    {
      key: 'currency',
      header: (
        <span className="flex items-center gap-1">
          Валюта
          <span className="text-red-500" title="Обязательное поле">
            *
          </span>
        </span>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="currency"
          _sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          onRegisterChange={registerChange}
          disabled={op.processed}
        />
      ),
      width: '100px',
    },
    {
      key: 'rules',
      header: 'Правила',
      render: (op: ImportedOperation) => (
        <SaveRulesCell
          operation={op}
          _sessionId={sessionId}
          onToggle={handleToggleRuleSave}
          disabled={op.processed}
        />
      ),
      width: '150px',
    },
    {
      key: 'status',
      header: 'Статус',
      render: (op: ImportedOperation) => (
        <div className="flex items-center gap-2">
          {op.isDuplicate && (
            <span
              className="text-orange-600 dark:text-orange-400"
              title="Возможный дубликат - операция с похожими параметрами уже существует"
            >
              <Copy size={16} />
            </span>
          )}
          {op.matchedBy && (
            <span
              className="text-green-600 dark:text-green-400"
              title="Автосопоставлено"
            >
              <Check size={16} />
            </span>
          )}
          {!op.matchedBy && (
            <span
              className="text-yellow-600 dark:text-yellow-400"
              title="Требует внимания"
            >
              <AlertCircle size={16} />
            </span>
          )}
          {op.confirmed && (
            <span
              className="text-blue-600 dark:text-blue-400"
              title="Подтверждено"
            >
              <FileCheck size={16} />
            </span>
          )}
        </div>
      ),
      width: '120px',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Кнопка возврата */}
      <div className="flex items-start">
        <Button
          onClick={onClose}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Вернуться к истории
        </Button>
      </div>

      {/* Информационный блок */}
      {unmatchedCount > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">
                Для импорта необходимо заполнить обязательные поля
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                Обязательные поля отмечены красной звездочкой (
                <span className="text-red-500">*</span>):
                <strong> Тип операции, Статья, Счет, Валюта</strong>.
                Незаполненные обязательные поля подсвечены красной рамкой.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Статистика и фильтры */}
      <div className="flex items-center justify-between gap-4 flex-wrap p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          {unmatchedCount === 0 && duplicatesCount === 0 ? (
            <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
              <Check size={16} />
              Все операции сопоставлены: {total}
            </span>
          ) : (
            <>
              <span className="text-gray-600 dark:text-gray-400">
                Всего: {total}
              </span>
              {unmatchedCount > 0 && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  Несопоставлено: {unmatchedCount}
                </span>
              )}
              {duplicatesCount > 0 && (
                <span className="text-orange-600 dark:text-orange-400">
                  Дубликатов: {duplicatesCount}
                </span>
              )}
            </>
          )}
          {!isAllMatched && unmatchedCount > 0 && (
            <span className="text-red-600 dark:text-red-400">
              Не все операции сопоставлены
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Группа кнопок фильтра по сопоставлению */}
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5">
            <button
              type="button"
              onClick={() => setMatchedFilter(undefined)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                matchedFilter === undefined
                  ? 'bg-primary-600 text-white dark:bg-primary-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setMatchedFilter(true)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                matchedFilter === true
                  ? 'bg-primary-600 text-white dark:bg-primary-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Сопоставленные
            </button>
            <button
              type="button"
              onClick={() => setMatchedFilter(false)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                matchedFilter === false
                  ? 'bg-primary-600 text-white dark:bg-primary-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Несопоставленные
            </button>
          </div>

          {/* Группа кнопок фильтра по дубликатам */}
          {duplicatesCount > 0 && (
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5">
              <button
                type="button"
                onClick={() => setDuplicateFilter(undefined)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  duplicateFilter === undefined
                    ? 'bg-primary-600 text-white dark:bg-primary-500'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setDuplicateFilter(true)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  duplicateFilter === true
                    ? 'bg-orange-600 text-white dark:bg-orange-500'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                Только дубликаты
              </button>
              <button
                type="button"
                onClick={() => setDuplicateFilter(false)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  duplicateFilter === false
                    ? 'bg-primary-600 text-white dark:bg-primary-500'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                Без дубликатов
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Таблица */}
      <div className="border rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={operations}
          keyExtractor={(op) => op.id}
          rowClassName={(op) => {
            if (op.processed) {
              return 'bg-gray-100 dark:bg-gray-800/50 opacity-60';
            }

            const isMatched = checkOperationMatched(op);

            const bgColor = isMatched
              ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-yellow-50 dark:bg-yellow-900/20';

            let borderColor = '';
            if (op.isDuplicate) {
              borderColor = 'border-orange-500';
            } else {
              borderColor = isMatched
                ? 'border-green-500'
                : 'border-yellow-500';
            }

            return `${bgColor} border-l-4 ${borderColor}`;
          }}
        />
      </div>

      {/* Пагинация */}
      {Math.ceil(total / limit) > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Страница {page + 1} из {Math.ceil(total / limit)}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="btn-secondary"
              title="Предыдущая страница"
            >
              <ChevronLeft size={20} />
            </Button>
            <Button
              onClick={() =>
                setPage(Math.min(Math.ceil(total / limit) - 1, page + 1))
              }
              disabled={page >= Math.ceil(total / limit) - 1}
              className="btn-secondary"
              title="Следующая страница"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>
      )}

      {/* Действия */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        {/* TODO: Добавить кнопку "Экспорт шаблонов" для экспорта правил в JSON
                  См. ТЗ: раздел "Frontend: UI компоненты" → "2. Таблица маппинга" → "Кнопки"
                  Функция должна экспортировать все правила маппинга в JSON формате */}
        <Button
          onClick={handleImport}
          disabled={
            isImporting ||
            total === 0 ||
            !isSelectedMatched ||
            !hasUnprocessedOperations ||
            selectedUnprocessedCount === 0
          }
          className="btn-primary"
          title={
            !hasUnprocessedOperations
              ? 'Все операции уже импортированы'
              : selectedUnprocessedCount === 0
                ? 'Выбранные операции уже импортированы'
                : !isSelectedMatched
                  ? 'Не все операции сопоставлены. Убедитесь, что у всех операций указаны: тип операции, статья, счет и валюта (или счета для переводов)'
                  : undefined
          }
        >
          <Download size={16} className="mr-2" />
          {!hasUnprocessedOperations
            ? 'Все операции импортированы'
            : selectedIds.length > 0
              ? `Импортировать выбранные (${selectedUnprocessedCount})`
              : 'Импортировать'}
        </Button>
      </div>

      {/* OffCanvas для создания контрагентов, статей, счетов, сделок, подразделений и валют */}
      <OffCanvas
        isOpen={
          createModal.isOpen && !!createModal.field && !!createModal.operation
        }
        title={
          createModal.field === 'counterparty'
            ? 'Создание контрагента'
            : createModal.field === 'article'
              ? 'Создание статьи'
              : createModal.field === 'account'
                ? 'Создание счета'
                : createModal.field === 'deal'
                  ? 'Создание сделки'
                  : createModal.field === 'department'
                    ? 'Создание подразделения'
                    : createModal.field === 'currency'
                      ? 'Создание валюты'
                      : ''
        }
        onClose={handleCloseModal}
      >
        {createModal.field === 'counterparty' && createModal.operation ? (
          <CounterpartyForm
            counterparty={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
            initialName={
              getPatternForRule(createModal.operation, 'counterparty') || ''
            }
            initialInn={getInnFromOperation(createModal.operation) || ''}
            initialAccountId={
              getAccountFromOperation(createModal.operation)?.id
            }
          />
        ) : createModal.field === 'article' && createModal.operation ? (
          <ArticleForm
            article={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
            initialName={
              getPatternForRule(createModal.operation, 'article') || ''
            }
            initialType={
              // Статьи не бывают типа transfer, используем expense как fallback
              createModal.operation.direction === 'transfer'
                ? 'expense'
                : (createModal.operation.direction as 'income' | 'expense') ||
                  'expense'
            }
          />
        ) : createModal.field === 'account' && createModal.operation ? (
          <AccountForm
            account={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
            initialNumber={
              getPatternForRule(createModal.operation, 'account') || ''
            }
          />
        ) : createModal.field === 'deal' && createModal.operation ? (
          <DealForm
            deal={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
          />
        ) : createModal.field === 'department' ? (
          <DepartmentForm
            department={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
          />
        ) : createModal.field === 'currency' && createModal.operation ? (
          <div className="p-4">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Валюты выбираются из предопределенного списка. Для добавления
              новой валюты обратитесь к администратору.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Текущая валюта операции: {createModal.operation.currency || 'RUB'}
            </p>
          </div>
        ) : null}
      </OffCanvas>

      {/* Popover для применения к похожим операциям */}
      <ApplySimilarPopover
        isOpen={similarPopover.isOpen}
        onClose={handleClosePopover}
        onApply={handleApplySimilar}
        onSkip={handleSkipSimilar}
        similarCount={similarPopover.similarOperations.length}
        anchorPosition={similarPopover.anchorPosition}
        fieldLabel={similarPopover.field || ''}
      />

      {/* Toast для отмены изменений */}
      <UndoToast
        message={undoDescription}
        isVisible={isUndoAvailable}
        onUndo={undo}
        onClose={cancelUndo}
      />
    </div>
  );
};
