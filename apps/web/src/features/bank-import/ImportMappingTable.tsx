/**
 * TODO: Написать E2E тесты для функционала импорта
 * Файл тестов: apps/web/e2e/bank-import.spec.ts
 * См. ТЗ: раздел "Тестирование" → "E2E тесты (Playwright)"
 * Тесты должны покрывать: загрузку файла, редактирование маппинга, импорт операций
 */
import { useState } from 'react';
import { Check, Download, FileCheck, AlertCircle } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Select } from '../../shared/ui/Select';
import { Modal } from '../../shared/ui/Modal';
import {
  useGetImportedOperationsQuery,
  useBulkUpdateImportedOperationsMutation,
  useImportOperationsMutation,
  useUpdateImportedOperationMutation,
} from '../../store/api/importsApi';
import {
  useGetDealsQuery,
  useGetDepartmentsQuery,
  useGetArticlesQuery,
} from '../../store/api/catalogsApi';
import { formatDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { useNotification } from '../../shared/hooks/useNotification';
import type { ImportedOperation } from '@shared/types/imports';
import { ImportMappingRow } from './ImportMappingRow';
import { SaveRulesCell } from './SaveRulesCell';
import { CounterpartyForm } from '../catalog-forms/CounterpartyForm/CounterpartyForm';
import { ArticleForm } from '../catalog-forms/ArticleForm/ArticleForm';

interface ImportMappingTableProps {
  sessionId: string;
  onClose: () => void;
}

export const ImportMappingTable = ({
  sessionId,
  onClose,
}: ImportMappingTableProps) => {
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchedFilter, setMatchedFilter] = useState<boolean | undefined>(
    undefined
  );
  const [operationsToSaveRules, setOperationsToSaveRules] = useState<Set<string>>(new Set());
  
  // Состояние для модалки создания
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    field: 'counterparty' | 'article' | null;
    operation: ImportedOperation | null;
  }>({
    isOpen: false,
    field: null,
    operation: null,
  });

  const limit = 20;

  const { data, isLoading, refetch } = useGetImportedOperationsQuery({
    sessionId,
    limit,
    offset: page * limit,
    matched: matchedFilter,
  });

  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: articles = [] } = useGetArticlesQuery({ isActive: true });

  const [bulkUpdate] = useBulkUpdateImportedOperationsMutation();
  const [importOperations, { isLoading: isImporting }] =
    useImportOperationsMutation();
  const [updateImportedOperation] = useUpdateImportedOperationMutation();
  const { showSuccess, showError } = useNotification();

  const operations = data?.operations || [];
  const total = data?.total || 0;
  const unmatchedCount = data?.unmatched || 0;

  // Функция для открытия модалки создания
  const handleOpenCreateModal = (field: 'counterparty' | 'article', operation: ImportedOperation) => {
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
        const updateData: any = {};
        if (createModal.field === 'counterparty') {
          updateData.matchedCounterpartyId = createdId;
        } else if (createModal.field === 'article') {
          updateData.matchedArticleId = createdId;
          // Автоматически устанавливаем тип операции из статьи
          const article = articles.find((a) => a.id === createdId);
          if (article && article.type) {
            updateData.direction = article.type as 'income' | 'expense' | 'transfer';
          }
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
  const getPatternForRule = (operation: ImportedOperation, field: 'counterparty' | 'article') => {
    switch (field) {
      case 'counterparty':
        return operation.direction === 'expense' ? operation.receiver : operation.payer;
      case 'article':
        return operation.description;
      default:
        return null;
    }
  };

  // Функция для получения ИНН из операции
  const getInnFromOperation = (operation: ImportedOperation) => {
    return operation.direction === 'expense' ? operation.receiverInn : operation.payerInn;
  };

  // Проверяем, все ли операции сопоставлены
  const checkOperationMatched = (op: ImportedOperation): boolean => {
    if (!op.direction) return false;
    
    const currency = op.currency || 'RUB';
    const hasRequiredFields = !!(
      op.matchedCounterpartyId &&
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
  const selectedOperations = operations.filter((op) => selectedIds.includes(op.id));
  const isSelectedMatched = selectedIds.length === 0 
    ? isAllMatched 
    : selectedOperations.every(checkOperationMatched);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(operations.map((op) => op.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
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
          saveRulesForIds: saveRulesForIds.length > 0 ? saveRulesForIds : undefined,
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

  const getDirectionLabel = (direction: string | null | undefined) => {
    const labels: Record<string, string> = {
      income: 'Поступление',
      expense: 'Расход',
      transfer: 'Перевод',
    };
    return direction ? labels[direction] || direction : 'Не определено';
  };

  const getDirectionBadgeColor = (direction: string | null | undefined) => {
    switch (direction) {
      case 'income':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'expense':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'transfer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const columns = [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={
            operations.length > 0 && selectedIds.length === operations.length
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
          className="rounded border-gray-300"
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
      key: 'direction',
      header: 'Тип операции',
      render: (op: ImportedOperation) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getDirectionBadgeColor(
            op.direction
          )}`}
        >
          {getDirectionLabel(op.direction)}
        </span>
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
        />
      ),
      width: '100px',
    },
    {
      key: 'repeat',
      header: 'Периодичность',
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="repeat"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
        />
      ),
      width: '130px',
    },
    {
      key: 'rules',
      header: 'Правила',
      render: (op: ImportedOperation) => (
        <SaveRulesCell 
          operation={op} 
          sessionId={sessionId}
          onToggle={handleToggleRuleSave}
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

  return (
    <div className="space-y-4">
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
            !op.confirmed
              ? 'bg-yellow-50 dark:bg-yellow-900/10'
              : op.processed
                ? 'bg-green-50 dark:bg-green-900/10'
                : ''
          }
        />
      </div>

      {/* Пагинация */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Страница {page + 1} из {Math.ceil(total / limit)}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="btn-secondary"
          >
            Назад
          </Button>
          <Button
            onClick={() => setPage(Math.min(Math.ceil(total / limit) - 1, page + 1))}
            disabled={page >= Math.ceil(total / limit) - 1}
            className="btn-secondary"
          >
            Вперед
          </Button>
        </div>
      </div>

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
                    ? 'Не все операции сопоставлены. Убедитесь, что у всех операций указаны: тип операции, контрагент, статья, счет и валюта (или счета для переводов)'
                    : undefined
                }
              >
                <Download size={16} className="mr-2" />
                Импортировать {selectedIds.length > 0 ? `выбранные (${selectedIds.length})` : 'все операции'}
              </Button>
            </div>

      {/* Модалка для создания контрагентов и статей */}
      <Modal
        isOpen={createModal.isOpen && !!createModal.field && !!createModal.operation}
        title={createModal.field === 'counterparty' ? 'Создание контрагента' : 'Создание статьи'}
        onClose={handleCloseModal}
        size="md"
      >
        {createModal.field === 'counterparty' && createModal.operation ? (
          <CounterpartyForm
            counterparty={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
            initialName={getPatternForRule(createModal.operation, 'counterparty') || ''}
            initialInn={getInnFromOperation(createModal.operation) || ''}
          />
        ) : createModal.field === 'article' && createModal.operation ? (
          <ArticleForm
            article={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
            initialName={getPatternForRule(createModal.operation, 'article') || ''}
            initialType={createModal.operation.direction as 'income' | 'expense' | 'transfer' || 'expense'}
          />
        ) : null}
      </Modal>
    </div>
  );
};