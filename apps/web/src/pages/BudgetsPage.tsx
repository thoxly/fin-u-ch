import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Trash2, Archive, RotateCcw } from 'lucide-react';

import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { Table } from '../shared/ui/Table';
import { Modal } from '../shared/ui/Modal';
import { Input } from '../shared/ui/Input';
import {
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} from '../store/api/budgetsApi';
import { formatDate } from '../shared/lib/date';
import type { Budget } from '@fin-u-ch/shared';

export const BudgetsPage = () => {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });
  const [filter, setFilter] = useState<'active' | 'archived' | undefined>(
    'active'
  );

  const { data: budgets = [], isLoading } = useGetBudgetsQuery({
    status: filter,
  });
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget] = useUpdateBudgetMutation();
  const [deleteBudget] = useDeleteBudgetMutation();

  const handleCreate = () => {
    setFormData({ name: '', startDate: '', endDate: '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate) return;

    try {
      await createBudget({
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
      }).unwrap();
      setIsFormOpen(false);
      setFormData({ name: '', startDate: '', endDate: '' });
    } catch (error) {
      console.error('Failed to create budget:', error);
    }
  };

  const handleArchive = async (budget: Budget) => {
    const newStatus = budget.status === 'active' ? 'archived' : 'active';
    await updateBudget({
      id: budget.id,
      data: { status: newStatus },
    });
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        'Вы уверены, что хотите удалить этот бюджет? Это возможно только если у бюджета нет плановых записей.'
      )
    ) {
      try {
        await deleteBudget(id).unwrap();
      } catch (error) {
        alert(
          'Не удалось удалить бюджет. Возможно, у него есть плановые записи. Используйте архивирование.'
        );
      }
    }
  };

  const handleOpenDetails = (budgetId: string) => {
    navigate(`/budgets/${budgetId}`);
  };

  const getStatusLabel = (status: string) => {
    return status === 'active' ? 'Активен' : 'Архивирован';
  };

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'text-green-600 dark:text-green-400'
      : 'text-gray-500 dark:text-gray-400';
  };

  const columns = [
    {
      key: 'name',
      header: 'Название',
      render: (budget: Budget) => (
        <span className="font-medium">{budget.name}</span>
      ),
    },
    {
      key: 'period',
      header: 'Период',
      render: (budget: Budget) => (
        <>
          {formatDate(budget.startDate)}
          {' — '}
          {budget.endDate ? formatDate(budget.endDate) : '∞'}
        </>
      ),
      width: '200px',
    },
    {
      key: 'status',
      header: 'Статус',
      render: (budget: Budget) => (
        <span className={getStatusColor(budget.status)}>
          {getStatusLabel(budget.status)}
        </span>
      ),
      width: '120px',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (budget: Budget) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenDetails(budget.id)}
            title="Открыть бюджет"
          >
            <FolderOpen className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleArchive(budget)}
            title={budget.status === 'active' ? 'Архивировать' : 'Восстановить'}
          >
            {budget.status === 'active' ? (
              <Archive className="w-4 h-4" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(budget.id)}
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
      width: '150px',
    },
  ];

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Бюджеты
        </h1>
        <Button onClick={handleCreate}>Создать бюджет</Button>
      </div>

      {/* Фильтр */}
      <div className="mb-4 flex gap-2">
        <Button
          variant={filter === 'active' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Активные
        </Button>
        <Button
          variant={filter === 'archived' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('archived')}
        >
          Архивные
        </Button>
        <Button
          variant={filter === undefined ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter(undefined)}
        >
          Все
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={budgets}
          isLoading={isLoading}
          emptyMessage="Нет бюджетов"
        />
      </Card>

      {/* Форма создания */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Создать бюджет"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Название"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Например: Бюджет 2024"
          />
          <Input
            label="Дата начала"
            type="date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
            required
          />
          <Input
            label="Дата окончания (необязательно)"
            type="date"
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
