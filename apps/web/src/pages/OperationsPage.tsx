import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { Table } from '../shared/ui/Table';
import { Modal } from '../shared/ui/Modal';
import { OperationForm } from '../features/operation-form/OperationForm';
import {
  useGetOperationsQuery,
  useDeleteOperationMutation,
} from '../store/api/operationsApi';
import { formatDate } from '../shared/lib/date';
import { formatMoney } from '../shared/lib/money';
import type { Operation } from '@shared/types/operations';
import { useNotification } from '../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../constants/notificationMessages';

export const OperationsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(
    null
  );

  const { data: operations = [], isLoading } = useGetOperationsQuery();
  const [deleteOperation] = useDeleteOperationMutation();
  const { showSuccess, showError } = useNotification();

  const handleCreate = () => {
    setEditingOperation(null);
    setIsFormOpen(true);
  };

  const handleEdit = (operation: Operation) => {
    setEditingOperation(operation);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту операцию?')) {
      try {
        await deleteOperation(id).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.OPERATION.DELETE_SUCCESS);
      } catch (error) {
        console.error('Failed to delete operation:', error);
        showError(NOTIFICATION_MESSAGES.OPERATION.DELETE_ERROR);
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingOperation(null);
  };

  const getOperationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: 'Доход',
      expense: 'Расход',
      transfer: 'Перевод',
    };
    return labels[type] || type;
  };

  const columns = [
    {
      key: 'operationDate',
      header: 'Дата',
      render: (op: Operation) => formatDate(op.operationDate),
      width: '120px',
    },
    {
      key: 'type',
      header: 'Тип',
      render: (op: Operation) => getOperationTypeLabel(op.type),
      width: '100px',
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (op: Operation) => formatMoney(op.amount, op.currency),
      width: '150px',
    },
    {
      key: 'articleName',
      header: 'Статья',
      render: (op: Operation) => op.articleName || '-',
    },
    {
      key: 'accountName',
      header: 'Счет',
      render: (op: Operation) => op.accountName || '-',
    },
    {
      key: 'description',
      header: 'Описание',
      render: (op: Operation) => op.description || '-',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (op: Operation) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(op);
            }}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(op.id);
            }}
            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
            title="Удалить"
          >
            <Trash2 size={16} />
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
          <h1 className="text-3xl font-bold text-gray-900">Операции</h1>
          <Button onClick={handleCreate}>Создать операцию</Button>
        </div>

        <Card>
          <Table
            columns={columns}
            data={operations}
            keyExtractor={(op) => op.id}
            loading={isLoading}
            emptyMessage="Нет операций"
          />
        </Card>

        <Modal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={
            editingOperation ? 'Редактировать операцию' : 'Создать операцию'
          }
          size="lg"
        >
          <OperationForm
            operation={editingOperation}
            onClose={handleCloseForm}
          />
        </Modal>
      </div>
    </Layout>
  );
};
