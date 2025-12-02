import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Archive, Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { OffCanvas } from '../shared/ui/OffCanvas';
import { ConfirmDeleteModal } from '../shared/ui/ConfirmDeleteModal';
import { Table } from '../shared/ui/Table';
import { PlanForm } from '../features/plan-editor/PlanForm';
import { CashflowTable } from '../widgets/CashflowTable';
import {
  useGetBudgetQuery,
  useUpdateBudgetMutation,
} from '../store/api/budgetsApi';
import { useGetPlansQuery, useDeletePlanMutation } from '../store/api/plansApi';
import { useGetBddsReportQuery } from '../store/api/reportsApi';
import { formatDate } from '../shared/lib/date';
import { formatMoney } from '../shared/lib/money';
import type { PlanItem } from '@fin-u-ch/shared';
import { skipToken } from '@reduxjs/toolkit/query';
import { useNotification } from '../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../constants/notificationMessages';
import { usePermissions } from '../shared/hooks/usePermissions';
import { ProtectedAction } from '../shared/components/ProtectedAction';

// RTK Query возвращает данные с датами как строки
type PlanItemFromAPI = Omit<
  PlanItem,
  'startDate' | 'endDate' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  startDate: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export const BudgetDetailsPage = () => {
  const { budgetId } = useParams<{ budgetId: string }>();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItemFromAPI | null>(null);

  const { canRead } = usePermissions();

  const { data: budget, isLoading: isBudgetLoading } = useGetBudgetQuery(
    budgetId && canRead('budgets') ? budgetId : skipToken
  );
  const { data: plansData = [], isLoading: isPlansLoading } = useGetPlansQuery(
    budgetId && canRead('budgets') ? { budgetId } : skipToken
  );
  // RTK Query возвращает строки, но типы указывают Date - приводим к правильному типу
  const plans = plansData as unknown as PlanItemFromAPI[];

  const [deletePlan] = useDeletePlanMutation();
  const [updateBudget] = useUpdateBudgetMutation();
  const { showSuccess, showError } = useNotification();

  // Определяем период для отчета на основе дат бюджета
  const reportPeriod = useMemo(() => {
    if (!budget) return null;
    const startDate = new Date(budget.startDate);
    const endDate = budget.endDate
      ? new Date(budget.endDate)
      : new Date(startDate.getFullYear(), 11, 31); // До конца года

    return {
      periodFrom: startDate.toISOString().split('T')[0],
      periodTo: endDate.toISOString().split('T')[0],
    };
  }, [budget]);

  // Получаем данные БДДС для матрицы
  const { data: bddsData, isLoading: isBddsLoading } = useGetBddsReportQuery(
    reportPeriod && budgetId
      ? {
          ...reportPeriod,
          budgetId,
        }
      : skipToken
  );

  const handleCreate = () => {
    setEditingPlan(null);
    setIsFormOpen(true);
  };

  const handleEdit = (plan: PlanItemFromAPI) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deletePlan(deleteModal.id).unwrap();
      showSuccess(NOTIFICATION_MESSAGES.PLAN.DELETE_SUCCESS);
      setDeleteModal({ isOpen: false, id: null });
    } catch (error) {
      console.error('Failed to delete plan:', error);
      showError(NOTIFICATION_MESSAGES.PLAN.DELETE_ERROR);
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPlan(null);
  };

  const handleArchive = async () => {
    if (!budget) return;
    const newStatus = budget.status === 'active' ? 'archived' : 'active';
    try {
      await updateBudget({
        id: budget.id,
        data: { status: newStatus },
      }).unwrap();
      showSuccess(
        newStatus === 'archived'
          ? 'Бюджет успешно архивирован'
          : 'Бюджет успешно восстановлен'
      );
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
        : 'Ошибка при изменении статуса бюджета';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при изменении статуса бюджета'
      );
    }
  };

  const getTypeLabel = (type: string) => {
    return type === 'income'
      ? 'Поступление'
      : type === 'expense'
        ? 'Списание'
        : 'Перевод';
  };

  const getRepeatLabel = (repeat: string) => {
    const labels: Record<string, string> = {
      none: 'Не повторяется',
      daily: 'Ежедневно',
      weekly: 'Еженедельно',
      monthly: 'Ежемесячно',
      quarterly: 'Ежеквартально',
      semiannual: 'Раз в полгода',
      annual: 'Ежегодно',
    };
    return labels[repeat] || repeat;
  };

  const columns = [
    {
      key: 'type',
      header: 'Тип',
      render: (plan: PlanItemFromAPI) => getTypeLabel(plan.type),
      width: '100px',
    },
    {
      key: 'startDate',
      header: 'Начало',
      render: (plan: PlanItemFromAPI) => formatDate(plan.startDate),
      width: '110px',
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (plan: PlanItemFromAPI) =>
        formatMoney(plan.amount, plan.currency),
      width: '130px',
    },
    {
      key: 'articleName',
      header: 'Статья',
      render: (plan: PlanItemFromAPI) =>
        (plan as PlanItemFromAPI & { article?: { name: string } }).article
          ?.name || '-',
    },
    {
      key: 'repeat',
      header: 'Повтор',
      render: (plan: PlanItemFromAPI) => getRepeatLabel(plan.repeat),
      width: '140px',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (plan: PlanItemFromAPI) => (
        <div className="flex gap-2">
          <ProtectedAction
            entity="budgets"
            action="update"
            fallback={
              <Button
                variant="secondary"
                size="sm"
                disabled
                title="Нет прав на редактирование"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            }
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleEdit(plan)}
              title="Редактировать"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </ProtectedAction>
          <ProtectedAction
            entity="budgets"
            action="delete"
            fallback={
              <Button
                variant="danger"
                size="sm"
                disabled
                title="Нет прав на удаление"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            }
          >
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(plan.id)}
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </ProtectedAction>
        </div>
      ),
      width: '120px',
    },
  ];

  if (isBudgetLoading) {
    return (
      <Layout>
        <div className="text-center py-8">Загрузка...</div>
      </Layout>
    );
  }

  if (!budget) {
    return (
      <Layout>
        <div className="text-center py-8">Бюджет не найден</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Шапка */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/budgets')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {budget.name}
          </h1>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              budget.status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {budget.status === 'active' ? 'Активен' : 'Архивирован'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-gray-600 dark:text-gray-400">
            Период: {formatDate(budget.startDate)} —{' '}
            {budget.endDate ? formatDate(budget.endDate) : '∞'}
          </p>
          <div className="flex gap-2">
            <ProtectedAction
              entity="budgets"
              action="archive"
              fallback={
                <Button variant="secondary" disabled>
                  <Archive className="w-4 h-4 mr-2" />
                  {budget.status === 'active' ? 'Архивировать' : 'Восстановить'}
                </Button>
              }
            >
              <Button variant="secondary" onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" />
                {budget.status === 'active' ? 'Архивировать' : 'Восстановить'}
              </Button>
            </ProtectedAction>
            <ProtectedAction
              entity="budgets"
              action="create"
              fallback={
                <Button disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить позицию
                </Button>
              }
            >
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить позицию
              </Button>
            </ProtectedAction>
          </div>
        </div>
      </div>

      {/* Матрица плана (БДДС) */}
      <div className="mb-6">
        {isBddsLoading ? (
          <Card>
            <div className="text-center py-8">Загрузка данных...</div>
          </Card>
        ) : bddsData ? (
          <CashflowTable
            data={bddsData}
            periodFrom={reportPeriod!.periodFrom}
            periodTo={reportPeriod!.periodTo}
            title="Бюджет движения денежных средств"
            showPlan={false}
          />
        ) : (
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Нет данных для отображения
            </div>
          </Card>
        )}
      </div>

      {/* Список плановых записей */}
      <Card>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Плановые записи
          </h2>
        </div>
        <Table
          columns={columns}
          data={plans}
          keyExtractor={(plan) => plan.id}
          loading={isPlansLoading}
          emptyMessage="Нет плановых записей"
        />
      </Card>

      {/* Форма добавления/редактирования */}
      <OffCanvas
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={editingPlan ? 'Редактировать план' : 'Добавить план'}
      >
        <PlanForm
          plan={editingPlan}
          budgetId={budgetId}
          onClose={handleCloseForm}
        />
      </OffCanvas>

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        message="Вы уверены, что хотите удалить эту плановую запись?"
        confirmText="Удалить"
      />
    </Layout>
  );
};
