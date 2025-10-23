import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Archive, Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { OffCanvas } from '../shared/ui/OffCanvas';
import { Table } from '../shared/ui/Table';
import { PlanForm } from '../features/plan-editor/PlanForm';
import { PlanMatrixTable } from '../widgets/PlanMatrixTable';
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

export const BudgetDetailsPage = () => {
  const { budgetId } = useParams<{ budgetId: string }>();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  const { data: budget, isLoading: isBudgetLoading } = useGetBudgetQuery(
    budgetId || skipToken
  );
  const { data: plans = [], isLoading: isPlansLoading } = useGetPlansQuery(
    budgetId ? { budgetId } : skipToken
  );
  const [deletePlan] = useDeletePlanMutation();
  const [updateBudget] = useUpdateBudgetMutation();

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

  const handleEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту плановую запись?')) {
      await deletePlan(id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPlan(null);
  };

  const handleArchive = async () => {
    if (!budget) return;
    const newStatus = budget.status === 'active' ? 'archived' : 'active';
    await updateBudget({
      id: budget.id,
      data: { status: newStatus },
    });
  };

  const getTypeLabel = (type: string) => {
    return type === 'income'
      ? 'Доход'
      : type === 'expense'
        ? 'Расход'
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
      render: (plan: PlanItem) => getTypeLabel(plan.type),
      width: '100px',
    },
    {
      key: 'startDate',
      header: 'Начало',
      render: (plan: PlanItem) => formatDate(plan.startDate),
      width: '110px',
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (plan: PlanItem) => formatMoney(plan.amount, plan.currency),
      width: '130px',
    },
    {
      key: 'articleName',
      header: 'Статья',
      render: (plan: PlanItem) =>
        (plan as PlanItem & { article?: { name: string } }).article?.name ||
        '-',
    },
    {
      key: 'repeat',
      header: 'Повтор',
      render: (plan: PlanItem) => getRepeatLabel(plan.repeat),
      width: '140px',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (plan: PlanItem) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(plan)}
            title="Редактировать"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(plan.id)}
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
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
            <Button variant="secondary" onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              {budget.status === 'active' ? 'Архивировать' : 'Восстановить'}
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить позицию
            </Button>
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
          <PlanMatrixTable
            data={bddsData}
            periodFrom={reportPeriod!.periodFrom}
            periodTo={reportPeriod!.periodTo}
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
          isLoading={isPlansLoading}
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
    </Layout>
  );
};
