import { Input, Button } from '@/shared/ui';
import {
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
} from '@/store/api/catalogsApi';
import { Department } from '@shared/types/catalogs';
import { useState, useEffect } from 'react';

export const DepartmentForm = ({
  department,
  onClose,
  onSuccess,
}: {
  department: Department | null;
  onClose: () => void;
  onSuccess?: (createdId: string) => void;
}) => {
  const [name, setName] = useState(department?.name || '');
  const [description, setDescription] = useState(department?.description || '');
  const [create, { isLoading: isCreating }] = useCreateDepartmentMutation();
  const [update, { isLoading: isUpdating }] = useUpdateDepartmentMutation();

  // Синхронизация локального состояния с пропсом department
  useEffect(() => {
    setName(department?.name || '');
    setDescription(department?.description || '');
  }, [department]); // Зависимость от department

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (department) {
        await update({
          id: department.id,
          data: { name, description },
        }).unwrap();
        onClose();
      } else {
        const result = await create({ name, description }).unwrap();
        if (onSuccess && result.id) {
          onSuccess(result.id);
        } else {
          onClose();
        }
      }
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
