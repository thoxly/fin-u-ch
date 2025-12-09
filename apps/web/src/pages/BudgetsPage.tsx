import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Archive, RotateCcw } from 'lucide-react';

import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { Table } from '../shared/ui/Table';
import { Modal } from '../shared/ui/Modal';
import { ConfirmDeleteModal } from '../shared/ui/ConfirmDeleteModal';
import { Input } from '../shared/ui/Input';
import { FeatureBlocker } from '../shared/ui/FeatureBlocker';
import { usePermissions } from '../shared/hooks/usePermissions';
import { ProtectedAction } from '../shared/components/ProtectedAction';
import {
  useGetBudgetsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} from '../store/api/budgetsApi';
import { formatDate } from '../shared/lib/date';
import type { Budget } from '@fin-u-ch/shared';
import { useNotification } from '../shared/hooks/useNotification';
import { useAppSelector } from '../shared/hooks/useRedux';
import { RootState } from '../store/store';

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
  const { canRead } = usePermissions();

  const { data: budgets = [], isLoading } = useGetBudgetsQuery(
    { status: filter },
    { skip: !canRead('budgets') }
  );
  const [createBudget, { isLoading: isCreating }] = useCreateBudgetMutation();
  const [updateBudget] = useUpdateBudgetMutation();
  const [deleteBudget] = useDeleteBudgetMutation();
  const { showSuccess, showError } = useNotification();

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
      showSuccess('Бюджет успешно создан');
      setIsFormOpen(false);
      setFormData({ name: '', startDate: '', endDate: '' });
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
        : 'Ошибка при создании бюджета';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при создании бюджета'
      );
    }
  };

  const handleArchive = async (budget: Budget) => {
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
      await deleteBudget(deleteModal.id).unwrap();
      showSuccess('Бюджет успешно удален');
      setDeleteModal({ isOpen: false, id: null });
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
        : 'Не удалось удалить бюджет. Возможно, у него есть плановые записи. Используйте архивирование.';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Не удалось удалить бюджет. Возможно, у него есть плановые записи. Используйте архивирование.'
      );
      setDeleteModal({ isOpen: false, id: null });
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
          {budget.status === 'active' ? (
            <ProtectedAction entity="budgets" action="archive">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive(budget);
                }}
                title="Архивировать"
              >
                <Archive className="w-4 h-4" />
              </Button>
            </ProtectedAction>
          ) : (
            <ProtectedAction entity="budgets" action="restore">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive(budget);
                }}
                title="Восстановить"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </ProtectedAction>
          )}
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
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(budget.id);
              }}
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

  // Проверяем доступ к фиче "planning" (требует TEAM+)

  const subscriptionData = useAppSelector(
    (state: RootState) => state.subscription?.data ?? null
  );
  const planHierarchy = { START: 0, TEAM: 1, BUSINESS: 2 };
  const requiredLevel = planHierarchy['TEAM'];
  const currentLevel = planHierarchy[subscriptionData?.plan || 'START'] || 0;

  if (currentLevel < requiredLevel) {
    return (
      <Layout>
        <FeatureBlocker feature="planning" requiredPlan="TEAM" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Бюджеты
        </h1>
        <ProtectedAction entity="budgets" action="create">
          <Button onClick={handleCreate}>Создать бюджет</Button>
        </ProtectedAction>
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
          keyExtractor={(budget) => budget.id}
          onRowClick={(budget) => handleOpenDetails(budget.id)}
          loading={isLoading}
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

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        message="Вы уверены, что хотите удалить этот бюджет? Это возможно только если у бюджета нет плановых записей."
        confirmText="Удалить"
        description="Если у бюджета есть плановые записи, используйте архивирование."
      />
    </Layout>
  );
};
