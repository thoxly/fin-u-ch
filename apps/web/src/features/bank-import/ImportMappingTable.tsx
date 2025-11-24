/**
 * TODO: Написать E2E тесты для функционала импорта
 * Файл тестов: apps/web/e2e/bank-import.spec.ts
 * См. ТЗ: раздел "Тестирование" → "E2E тесты (Playwright)"
 * Тесты должны покрывать: загрузку файла, редактирование маппинга, импорт операций
 */
import { useState } from 'react';
import {
  Check,
  Download,
  FileCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Select } from '../../shared/ui/Select';
import { OffCanvas } from '../../shared/ui/OffCanvas';
import {
  useGetImportedOperationsQuery,
  useBulkUpdateImportedOperationsMutation,
  useImportOperationsMutation,
  useUpdateImportedOperationMutation,
} from '../../store/api/importsApi';
import { useGetAccountsQuery } from '../../store/api/catalogsApi';
import { formatDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { useNotification } from '../../shared/hooks/useNotification';
import { useLeafArticles } from '../../shared/hooks/useArticleTree';
import type { ImportedOperation } from '@shared/types/imports';
import { ImportMappingRow } from './ImportMappingRow';
import { SaveRulesCell } from './SaveRulesCell';
import { CounterpartyForm } from '../catalog-forms/CounterpartyForm/CounterpartyForm';
import { ArticleForm } from '../catalog-forms/ArticleForm/ArticleForm';
import { AccountForm } from '../catalog-forms/AccountForm/AccountForm';
import { DealForm } from '../catalog-forms/DealForm/DealForm';
import { DepartmentForm } from '../catalog-forms/DepartmentForm/DepartmentForm';

interface ImportMappingTableProps {
  sessionId: string;
  onClose: () => void;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

export const ImportMappingTable = ({
  sessionId,
  onClose,
  isCollapsed = false,
  onCollapseChange,
}: ImportMappingTableProps) => {
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchedFilter, setMatchedFilter] = useState<boolean | undefined>(
    undefined
  );
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

  const limit = 20;

  const { data, refetch } = useGetImportedOperationsQuery({
    sessionId,
    limit,
    offset: page * limit,
    matched: matchedFilter,
  });

  // Используем только листья (статьи без дочерних) для операций
  const { leafArticles: articles = [] } = useLeafArticles({ isActive: true });
  const { data: accounts = [] } = useGetAccountsQuery();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [bulkUpdate] = useBulkUpdateImportedOperationsMutation();
  const [importOperations, { isLoading: isImporting }] =
    useImportOperationsMutation();
  const [updateImportedOperation] = useUpdateImportedOperationMutation();
  const { showSuccess, showError } = useNotification();

  const operations = data?.operations || [];
  const total = data?.total || 0;
  const unmatchedCount = data?.unmatched || 0;

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
        const updateData: {
          matchedCounterpartyId?: string;
          matchedArticleId?: string;
          matchedAccountId?: string;
          matchedDealId?: string;
          matchedDepartmentId?: string;
          currency?: string;
          direction?: 'income' | 'expense' | 'transfer';
        } = {};
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
            updateData.direction = article.type as
              | 'income'
              | 'expense'
              | 'transfer';
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

  const isAllMatched = operations.every(checkOperationMatched);
  const selectedOperations = operations.filter((op) =>
    selectedIds.includes(op.id)
  );
  const isSelectedMatched =
    selectedIds.length === 0
      ? isAllMatched
      : selectedOperations.every(checkOperationMatched);

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
        onClose();
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
      header: '№',
      render: (op: ImportedOperation) => op.number || '-',
      width: '80px',
    },
    {
      key: 'date',
      header: 'Дата',
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
      header: 'Сумма',
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
      header: 'Тип операции',
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="direction"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
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
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          disabled={op.processed}
        />
      ),
      width: '180px',
    },
    {
      key: 'article',
      header: 'Статья',
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="article"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          disabled={op.processed}
        />
      ),
      width: '180px',
    },
    {
      key: 'account',
      header: 'Счет',
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="account"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
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
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
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
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          disabled={op.processed}
        />
      ),
      width: '150px',
    },
    {
      key: 'currency',
      header: 'Валюта',
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="currency"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
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
          sessionId={sessionId}
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
      width: '100px',
    },
  ];

  if (isCollapsed) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck
              size={20}
              className="text-primary-600 dark:text-primary-400"
            />
            <h3 className="text-lg font-semibold">Импортированные операции</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCollapseChange?.(false)}
              className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Развернуть"
            >
              <ChevronUp size={20} />
            </button>
            <Button onClick={onClose} variant="secondary" size="sm">
              Закрыть
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Таблица маппинга свернута. Нажмите, чтобы развернуть.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок с кнопкой сворачивания */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Импортированные операции</h2>
        <div className="flex items-center gap-2">
          {onCollapseChange && (
            <button
              onClick={() => onCollapseChange(true)}
              className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Свернуть"
            >
              <ChevronDown size={20} />
            </button>
          )}
          <Button onClick={onClose} variant="secondary" size="sm">
            Закрыть
          </Button>
        </div>
      </div>

      {/* Статистика и фильтры */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Всего: {total}
          </span>
          <span className="text-yellow-600 dark:text-yellow-400">
            Несопоставлено: {unmatchedCount}
          </span>
          {!isAllMatched && (
            <span className="text-red-600 dark:text-red-400">
              Не все операции сопоставлены
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={matchedFilter === undefined ? '' : String(matchedFilter)}
            onChange={(e) =>
              setMatchedFilter(
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
            options={[
              { value: '', label: 'Все' },
              { value: 'true', label: 'Сопоставленные' },
              { value: 'false', label: 'Несопоставленные' },
            ]}
            className="w-40"
          />
        </div>
      </div>

      {/* Таблица */}
      <div className="border rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={operations}
          keyExtractor={(op) => op.id}
          rowClassName={(op) =>
            op.processed
              ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60'
              : !op.confirmed
                ? 'bg-yellow-50 dark:bg-yellow-900/10'
                : ''
          }
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
          disabled={isImporting || total === 0 || !isSelectedMatched}
          className="btn-primary"
          title={
            !isSelectedMatched
              ? 'Не все операции сопоставлены. Убедитесь, что у всех операций указаны: тип операции, статья, счет и валюта (или счета для переводов)'
              : undefined
          }
        >
          <Download size={16} className="mr-2" />
          Импортировать{' '}
          {selectedIds.length > 0
            ? `выбранные (${selectedIds.length})`
            : 'все операции'}
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
              (createModal.operation.direction as
                | 'income'
                | 'expense'
                | 'transfer') || 'expense'
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
    </div>
  );
};
