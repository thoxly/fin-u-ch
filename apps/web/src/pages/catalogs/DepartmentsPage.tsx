import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from '../../store/api/catalogsApi';
import type { Department } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';

export const DepartmentsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const { data: departments = [], isLoading } = useGetDepartmentsQuery();
  const [deleteDepartment] = useDeleteDepartmentMutation();

  const columns = [
    { key: 'name', header: 'Название' },
    { key: 'description', header: 'Описание' },
    {
      key: 'actions',
      header: 'Действия',
      render: (d: Department) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(d);
              setIsFormOpen(true);
            }}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => window.confirm('Удалить?') && deleteDepartment(d.id)}
            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
            title="Удалить"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Подразделения
          </h1>
          <Button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            Создать подразделение
          </Button>
        </div>
        <Card>
          <Table
            columns={columns}
            data={departments}
            keyExtractor={(d) => d.id}
            loading={isLoading}
          />
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать' : 'Создать'}
      >
        <DepartmentForm
          department={editing}
          onClose={() => setIsFormOpen(false)}
        />
      </OffCanvas>
    </Layout>
  );
};

export const DepartmentForm = ({
  department,
  onClose,
}: {
  department: Department | null;
  onClose: () => void;
}) => {
  const [name, setName] = useState(department?.name || '');
  const [description, setDescription] = useState(department?.description || '');
  const [create, { isLoading: isCreating }] = useCreateDepartmentMutation();
  const [update, { isLoading: isUpdating }] = useUpdateDepartmentMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (department)
        await update({
          id: department.id,
          data: { name, description },
        }).unwrap();
      else await create({ name, description }).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to save department:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        label="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {department ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
