import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Shield, Plus } from 'lucide-react';
import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Modal } from '../../shared/ui/Modal';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import {
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
  type Role,
  type Permission,
} from '../../store/api/rolesApi';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { ProtectedAction } from '../../shared/components/ProtectedAction';
import { useNotification } from '../../shared/hooks/useNotification';

// Список всех сущностей и действий
const ENTITIES = [
  { name: 'dashboard', label: 'Дашборд' },
  { name: 'articles', label: 'Статьи' },
  { name: 'accounts', label: 'Счета' },
  { name: 'departments', label: 'Подразделения' },
  { name: 'counterparties', label: 'Контрагенты' },
  { name: 'deals', label: 'Сделки' },
  { name: 'salaries', label: 'Зарплаты' },
  { name: 'operations', label: 'Операции' },
  { name: 'budgets', label: 'Бюджеты' },
  { name: 'reports', label: 'Отчёты' },
  { name: 'users', label: 'Пользователи' },
  { name: 'audit', label: 'Журнал действий' },
];

const ACTIONS = [
  { name: 'create', label: 'Создание' },
  { name: 'read', label: 'Просмотр' },
  { name: 'update', label: 'Редактирование' },
  { name: 'delete', label: 'Удаление' },
  { name: 'confirm', label: 'Подтверждение' },
  { name: 'cancel', label: 'Отмена' },
  { name: 'export', label: 'Экспорт' },
  { name: 'manage_roles', label: 'Управление ролями' },
];

// Компонент строки сущности в таблице прав
interface EntityRowProps {
  entity: { name: string; label: string };
  allChecked: boolean;
  someChecked: boolean;
  permissions: Record<string, Record<string, boolean>>;
  toggleEntityPermissions: (entity: string, value: boolean) => void;
  togglePermission: (entity: string, action: string) => void;
}

const EntityRow = ({
  entity,
  allChecked,
  someChecked,
  permissions,
  toggleEntityPermissions,
  togglePermission,
}: EntityRowProps) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someChecked && !allChecked;
    }
  }, [allChecked, someChecked]);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="p-2 sm:p-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 z-10 text-xs sm:text-sm">
        {entity.label}
      </td>
      <td className="p-2 sm:p-3 text-center">
        <label className="flex items-center justify-center cursor-pointer">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={allChecked}
            onChange={(e) =>
              toggleEntityPermissions(entity.name, e.target.checked)
            }
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            title="Выбрать все права для этой сущности"
          />
        </label>
      </td>
      {ACTIONS.map((action) => {
        // Проверяем, применимо ли действие к сущности
        const isApplicable =
          (entity.name === 'dashboard' && action.name === 'read') ||
          (entity.name === 'operations' &&
            ['confirm', 'cancel'].includes(action.name)) ||
          (entity.name === 'reports' && action.name === 'export') ||
          (entity.name === 'users' && action.name === 'manage_roles') ||
          (entity.name === 'audit' && action.name === 'read') ||
          ['create', 'read', 'update', 'delete'].includes(action.name);

        if (!isApplicable) {
          return (
            <td key={action.name} className="p-1 sm:p-2 text-center">
              <span className="text-gray-300 dark:text-gray-600">—</span>
            </td>
          );
        }

        const isChecked = permissions[entity.name]?.[action.name] || false;
        return (
          <td key={action.name} className="p-1 sm:p-2 text-center">
            <label className="flex items-center justify-center cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => togglePermission(entity.name, action.name)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </label>
          </td>
        );
      })}
    </tr>
  );
};

export const RolesPage = () => {
  const navigate = useNavigate();
  const { canManageRoles } = usePermissions();
  const { showSuccess, showError } = useNotification();

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Форма роли
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleCategory, setRoleCategory] = useState('');

  // Права роли
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const { data: roles = [], isLoading } = useGetRolesQuery();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  const { data: rolePermissions, isLoading: isLoadingPermissions } =
    useGetRolePermissionsQuery(selectedRole?.id || '', {
      skip: !selectedRole?.id || !isPermissionsModalOpen,
    });
  const [updateRolePermissions] = useUpdateRolePermissionsMutation();

  // Фильтрация ролей
  const filteredRoles = categoryFilter
    ? roles.filter((role) => role.category === categoryFilter)
    : roles;

  // Получение уникальных категорий
  const categories = Array.from(
    new Set(roles.map((r) => r.category).filter(Boolean))
  );

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleCategory('');
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleCategory(role.category || '');
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await updateRole({
          id: editingRole.id,
          data: {
            name: roleName,
            description: roleDescription || undefined,
            category: roleCategory || undefined,
          },
        }).unwrap();
        showSuccess('Роль успешно обновлена');
      } else {
        await createRole({
          name: roleName,
          description: roleDescription || undefined,
          category: roleCategory || undefined,
        }).unwrap();
        showSuccess('Роль успешно создана');
      }
      setIsRoleModalOpen(false);
      resetForm();
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
        : 'Ошибка при сохранении роли';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при сохранении роли'
      );
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      showError('Нельзя удалить системную роль');
      return;
    }

    try {
      await deleteRole(role.id).unwrap();
      showSuccess('Роль успешно удалена');
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
        : 'Ошибка при удалении роли';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при удалении роли'
      );
    }
  };

  const handleEditPermissions = (role: Role) => {
    if (role.isSystem) {
      showError('Нельзя редактировать права системной роли');
      return;
    }
    setSelectedRole(role);
    setIsPermissionsModalOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      // Преобразуем permissions в массив Permission[]
      // Отправляем только те права, которые были явно установлены (checked = true)
      const permissionsArray: Permission[] = [];
      for (const [entity, actions] of Object.entries(permissions)) {
        for (const [action, allowed] of Object.entries(actions)) {
          // Отправляем все права, включая false (чтобы явно запретить)
          permissionsArray.push({ entity, action, allowed: !!allowed });
        }
      }

      await updateRolePermissions({
        roleId: selectedRole.id,
        permissions: permissionsArray,
      }).unwrap();
      showSuccess('Права успешно обновлены');
      setIsPermissionsModalOpen(false);
      setSelectedRole(null);
      setPermissions({});
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
        : 'Ошибка при обновлении прав';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при обновлении прав'
      );
    }
  };

  const resetForm = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleCategory('');
  };

  // Загрузка прав при открытии модального окна
  useEffect(() => {
    if (isPermissionsModalOpen && rolePermissions && selectedRole) {
      // Инициализируем permissions из API ответа
      const loadedPermissions = rolePermissions.permissions || {};
      setPermissions(loadedPermissions);
    } else if (isPermissionsModalOpen && !rolePermissions) {
      // Если прав еще нет, инициализируем пустым объектом
      setPermissions({});
    }
  }, [isPermissionsModalOpen, rolePermissions, selectedRole]);

  const togglePermission = (entity: string, action: string) => {
    setPermissions((prev) => {
      const currentValue = prev[entity]?.[action] || false;
      const newValue = !currentValue;

      const newEntityPermissions = { ...prev[entity] };

      // Устанавливаем основное действие
      newEntityPermissions[action] = newValue;

      // Автоматическая иерархия прав:
      // delete → update → read
      // update → read

      if (newValue) {
        // Включаем действие - автоматически включаем зависимые
        if (action === 'delete') {
          // Если включаем delete, автоматически включаем update и read
          newEntityPermissions['update'] = true;
          newEntityPermissions['read'] = true;
        } else if (action === 'update') {
          // Если включаем update, автоматически включаем read
          newEntityPermissions['read'] = true;
        }
      } else {
        // Выключаем действие - автоматически выключаем зависящие от него
        if (action === 'read') {
          // Если выключаем read, автоматически выключаем update и delete
          newEntityPermissions['update'] = false;
          newEntityPermissions['delete'] = false;
        } else if (action === 'update') {
          // Если выключаем update, автоматически выключаем delete
          newEntityPermissions['delete'] = false;
        }
      }

      return {
        ...prev,
        [entity]: newEntityPermissions,
      };
    });
  };

  // Массовое включение/выключение всех прав для сущности
  const toggleEntityPermissions = (entity: string, value: boolean) => {
    setPermissions((prev) => {
      const newPermissions = { ...prev };
      const applicableActions = ACTIONS.filter((action) => {
        const isApplicable =
          (entity === 'dashboard' && action.name === 'read') ||
          (entity === 'operations' &&
            ['confirm', 'cancel'].includes(action.name)) ||
          (entity === 'reports' && action.name === 'export') ||
          (entity === 'users' && action.name === 'manage_roles') ||
          (entity === 'audit' && action.name === 'read') ||
          ['create', 'read', 'update', 'delete'].includes(action.name);
        return isApplicable;
      });

      newPermissions[entity] = {};
      applicableActions.forEach((action) => {
        newPermissions[entity][action.name] = value;
      });

      return newPermissions;
    });
  };

  const columns = [
    { key: 'name', header: 'Название' },
    { key: 'category', header: 'Категория' },
    {
      key: 'usersCount',
      header: 'Пользователей',
      render: (role: Role) => role._count?.userRoles || 0,
    },
    {
      key: 'isSystem',
      header: 'Тип',
      render: (role: Role) =>
        role.isSystem ? 'Системная' : 'Пользовательская',
    },
    {
      key: 'isActive',
      header: 'Статус',
      render: (role: Role) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            role.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {role.isActive ? 'Активна' : 'Неактивна'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (role: Role) => (
        <div className="flex gap-2">
          <ProtectedAction entity="users" action="manage_roles">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditPermissions(role);
              }}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
              title="Редактировать права"
            >
              <Shield size={16} />
            </button>
          </ProtectedAction>
          <ProtectedAction entity="users" action="manage_roles">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditRole(role);
              }}
              className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
              title="Изменить"
            >
              <Pencil size={16} />
            </button>
          </ProtectedAction>
          {!role.isSystem && (
            <ProtectedAction entity="users" action="manage_roles">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRole(role);
                }}
                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </ProtectedAction>
          )}
        </div>
      ),
    },
  ];

  if (!canManageRoles()) {
    return (
      <Layout>
        <Card className="p-8 text-center max-w-md mx-auto">
          <Shield size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            Доступ запрещён
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            У вас нет прав для управления ролями
          </p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <ProtectedAction entity="users" action="manage_roles">
              <Button
                onClick={handleCreateRole}
                icon={<Plus size={20} />}
                className="w-full sm:w-auto"
              >
                Создать роль
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Фильтры */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <Select
                label="Категория"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: '', label: 'Все категории' },
                  ...categories.map((cat) => ({ value: cat, label: cat })),
                ]}
                placeholder="Выберите категорию"
              />
            </div>
          </div>
        </Card>

        {/* Таблица ролей */}
        <Card>
          <Table
            columns={columns}
            data={filteredRoles}
            keyExtractor={(role) => role.id}
            loading={isLoading}
            emptyMessage="Нет ролей"
          />
        </Card>

        {/* Модальное окно создания/редактирования роли */}
        <Modal
          isOpen={isRoleModalOpen}
          onClose={() => {
            setIsRoleModalOpen(false);
            resetForm();
          }}
          title={editingRole ? 'Редактировать роль' : 'Создать роль'}
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="Название роли"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
            />
            <Input
              label="Описание"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
            />
            <Input
              label="Категория"
              value={roleCategory}
              onChange={(e) => setRoleCategory(e.target.value)}
              placeholder="Например: Бухгалтерия, Менеджеры"
            />
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  resetForm();
                }}
                className="w-full sm:w-auto"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSaveRole}
                disabled={!roleName.trim()}
                className="w-full sm:w-auto"
              >
                Сохранить
              </Button>
            </div>
          </div>
        </Modal>

        {/* Модальное окно редактирования прав */}
        <Modal
          isOpen={isPermissionsModalOpen}
          onClose={() => {
            setIsPermissionsModalOpen(false);
            setSelectedRole(null);
            setPermissions({});
          }}
          title={`Права роли: ${selectedRole?.name || ''}`}
          size="viewport"
        >
          {isLoadingPermissions ? (
            <div className="text-center py-8">Загрузка прав...</div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
                Установите права доступа для роли. Отметьте чекбоксы для
                разрешения действий.
              </div>
              <div className="overflow-x-auto border rounded-lg -mx-4 sm:mx-0">
                <div className="min-w-full inline-block">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr className="border-b">
                        <th className="text-left p-2 sm:p-3 font-semibold text-gray-900 dark:text-gray-100 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">
                          Сущность
                        </th>
                        <th className="text-center p-2 sm:p-3 font-semibold text-gray-900 dark:text-gray-100 text-xs">
                          Все
                        </th>
                        {ACTIONS.map((action) => (
                          <th
                            key={action.name}
                            className="text-center p-2 sm:p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap"
                          >
                            <span className="hidden sm:inline">
                              {action.label}
                            </span>
                            <span className="sm:hidden">
                              {action.label.substring(0, 3)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {ENTITIES.map((entity) => {
                        // Проверяем, все ли применимые права установлены
                        const applicableActions = ACTIONS.filter((action) => {
                          const isApplicable =
                            (entity.name === 'dashboard' &&
                              action.name === 'read') ||
                            (entity.name === 'articles' &&
                              ['archive', 'restore'].includes(action.name)) ||
                            (entity.name === 'budgets' &&
                              ['archive', 'restore'].includes(action.name)) ||
                            (entity.name === 'operations' &&
                              ['confirm', 'cancel'].includes(action.name)) ||
                            (entity.name === 'reports' &&
                              action.name === 'export') ||
                            (entity.name === 'users' &&
                              action.name === 'manage_roles') ||
                            (entity.name === 'audit' &&
                              action.name === 'read') ||
                            ['create', 'read', 'update', 'delete'].includes(
                              action.name
                            );
                          return isApplicable;
                        });

                        const allChecked = applicableActions.every(
                          (action) =>
                            permissions[entity.name]?.[action.name] === true
                        );
                        const someChecked = applicableActions.some(
                          (action) =>
                            permissions[entity.name]?.[action.name] === true
                        );

                        return (
                          <EntityRow
                            key={entity.name}
                            entity={entity}
                            allChecked={allChecked}
                            someChecked={someChecked}
                            permissions={permissions}
                            toggleEntityPermissions={toggleEntityPermissions}
                            togglePermission={togglePermission}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPermissionsModalOpen(false);
                    setSelectedRole(null);
                    setPermissions({});
                  }}
                  className="w-full sm:w-auto"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  className="w-full sm:w-auto"
                >
                  Сохранить права
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
