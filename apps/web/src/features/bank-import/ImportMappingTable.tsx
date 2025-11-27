/**
 * TODO: Написать E2E тесты для функционала импорта
 * Файл тестов: apps/web/e2e/bank-import.spec.ts
 * См. ТЗ: раздел "Тестирование" → "E2E тесты (Playwright)"
 * Тесты должны покрывать: загрузку файла, редактирование маппинга, импорт операций
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Check,
  Download,
  FileCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Select } from '../../shared/ui/Select';
import { OffCanvas } from '../../shared/ui/OffCanvas';
import {
  useGetImportedOperationsQuery,
  useLazyGetImportedOperationsQuery,
  useBulkUpdateImportedOperationsMutation,
  useImportOperationsMutation,
  useUpdateImportedOperationMutation,
  useGetTotalImportedOperationsCountQuery,
} from '../../store/api/importsApi';
import { findSimilarOperations } from './utils/findSimilarOperations';
import { useUndoManager } from './hooks/useUndoManager';
import { ApplySimilarPopover } from './ApplySimilarPopover';
import { UndoToast } from '../../shared/ui/UndoToast';
import { useGetAccountsQuery } from '../../store/api/catalogsApi';
import { useGetCompanyQuery } from '../../store/api/companiesApi';
import { formatDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import { useNotification } from '../../shared/hooks/useNotification';
import { useLeafArticles } from '../../shared/hooks/useArticleTree';
import type { ImportedOperation } from '@shared/types/imports';
import { ImportMappingRow, AnchorRect } from './ImportMappingRow';
import { SaveRulesCell } from './SaveRulesCell';
import { CounterpartyForm } from '../catalog-forms/CounterpartyForm/CounterpartyForm';
import { ArticleForm } from '../catalog-forms/ArticleForm/ArticleForm';
import { AccountForm } from '../catalog-forms/AccountForm/AccountForm';
import { DealForm } from '../catalog-forms/DealForm/DealForm';
import { DepartmentForm } from '../catalog-forms/DepartmentForm/DepartmentForm';

interface ImportMappingTableProps {
  sessionId: string;
  companyAccountNumber?: string | null;
  onClose: () => void;
  onImportSuccess?: () => void;
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

type SortField =
  | 'date'
  | 'amount'
  | 'number'
  | 'description'
  | 'payer'
  | 'receiver'
  | 'counterparty'
  | 'article'
  | 'account'
  | 'deal'
  | 'department'
  | 'currency'
  | 'direction'
  | null;
type SortDirection = 'asc' | 'desc';

export const ImportMappingTable = ({
  sessionId,
  companyAccountNumber,
  onClose,
  onImportSuccess,
  isCollapsed = false,
  onCollapseChange,
}: ImportMappingTableProps) => {
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchedFilter, setMatchedFilter] = useState<boolean | undefined>(
    undefined
  );
  const [duplicateFilter, setDuplicateFilter] = useState<boolean | undefined>(
    undefined
  );
  const [processedFilter, setProcessedFilter] = useState<boolean | undefined>(
    undefined
  );
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [operationsToSaveRules, setOperationsToSaveRules] = useState<
    Set<string>
  >(new Set());

  // Отслеживание последних измененных операций для подсветки
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(
    new Set()
  );

  // Состояние для импорта (loading, success)
  const [importStatus, setImportStatus] = useState<
    'idle' | 'loading' | 'success'
  >('idle');

  const navigate = useNavigate();

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
    anchorRect: AnchorRect | null;
  }>({
    isOpen: false,
    field: null,
    operation: null,
    anchorRect: null,
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
    similarOperations:
      | Array<{
          operation: ImportedOperation;
          comparison: import('./utils/findSimilarOperations').OperationComparison;
        }>
      | ImportedOperation[];
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

  // Сбрасываем страницу при изменении фильтров
  useEffect(() => {
    setPage(0);
  }, [matchedFilter, duplicateFilter, processedFilter]);

  const { data, refetch } = useGetImportedOperationsQuery({
    sessionId,
    limit,
    offset: page * limit,
    matched: matchedFilter,
    processed: processedFilter,
  });

  // Lazy query for fetching ALL operations for similarity check
  const [getAllOperations] = useLazyGetImportedOperationsQuery();

  // Используем только листья (статьи без дочерних) для операций
  const { leafArticles: articles = [] } = useLeafArticles({ isActive: true });
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: company } = useGetCompanyQuery();
  const { data: totalImportedData } = useGetTotalImportedOperationsCountQuery();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [bulkUpdate] = useBulkUpdateImportedOperationsMutation();
  const [importOperations, { isLoading: isImporting }] =
    useImportOperationsMutation();
  const [updateImportedOperation] = useUpdateImportedOperationMutation();
  const { showSuccess, showError } = useNotification();

  // Автовыбор счета на основе companyAccountNumber из файла
  const [autoAccountApplied, setAutoAccountApplied] = useState(false);
  useEffect(() => {
    // Используем companyAccountNumber из API response (если доступен) или из props
    const accountNumber = data?.companyAccountNumber || companyAccountNumber;

    // Применяем автовыбор только один раз при загрузке данных
    if (
      !autoAccountApplied &&
      accountNumber &&
      accounts.length > 0 &&
      data?.operations &&
      data.operations.length > 0
    ) {
      // Ищем счет по номеру
      const matchedAccount = accounts.find(
        (acc) => acc.number === accountNumber && acc.isActive
      );

      if (matchedAccount) {
        // Находим операции без назначенного счета
        const operationsWithoutAccount = data.operations.filter(
          (op) => !op.matchedAccountId && !op.processed
        );

        if (operationsWithoutAccount.length > 0) {
          // Применяем счет ко всем операциям без счета
          const operationIds = operationsWithoutAccount.map((op) => op.id);

          bulkUpdate({
            sessionId,
            data: {
              operationIds,
              matchedAccountId: matchedAccount.id,
            },
          })
            .unwrap()
            .then(() => {
              console.log(
                `Автоматически применен счет "${matchedAccount.name}" к ${operationIds.length} операциям`
              );
              setAutoAccountApplied(true);
            })
            .catch((error) => {
              console.error('Ошибка автовыбора счета:', error);
              setAutoAccountApplied(true); // Помечаем как выполненное, чтобы не повторять
            });
        } else {
          setAutoAccountApplied(true);
        }
      } else {
        setAutoAccountApplied(true);
      }
    }
  }, [
    companyAccountNumber,
    data?.companyAccountNumber,
    accounts,
    data?.operations,
    autoAccountApplied,
    bulkUpdate,
    sessionId,
  ]);

  // Undo manager
  const {
    isUndoAvailable,
    undoDescription,
    undoAnchorPosition,
    registerBulkChange,
    undo,
    cancelUndo,
  } = useUndoManager({
    sessionId,
    onUndo: () => {
      // Не нужен refetch - оптимистичные обновления работают
      // refetch();
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

  const total = data?.total || 0;
  const unmatchedCount = data?.unmatched || 0;
  const duplicatesCount = data?.duplicates || 0;

  // Мемоизируем отсортированные операции для производительности
  const operations = useMemo(() => {
    const ops = data?.operations || [];

    // Сортировка операций - применяется только при явном выборе пользователя
    // БЕЗ сортировки сохраняется исходный порядок из API
    if (!sortField) {
      return ops;
    }

    return [...ops].sort((a, b) => {
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
        case 'description':
          comparison = (a.description || '').localeCompare(
            b.description || '',
            'ru',
            {
              numeric: true,
              sensitivity: 'base',
            }
          );
          break;
        case 'payer':
          comparison = (a.payer || '').localeCompare(b.payer || '', 'ru', {
            numeric: true,
            sensitivity: 'base',
          });
          break;
        case 'receiver':
          comparison = (a.receiver || '').localeCompare(
            b.receiver || '',
            'ru',
            {
              numeric: true,
              sensitivity: 'base',
            }
          );
          break;
        case 'counterparty':
          comparison = (a.matchedCounterparty?.name || '').localeCompare(
            b.matchedCounterparty?.name || '',
            'ru',
            {
              numeric: true,
              sensitivity: 'base',
            }
          );
          break;
        case 'article':
          comparison = (a.matchedArticle?.name || '').localeCompare(
            b.matchedArticle?.name || '',
            'ru',
            {
              numeric: true,
              sensitivity: 'base',
            }
          );
          break;
        case 'account':
          comparison = (a.matchedAccount?.name || '').localeCompare(
            b.matchedAccount?.name || '',
            'ru',
            {
              numeric: true,
              sensitivity: 'base',
            }
          );
          break;
        case 'deal':
          comparison = (a.matchedDeal?.name || '').localeCompare(
            b.matchedDeal?.name || '',
            'ru',
            {
              numeric: true,
              sensitivity: 'base',
            }
          );
          break;
        case 'department':
          comparison = (a.matchedDepartment?.name || '').localeCompare(
            b.matchedDepartment?.name || '',
            'ru',
            {
              numeric: true,
              sensitivity: 'base',
            }
          );
          break;
        case 'currency':
          comparison = (a.currency || 'RUB').localeCompare(
            b.currency || 'RUB',
            'ru',
            {
              numeric: true,
              sensitivity: 'base',
            }
          );
          break;
        case 'direction': {
          const directionLabels: Record<string, string> = {
            income: 'Поступление',
            expense: 'Списание',
            transfer: 'Перевод',
          };
          const aLabel = directionLabels[a.direction || ''] || '';
          const bLabel = directionLabels[b.direction || ''] || '';
          comparison = aLabel.localeCompare(bLabel, 'ru', {
            numeric: true,
            sensitivity: 'base',
          });
          break;
        }
        default:
          return 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data?.operations, sortField, sortDirection]);

  // Функция для открытия модалки создания (мемоизируем для производительности)
  const handleOpenCreateModal = useCallback(
    (
      field:
        | 'counterparty'
        | 'article'
        | 'account'
        | 'deal'
        | 'department'
        | 'currency',
      operation: ImportedOperation,
      anchorRect?: AnchorRect | null
    ) => {
      setCreateModal({
        isOpen: true,
        field,
        operation,
        anchorRect: anchorRect || null,
      });
    },
    []
  );

  // Функция для закрытия модалки (мемоизируем)
  const handleCloseModal = useCallback(() => {
    setCreateModal({
      isOpen: false,
      field: null,
      operation: null,
      anchorRect: null,
    });
  }, []);

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

        // Обновляем операцию
        await updateImportedOperation({
          id: createModal.operation.id,
          data: updateData,
        }).unwrap();

        // Сохраняем данные для проверки похожих операций
        const operation = createModal.operation;
        const field = createModal.field;
        const anchorRect = createModal.anchorRect;
        const value = createdId;

        showSuccess('Элемент создан и выбран');
        handleCloseModal();

        // После успешного создания и обновления проверяем похожие операции
        // Используем небольшую задержку, чтобы UI успел обновиться
        setTimeout(async () => {
          // Создаем обновленную операцию с новыми данными
          // RTK Query автоматически обновит кэш, но для проверки похожих используем обновленные данные
          const updatedOperation = {
            ...operation,
            ...updateData,
          } as ImportedOperation;

          // Проверяем похожие операции только если поле поддерживает эту функцию
          if (
            field === 'counterparty' ||
            field === 'article' ||
            field === 'account' ||
            field === 'deal' ||
            field === 'department' ||
            field === 'currency'
          ) {
            await handleFieldUpdate(
              updatedOperation,
              field,
              value,
              updateData,
              anchorRect
            );
          }
        }, 150);
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
    anchorRect?: AnchorRect | null
  ) => {
    try {
      // Не показываем popover для уже распределенных операций
      if (operation.processed) {
        return false;
      }

      // Определяем обязательные поля
      const requiredFields = ['direction', 'article', 'account', 'currency'];
      const isRequiredField = requiredFields.includes(field);

      // Проверяем, заполнены ли все обязательные поля ДО этого изменения
      const wereAllRequiredFilled = !!(
        operation.direction &&
        operation.matchedArticleId &&
        operation.matchedAccountId &&
        operation.currency
      );

      // Проверяем, будут ли все обязательные поля заполнены ПОСЛЕ этого изменения
      const updatedOperation = { ...operation, ...updateData };
      const willBeFullyFilled = !!(
        updatedOperation.direction &&
        updatedOperation.matchedArticleId &&
        updatedOperation.matchedAccountId &&
        updatedOperation.currency
      );

      // Логика показа popover:
      // 1. Для обязательных полей: показывать если после изменения все обязательные заполнены
      // 2. Для необязательных полей: показывать только если все обязательные уже были заполнены ДО изменения
      const shouldCheckSimilar = isRequiredField
        ? willBeFullyFilled
        : wereAllRequiredFilled;

      // Не показываем popover, если условия не выполнены
      if (!shouldCheckSimilar) {
        return false;
      }

      // Получаем ВСЕ операции сессии для поиска похожих
      // Используем lazy query с большим лимитом для получения всех операций (до 10000)
      const response = await getAllOperations({
        sessionId,
        limit: 10000, // Запрашиваем большое количество для охвата всех операций
        matched: matchedFilter, // Применяем текущий фильтр, если он установлен
      });

      // Если запрос вернул ошибку или нет данных, используем текущие данные (fallback)
      const allOperations = response.data?.operations || data?.operations || [];

      // Находим похожие операции (передаем поле для проверки lockedFields)
      const similar = findSimilarOperations(
        operation,
        allOperations,
        company?.inn || null,
        24, // minScore - снижен до 24 для обнаружения похожих операций с одинаковой сутью, но разными деталями (НДС, номера счетов и т.д.)
        field // поле для проверки блокировки
      );

      // Минимальный лог для отслеживания вызова
      console.log('[ImportMappingTable] Поиск похожих операций вызван', {
        operationId: operation.id,
        field,
        totalOperations: allOperations.length,
        found: similar.length,
      });

      // Если есть похожие операции, показываем popover ПОСЛЕ обновления текущей операции
      if (similar.length > 0) {
        // Получаем позицию элемента для показа popover
        const rect = anchorRect
          ? {
              ...anchorRect,
              bottom: anchorRect.top + anchorRect.height,
              right: anchorRect.left + anchorRect.width,
            }
          : {
              top: window.innerHeight / 2 - 20,
              bottom: window.innerHeight / 2 + 20,
              left: window.innerWidth / 2 - 50,
              right: window.innerWidth / 2 + 50,
              width: 100,
              height: 40,
            };

        console.log(
          '[ImportMappingTable] Отображаем popover похожих операций',
          {
            operationId: operation.id,
            field,
            anchorRect: rect,
            similarCount: similar.length,
          }
        );

        setSimilarPopover({
          isOpen: true,
          field,
          value,
          operation: updatedOperation as ImportedOperation, // Используем обновленную операцию
          similarOperations: similar,
          anchorPosition: {
            top: rect.bottom + 8,
            left: rect.left,
            right: rect.right,
          },
          updateData, // Сохраняем данные для применения к похожим операциям
        });

        return true; // Возвращаем true чтобы ImportMappingRow знал что нужно показать popover
      }

      return false; // Нет похожих операций
    } catch (error) {
      console.error('Error loading all operations:', error);
      return false;
    }
  };

  // Обработчик применения значения ко всем похожим операциям
  const handleApplySimilar = async (selectedOperationIds: string[]) => {
    if (!similarPopover.operation || !similarPopover.field) {
      return;
    }

    try {
      // Используем сохраненные данные для обновления
      const updateData = similarPopover.updateData;

      // Применяем обновление ТОЛЬКО к выбранным похожим операциям
      // Текущая операция уже обновлена в ImportMappingRow
      const similarOps = Array.isArray(similarPopover.similarOperations)
        ? similarPopover.similarOperations
        : [];

      // Собираем ID только похожих операций (без текущей)
      const operationIds: string[] = [];
      const operationsData: ImportedOperation[] = [];

      // Добавляем только выбранные похожие операции
      for (const s of similarOps) {
        const op = 'operation' in s ? s.operation : (s as ImportedOperation);
        // Проверяем, что операция выбрана пользователем и это не текущая операция
        if (
          op.id &&
          selectedOperationIds.includes(op.id) &&
          op.id !== similarPopover.operation.id
        ) {
          operationIds.push(op.id);
          operationsData.push(op);
        }
      }

      // Если выбраны только похожие операции, обновляем их
      if (operationIds.length > 0) {
        // Сохраняем предыдущие состояния для отмены
        const previousStates = operationsData.map((op) => {
          const state: Record<string, unknown> = {};

          // Сохраняем все поля которые будут изменены
          if (updateData.matchedArticleId !== undefined) {
            state.matchedArticleId = op.matchedArticleId;
          }
          if (updateData.matchedCounterpartyId !== undefined) {
            state.matchedCounterpartyId = op.matchedCounterpartyId;
          }
          if (updateData.matchedAccountId !== undefined) {
            state.matchedAccountId = op.matchedAccountId;
          }
          if (updateData.matchedDealId !== undefined) {
            state.matchedDealId = op.matchedDealId;
          }
          if (updateData.matchedDepartmentId !== undefined) {
            state.matchedDepartmentId = op.matchedDepartmentId;
          }
          if (updateData.currency !== undefined) {
            state.currency = op.currency;
          }
          if (updateData.direction !== undefined) {
            state.direction = op.direction;
          }

          return { id: op.id, state };
        });

        await bulkUpdate({
          sessionId,
          data: {
            operationIds,
            ...updateData,
          },
        }).unwrap();

        // Регистрируем изменение для возможности отмены
        const fieldNames: Record<string, string> = {
          counterparty: 'Контрагент',
          article: 'Статья',
          account: 'Счет',
          deal: 'Сделка',
          department: 'Подразделение',
          currency: 'Валюта',
          direction: 'Тип операции',
        };

        registerBulkChange(
          operationIds,
          previousStates,
          `Применено к ${operationIds.length} похожим операциям: ${fieldNames[similarPopover.field] || similarPopover.field}`,
          {
            top: similarPopover.anchorPosition.top,
            left: similarPopover.anchorPosition.left,
          }
        );

        // Подсвечиваем обновленные операции (включая текущую)
        setRecentlyUpdatedIds(
          new Set([similarPopover.operation.id, ...operationIds])
        );
        setTimeout(() => setRecentlyUpdatedIds(new Set()), 3000);
      } else {
        // Если не выбраны похожие операции, просто подсвечиваем текущую
        setRecentlyUpdatedIds(new Set([similarPopover.operation.id]));
        setTimeout(() => setRecentlyUpdatedIds(new Set()), 3000);
      }

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

      // Обновляем данные - не нужен refetch, используем оптимистичные обновления
      // refetch();
    } catch (error: unknown) {
      console.error('Error applying to similar operations:', error);

      // Показываем более информативное сообщение об ошибке
      const errorData = error as {
        data?: { message?: string };
        message?: string;
      };
      const errorMessage =
        errorData?.data?.message ||
        errorData?.message ||
        'Ошибка при применении к похожим операциям';

      if (
        errorMessage.includes('already processed') ||
        errorMessage.includes('not found')
      ) {
        showError(
          'Некоторые операции уже обработаны или удалены. Обновите страницу.'
        );
        // Автоматически обновляем список после небольшой задержки (здесь refetch нужен)
        setTimeout(() => refetch(), 1000);
      } else {
        showError(errorMessage);
      }
    }
  };

  // Обработчик пропуска применения к похожим операциям (текущая операция уже обновлена)
  const handleSkipSimilar = () => {
    // Операция уже обновлена в ImportMappingRow, просто закрываем popover
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

  // Обработчик закрытия popover без действий (текущая операция уже обновлена)
  const handleClosePopover = () => {
    // Операция уже обновлена в ImportMappingRow, просто закрываем popover
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

  // checkOperationMatched определена выше, используем её
  const isAllMatched = operations.every(checkOperationMatched);
  const selectedOperations = operations.filter((op) =>
    selectedIds.includes(op.id)
  );
  const isSelectedMatched =
    selectedIds.length === 0
      ? isAllMatched
      : selectedOperations.every(checkOperationMatched);

  // Проверяем, все ли операции сопоставлены (используем unmatchedCount из API)
  const areAllOperationsMatched = unmatchedCount === 0;

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

  const handleSort = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        // Переключаем направление, если кликнули на ту же колонку
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return field;
      } else {
        // Устанавливаем новую колонку с направлением по умолчанию (asc, как в Excel)
        setSortDirection('asc');
        return field;
      }
    });
  }, []);

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
      setImportStatus('loading');
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

      // refetch нужен здесь, т.к. меняется статус processed
      refetch();

      if (result.errors === 0) {
        setImportStatus('success');
        showSuccess(
          `Импортировано операций: ${result.created}. Ошибок: ${result.errors}`
        );

        // Переход на страницу операций через 1.5 секунды после успешного импорта
        setTimeout(() => {
          // Закрываем модальное окно перед навигацией
          onImportSuccess?.();
          navigate('/operations');
        }, 1500);
      } else {
        setImportStatus('idle');

        // Формируем детальное сообщение об ошибке
        let errorMessage = '';
        if (result.errorMessages && result.errorMessages.length > 0) {
          // Показываем детальные сообщения об ошибках
          // Ограничиваем количество сообщений для читаемости
          const maxMessages = 5;
          const messagesToShow = result.errorMessages.slice(0, maxMessages);
          const details = messagesToShow.join('\n');
          const moreCount = result.errorMessages.length - maxMessages;

          let detailsText = details;
          if (moreCount > 0) {
            detailsText += `\n... и еще ${moreCount} ошибок`;
          }

          errorMessage =
            result.created > 0
              ? `Импортировано операций: ${result.created}. Ошибок: ${result.errors}.\n\nДетали:\n${detailsText}`
              : `Ошибка импорта: не удалось импортировать операции. Ошибок: ${result.errors}.\n\nДетали:\n${detailsText}`;
        } else {
          // Если детальных сообщений нет, показываем общее
          errorMessage =
            result.created > 0
              ? `Импортировано операций: ${result.created}. Ошибок: ${result.errors}. Проверьте логи или попробуйте импортировать операции по одной.`
              : `Ошибка импорта: не удалось импортировать операции. Ошибок: ${result.errors}. Проверьте, что все операции полностью сопоставлены.`;
        }

        showError(errorMessage);
      }
    } catch (error) {
      setImportStatus('idle');

      // Извлекаем детальное сообщение об ошибке
      let errorMessage = 'Ошибка при импорте операций';

      if (error && typeof error === 'object') {
        // RTK Query возвращает ошибку в формате { data: { message: '...' } } или { error: { data: { message: '...' } } }
        if ('data' in error) {
          const errorData = (error as { data?: unknown }).data;

          if (errorData && typeof errorData === 'object') {
            // Проверяем разные варианты структуры ошибки
            if (
              'message' in errorData &&
              typeof errorData.message === 'string'
            ) {
              errorMessage = errorData.message;
            } else if (
              'error' in errorData &&
              typeof errorData.error === 'string'
            ) {
              errorMessage = errorData.error;
            } else if (
              'data' in errorData &&
              typeof errorData.data === 'object' &&
              errorData.data !== null &&
              'message' in errorData.data &&
              typeof errorData.data.message === 'string'
            ) {
              errorMessage = (errorData.data as { message: string }).message;
            }
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } else if ('error' in error) {
          const nestedError = (
            error as { error?: { data?: { message?: string } } }
          ).error;
          if (nestedError?.data?.message) {
            errorMessage = nestedError.data.message;
          }
        } else if (
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ) {
          errorMessage = (error as { message: string }).message;
        }
      }

      console.error('Import error details:', {
        error,
        status: (error as { status?: unknown })?.status,
        data: (error as { data?: unknown })?.data,
      });

      showError(errorMessage);
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
      header: (
        <button
          onClick={() => handleSort('description')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          Назначение <SortIcon field="description" />
        </button>
      ),
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
      header: (
        <button
          onClick={() => handleSort('payer')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          Плательщик <SortIcon field="payer" />
        </button>
      ),
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
      header: (
        <button
          onClick={() => handleSort('receiver')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          Получатель <SortIcon field="receiver" />
        </button>
      ),
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
        <button
          onClick={() => handleSort('direction')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          <span className="flex items-center gap-1">
            Тип операции
            <span className="text-red-500" title="Обязательное поле">
              *
            </span>
          </span>
          <SortIcon field="direction" />
        </button>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="direction"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          disabled={op.processed}
          isModalOpen={createModal.isOpen}
        />
      ),
      width: '120px',
    },
    {
      key: 'counterparty',
      header: (
        <button
          onClick={() => handleSort('counterparty')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          Контрагент <SortIcon field="counterparty" />
        </button>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="counterparty"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          disabled={op.processed}
          isModalOpen={createModal.isOpen}
        />
      ),
      width: '180px',
    },
    {
      key: 'article',
      header: (
        <button
          onClick={() => handleSort('article')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          <span className="flex items-center gap-1">
            Статья
            <span className="text-red-500" title="Обязательное поле">
              *
            </span>
          </span>
          <SortIcon field="article" />
        </button>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="article"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          disabled={op.processed}
          isModalOpen={createModal.isOpen}
        />
      ),
      width: '180px',
    },
    {
      key: 'account',
      header: (
        <button
          onClick={() => handleSort('account')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          <span className="flex items-center gap-1">
            Счет
            <span className="text-red-500" title="Обязательное поле">
              *
            </span>
          </span>
          <SortIcon field="account" />
        </button>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="account"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          disabled={op.processed}
          isModalOpen={createModal.isOpen}
        />
      ),
      width: '150px',
    },
    {
      key: 'deal',
      header: (
        <button
          onClick={() => handleSort('deal')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          Сделка <SortIcon field="deal" />
        </button>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="deal"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          disabled={op.processed}
          isModalOpen={createModal.isOpen}
        />
      ),
      width: '150px',
    },
    {
      key: 'department',
      header: (
        <button
          onClick={() => handleSort('department')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          Подразделение <SortIcon field="department" />
        </button>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="department"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          disabled={op.processed}
          isModalOpen={createModal.isOpen}
        />
      ),
      width: '150px',
    },
    {
      key: 'currency',
      header: (
        <button
          onClick={() => handleSort('currency')}
          className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
        >
          <span className="flex items-center gap-1">
            Валюта
            <span className="text-red-500" title="Обязательное поле">
              *
            </span>
          </span>
          <SortIcon field="currency" />
        </button>
      ),
      render: (op: ImportedOperation) => (
        <ImportMappingRow
          operation={op}
          field="currency"
          sessionId={sessionId}
          onOpenCreateModal={handleOpenCreateModal}
          onFieldUpdate={handleFieldUpdate}
          disabled={op.processed}
          isModalOpen={createModal.isOpen}
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
            <h3 className="text-lg font-semibold">
              Импортированные операции
              {total > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                  ({total})
                </span>
              )}
            </h3>
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
      {/* Кнопки управления */}
      <div className="flex items-center justify-end">
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
          {totalImportedData?.count !== undefined && (
            <span className="text-gray-600 dark:text-gray-400">
              Записано в Операции: {totalImportedData.count}
            </span>
          )}
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
            onChange={(value) =>
              setMatchedFilter(value === '' ? undefined : value === 'true')
            }
            options={[
              { value: '', label: 'Все' },
              { value: 'true', label: 'Сопоставленные' },
              { value: 'false', label: 'Несопоставленные' },
            ]}
            className="w-40"
          />
          <Select
            value={processedFilter === undefined ? '' : String(processedFilter)}
            onChange={(value) =>
              setProcessedFilter(value === '' ? undefined : value === 'true')
            }
            options={[
              { value: '', label: 'Все операции' },
              { value: 'true', label: 'Записанные' },
              { value: 'false', label: 'Незаписанные' },
            ]}
            className="w-48"
          />
        </div>
      </div>

      {/* Таблица */}
      <div className="rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={operations}
          keyExtractor={(op) => op.id}
          rowClassName={(op) => {
            const classes: string[] = [];

            if (op.processed) {
              classes.push('bg-gray-100 dark:bg-gray-800/50 opacity-60');
            } else {
              const isMatched = checkOperationMatched(op);

              const bgColor = isMatched
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-yellow-50 dark:bg-yellow-900/20';
              classes.push(bgColor);

              let borderColor = '';
              if (op.isDuplicate) {
                borderColor = 'border-orange-500';
              } else {
                borderColor = isMatched
                  ? 'border-green-500'
                  : 'border-yellow-500';
              }
              classes.push('border-l-4', borderColor);
            }

            // Добавляем анимацию подсветки для недавно обновленных операций
            if (recentlyUpdatedIds.has(op.id)) {
              classes.push(
                'animate-pulse ring-2 ring-primary-500 dark:ring-primary-400'
              );
            }

            return classes.join(' ');
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
            (selectedIds.length === 0
              ? !areAllOperationsMatched
              : !isSelectedMatched)
          }
          className="btn-primary"
          title={
            selectedIds.length === 0 && !areAllOperationsMatched
              ? 'Не все операции сопоставлены. Убедитесь, что у всех операций указаны: тип операции, статья, счет и валюта (или счета для переводов)'
              : selectedIds.length > 0 && !isSelectedMatched
                ? 'Не все выбранные операции сопоставлены. Убедитесь, что у всех выбранных операций указаны: тип операции, статья, счет и валюта (или счета для переводов)'
                : undefined
          }
        >
          <Download size={16} className="mr-2" />
          Записать в Операции{' '}
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

      {/* Popover для применения к похожим операциям */}
      <ApplySimilarPopover
        isOpen={similarPopover.isOpen}
        onClose={handleClosePopover}
        onApply={handleApplySimilar}
        onSkip={handleSkipSimilar}
        similarCount={similarPopover.similarOperations.length}
        anchorPosition={similarPopover.anchorPosition}
        fieldLabel={similarPopover.field || ''}
        similarOperations={
          Array.isArray(similarPopover.similarOperations) &&
          'operation' in (similarPopover.similarOperations[0] || {})
            ? (similarPopover.similarOperations as Array<{
                operation: ImportedOperation;
                comparison: import('./utils/findSimilarOperations').OperationComparison;
              }>)
            : []
        }
      />

      {/* Toast для отмены изменений */}
      <UndoToast
        message={undoDescription}
        isVisible={isUndoAvailable}
        onUndo={undo}
        onClose={cancelUndo}
        anchorPosition={undoAnchorPosition}
      />

      {/* Модальное окно состояния импорта */}
      {(importStatus === 'loading' || importStatus === 'success') && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center gap-4">
              {importStatus === 'loading' && (
                <>
                  <Loader2
                    className="animate-spin text-primary-600 dark:text-primary-400"
                    size={48}
                  />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Импорт операций...
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Пожалуйста, подождите. Импорт операций может занять
                      некоторое время.
                    </p>
                  </div>
                </>
              )}
              {importStatus === 'success' && (
                <>
                  <CheckCircle
                    className="text-green-600 dark:text-green-400"
                    size={48}
                  />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Импорт завершен успешно!
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Перенаправление на страницу операций...
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
