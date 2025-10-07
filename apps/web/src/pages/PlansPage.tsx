import { useState } from 'react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { Table } from '../shared/ui/Table';
import { Modal } from '../shared/ui/Modal';
import { PlanForm } from '../features/plan-editor/PlanForm';
import { useGetPlansQuery, useDeletePlanMutation } from '../store/api/plansApi';
import { formatDate } from '../shared/lib/date';
import { formatMoney } from '../shared/lib/money';
import type { PlanItem } from '@shared/types/operations';

export const PlansPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  const { data: plans = [], isLoading } = useGetPlansQuery();
  const [deletePlan] = useDeletePlanMutation();

  const handleCreate = () => {
    setEditingPlan(null);
    setIsFormOpen(true);
  };

  const handleEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот план?')) {
      await deletePlan(id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPlan(null);
  };

  const getTypeLabel = (type: string) => {
    return type === 'income' ? 'Доход' : 'Расход';
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Активен',
      paused: 'Приостановлен',
      archived: 'Архивирован',
    };
    return labels[status] || status;
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
      header: 'Дата начала',
      render: (plan: PlanItem) => formatDate(plan.startDate),
      width: '120px',
    },
    {
      key: 'endDate',
      header: 'Дата окончания',
      render: (plan: PlanItem) =>
        plan.endDate ? formatDate(plan.endDate) : '-',
      width: '120px',
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (plan: PlanItem) => formatMoney(plan.amount, plan.currency),
      width: '150px',
    },
    {
      key: 'articleName',
      header: 'Статья',
      render: (plan: PlanItem) => plan.articleName || '-',
    },
    {
      key: 'repeat',
      header: 'Повторение',
      render: (plan: PlanItem) => getRepeatLabel(plan.repeat),
      width: '150px',
    },
    {
      key: 'status',
      header: 'Статус',
      render: (plan: PlanItem) => getStatusLabel(plan.status),
      width: '120px',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (plan: PlanItem) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(plan);
            }}
            className="text-primary-600 hover:text-primary-800 text-sm"
          >
            Изменить
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(plan.id);
            }}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Удалить
          </button>
        </div>
      ),
      width: '150px',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Планы (БДДС)</h1>
          <Button onClick={handleCreate}>Создать план</Button>
        </div>

        <Card>
          <Table
            columns={columns}
            data={plans}
            keyExtractor={(plan) => plan.id}
            loading={isLoading}
            emptyMessage="Нет планов"
          />
        </Card>

        <Modal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={editingPlan ? 'Редактировать план' : 'Создать план'}
          size="lg"
        >
          <PlanForm plan={editingPlan} onClose={handleCloseForm} />
        </Modal>
      </div>
    </Layout>
  );
};
