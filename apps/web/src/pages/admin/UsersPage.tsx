import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  UserPlus,
  Shield,
  Mail,
  User,
  Search,
  Copy,
  Check,
} from 'lucide-react';
import { AdminLayout } from '../../shared/ui/AdminLayout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Modal } from '../../shared/ui/Modal';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { UserLimitIndicator } from '../../shared/ui/UserLimitIndicator';
import {
  useGetUsersQuery,
  useGetUserRolesQuery,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useInviteUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '../../store/api/usersApi';
import { useGetSubscriptionQuery } from '../../store/api/subscriptionApi';
import { useGetRolesQuery } from '../../store/api/rolesApi';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { ProtectedAction } from '../../shared/components/ProtectedAction';
import { useNotification } from '../../shared/hooks/useNotification';
import type { User as UserType } from '../../store/api/usersApi';

export const UsersPage = () => {
  const navigate = useNavigate();
  const { canRead, isSuperAdmin, hasPermission } = usePermissions();
  const { showSuccess, showError } = useNotification();

  // Проверяем, может ли пользователь удалять других пользователей
  // Только супер-пользователи и администраторы с правом users:delete
  const canDeleteUsers = isSuperAdmin || hasPermission('users', 'delete');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    user: UserType | null;
  }>({
    isOpen: false,
    user: null,
  });

  // Форма приглашения
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<string>('');
  const [tempPassword, setTempPassword] = useState<string>('');
  const [invitedUserEmail, setInvitedUserEmail] = useState<string>('');
  const [isPasswordCopied, setIsPasswordCopied] = useState(false);

  // Форма редактирования
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Загружаем данные пользователей
  const { data: users = [], isLoading } = useGetUsersQuery(undefined, {
    skip: !canRead('users'),
  });

  // Компонент для отображения ролей пользователя
  const UserRolesCell = ({ userId }: { userId: string }) => {
    const { data: roles = [], isLoading } = useGetUserRolesQuery(userId, {
      skip: !userId,
    });

    if (isLoading) {
      return <span className="text-gray-400 text-sm">Загрузка...</span>;
    }

    if (roles.length === 0) {
      return <span className="text-gray-500">-</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {roles.slice(0, 2).map((userRole) => (
          <span
            key={userRole.id}
            className="px-1.5 sm:px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          >
            <span className="hidden sm:inline">{userRole.role.name}</span>
            <span className="sm:hidden">
              {userRole.role.name.substring(0, 8)}
            </span>
          </span>
        ))}
        {roles.length > 2 && (
          <span className="px-1.5 sm:px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            +{roles.length - 2}
          </span>
        )}
      </div>
    );
  };

  // Фильтрация пользователей
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // По умолчанию показываем только активных пользователей
      // Удаленные (неактивные) пользователи не должны отображаться в таблице
      if (!statusFilter && !user.isActive) {
        return false;
      }

      // Поиск по email и имени
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesEmail = user.email.toLowerCase().includes(query);
        const matchesName =
          (user.firstName?.toLowerCase().includes(query) ||
            user.lastName?.toLowerCase().includes(query)) ??
          false;
        if (!matchesEmail && !matchesName) return false;
      }

      // Фильтр по статусу
      if (statusFilter) {
        if (statusFilter === 'active' && !user.isActive) return false;
        if (statusFilter === 'inactive' && user.isActive) return false;
      }

      return true;
    });
  }, [users, searchQuery, statusFilter]);
  const { data: roles = [] } = useGetRolesQuery();
  const { data: userRoles = [] } = useGetUserRolesQuery(
    selectedUser?.id || '',
    {
      skip: !selectedUser?.id || !isRolesModalOpen,
    }
  );
  const [assignRole] = useAssignRoleMutation();
  const [removeRole] = useRemoveRoleMutation();
  const [inviteUser] = useInviteUserMutation();
  const { data: subscription } = useGetSubscriptionQuery(undefined, {
    skip: false,
  });
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const handleInviteUser = () => {
    setInviteEmail('');
    setInviteRoleId('');
    setIsInviteModalOpen(true);
  };

  const handleSaveInvite = async () => {
    if (!inviteEmail.trim()) {
      showError('Введите email');
      return;
    }

    try {
      const result = await inviteUser({
        email: inviteEmail.trim(),
        roleIds: inviteRoleId ? [inviteRoleId] : undefined,
      }).unwrap();

      // Сохраняем временный пароль и email для отображения
      if ('tempPassword' in result && typeof result.tempPassword === 'string') {
        setTempPassword(result.tempPassword);
        setInvitedUserEmail(result.email);
        setIsInviteModalOpen(false);
        setIsPasswordModalOpen(true);
        setInviteEmail('');
        setInviteRoleId('');
      } else {
        showSuccess('Пользователь успешно приглашён');
        setIsInviteModalOpen(false);
        setInviteEmail('');
        setInviteRoleId('');
      }
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
        : 'Ошибка при приглашении пользователя';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при приглашении пользователя'
      );
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setIsPasswordCopied(true);
      showSuccess('Пароль скопирован в буфер обмена');
      setTimeout(() => setIsPasswordCopied(false), 2000);
    } catch (error) {
      showError('Не удалось скопировать пароль');
    }
  };

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditIsActive(user.isActive);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    if (!selectedUser.id || selectedUser.id === 'me') {
      showError('Некорректный ID пользователя');
      return;
    }

    try {
      await updateUser({
        userId: selectedUser.id,
        data: {
          firstName: editFirstName.trim() || undefined,
          lastName: editLastName.trim() || undefined,
          isActive: editIsActive,
        },
      }).unwrap();
      showSuccess('Пользователь успешно обновлён');
      setIsEditModalOpen(false);
      setSelectedUser(null);
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
        : 'Ошибка при обновлении пользователя';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при обновлении пользователя'
      );
    }
  };

  const handleManageRoles = (user: UserType) => {
    setSelectedUser(user);
    setIsRolesModalOpen(true);
  };

  const handleAssignRole = async (roleId: string) => {
    if (!selectedUser) return;

    try {
      await assignRole({
        userId: selectedUser.id,
        roleId,
      }).unwrap();
      showSuccess('Роль успешно назначена');
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
        : 'Ошибка при назначении роли';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при назначении роли'
      );
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!selectedUser) return;

    if (
      window.confirm('Вы уверены, что хотите снять эту роль с пользователя?')
    ) {
      try {
        await removeRole({
          userId: selectedUser.id,
          roleId,
        }).unwrap();
        showSuccess('Роль успешно снята');
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
          : 'Ошибка при снятии роли';

        showError(
          errorMessage &&
            errorMessage.length > 5 &&
            !errorMessage.match(/^[A-Z_]+$/)
            ? errorMessage
            : 'Ошибка при снятии роли'
        );
      }
    }
  };

  const handleDeleteUser = (user: UserType) => {
    setDeleteModal({ isOpen: true, user });
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.user) return;

    const user = deleteModal.user;

    if (user.isSuperAdmin) {
      showError('Нельзя удалить супер-администратора');
      setDeleteModal({ isOpen: false, user: null });
      return;
    }

    try {
      await deleteUser(user.id).unwrap();
      showSuccess('Пользователь успешно удалён');
      setDeleteModal({ isOpen: false, user: null });
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
        : 'Ошибка при удалении пользователя';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при удалении пользователя'
      );
      setDeleteModal({ isOpen: false, user: null });
    }
  };

  const columns = [
    { key: 'email', header: 'Email' },
    {
      key: 'name',
      header: 'Имя',
      render: (user: UserType) =>
        user.firstName || user.lastName
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
          : '-',
    },
    {
      key: 'roles',
      header: 'Роли',
      render: (user: UserType) => <UserRolesCell userId={user.id} />,
    },
    {
      key: 'isActive',
      header: 'Статус',
      render: (user: UserType) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            user.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {user.isActive ? 'Активен' : 'Неактивен'}
        </span>
      ),
    },
    {
      key: 'isSuperAdmin',
      header: 'Тип',
      render: (user: UserType) =>
        user.isSuperAdmin ? (
          <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            Администратор
          </span>
        ) : (
          <span className="text-gray-500">Пользователь</span>
        ),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (user: UserType) => (
        <div className="flex gap-2">
          <ProtectedAction entity="users" action="manage_roles">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleManageRoles(user);
              }}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
              title="Управление ролями"
            >
              <Shield size={16} />
            </button>
          </ProtectedAction>
          <ProtectedAction entity="users" action="update">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditUser(user);
              }}
              className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
              title="Редактировать"
            >
              <Pencil size={16} />
            </button>
          </ProtectedAction>
          {canDeleteUsers && !user.isSuperAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteUser(user);
              }}
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
              title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (!canRead('users')) {
    return (
      <AdminLayout>
        <Card className="p-8 text-center max-w-md mx-auto">
          <User size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            Доступ запрещён
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            У вас нет прав для просмотра пользователей
          </p>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Пользователи
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Управление пользователями компании
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => navigate('/admin')}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Назад
            </Button>
            <ProtectedAction entity="users" action="create">
              <Button
                onClick={handleInviteUser}
                icon={<UserPlus size={20} />}
                className="w-full sm:w-auto"
                disabled={
                  !!subscription &&
                  subscription.userLimit &&
                  (subscription.userLimit.remaining === 0 ||
                    (subscription.userLimit.remaining !== null &&
                      subscription.userLimit.remaining <= 0))
                }
              >
                {subscription &&
                subscription.userLimit &&
                subscription.userLimit.remaining !== null &&
                subscription.userLimit.remaining <= 0
                  ? 'Лимит пользователей исчерпан'
                  : 'Пригласить пользователя'}
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Индикатор лимита пользователей */}
        <Card>
          <UserLimitIndicator showLabel={true} showTooltip={true} />
        </Card>
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <Input
                label="Поиск"
                placeholder="Поиск по email или имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                label="Статус"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'Все статусы' },
                  { value: 'active', label: 'Активные' },
                  { value: 'inactive', label: 'Неактивные' },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Таблица пользователей */}
        <Card>
          <Table
            columns={columns}
            data={filteredUsers}
            keyExtractor={(user) => user.id}
            loading={isLoading}
            emptyMessage="Нет пользователей"
          />
        </Card>

        {/* Модальное окно приглашения пользователя */}
        <Modal
          isOpen={isInviteModalOpen}
          onClose={() => {
            setIsInviteModalOpen(false);
            setInviteEmail('');
            setInviteRoleId('');
          }}
          title="Пригласить пользователя"
          size="md"
        >
          <div className="flex flex-col min-h-0">
            <div className="space-y-4 flex-1 min-h-0">
              <Input
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                icon={<Mail size={18} />}
              />
              <div>
                <Select
                  label="Роль (опционально)"
                  value={inviteRoleId}
                  onChange={setInviteRoleId}
                  options={[
                    { value: '', label: 'Без роли' },
                    ...roles.map((role) => ({
                      value: role.id,
                      label: role.name,
                    })),
                  ]}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Выберите роль, которая будет назначена пользователю при
                  регистрации
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteEmail('');
                  setInviteRoleId('');
                }}
                className="w-full sm:w-auto"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSaveInvite}
                disabled={!inviteEmail.trim()}
                className="w-full sm:w-auto"
              >
                Отправить приглашение
              </Button>
            </div>
          </div>
        </Modal>

        {/* Модальное окно редактирования пользователя */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          title="Редактировать пользователя"
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="Имя"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
            />
            <Input
              label="Фамилия"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
            />
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Активен</span>
              </label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="w-full sm:w-auto"
              >
                Отмена
              </Button>
              <Button onClick={handleSaveEdit} className="w-full sm:w-auto">
                Сохранить
              </Button>
            </div>
          </div>
        </Modal>

        {/* Модальное окно управления ролями */}
        <Modal
          isOpen={isRolesModalOpen}
          onClose={() => {
            setIsRolesModalOpen(false);
            setSelectedUser(null);
          }}
          title={`Роли пользователя: ${selectedUser?.email || ''}`}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Назначенные роли</h3>
              {userRoles.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  У пользователя нет назначенных ролей
                </p>
              ) : (
                <div className="space-y-2">
                  {userRoles.map((userRole) => (
                    <div
                      key={userRole.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <div>
                        <span className="font-medium">
                          {userRole.role.name}
                        </span>
                        {userRole.role.isSystem && (
                          <span className="ml-2 text-xs text-gray-500">
                            (Системная)
                          </span>
                        )}
                      </div>
                      {!userRole.role.isSystem && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveRole(userRole.roleId)}
                        >
                          Снять
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Доступные роли</h3>
              <div className="space-y-2">
                {roles
                  .filter(
                    (role) =>
                      !userRoles.some((ur) => ur.roleId === role.id) &&
                      role.isActive
                  )
                  .map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <div>
                        <span className="font-medium">{role.name}</span>
                        {role.category && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({role.category})
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssignRole(role.id)}
                        disabled={role.isSystem && !isSuperAdmin}
                      >
                        Назначить
                      </Button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRolesModalOpen(false);
                  setSelectedUser(null);
                }}
                className="w-full sm:w-auto"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </Modal>

        {/* Модальное окно с временным паролем */}
        <Modal
          isOpen={isPasswordModalOpen}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setTempPassword('');
            setInvitedUserEmail('');
            setIsPasswordCopied(false);
          }}
          title="Пользователь успешно приглашён"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Пользователь <strong>{invitedUserEmail}</strong> успешно создан
                в системе.
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Сохраните временный пароль и передайте его пользователю для
                первого входа в систему.
              </p>
            </div>

            <div>
              <label className="label">Временный пароль</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  value={tempPassword}
                  readOnly
                  className="font-mono text-base sm:text-lg tracking-wider"
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  onClick={handleCopyPassword}
                  variant={isPasswordCopied ? 'outline' : 'primary'}
                  icon={
                    isPasswordCopied ? <Check size={18} /> : <Copy size={18} />
                  }
                  className="w-full sm:w-auto sm:min-w-[120px]"
                >
                  {isPasswordCopied ? 'Скопировано' : 'Копировать'}
                </Button>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                ⚠️ Этот пароль показывается только один раз. Убедитесь, что вы
                его сохранили.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Важно:</strong> Рекомендуется, чтобы пользователь
                изменил пароль при первом входе в систему.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setTempPassword('');
                  setInvitedUserEmail('');
                  setIsPasswordCopied(false);
                }}
                className="w-full sm:w-auto"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </Modal>

        {/* Модалка подтверждения удаления */}
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, user: null })}
          title="Подтверждение удаления"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Вы уверены, что хотите удалить пользователя{' '}
              <span className="font-semibold">{deleteModal.user?.email}</span>?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Это действие нельзя отменить. Пользователь будет деактивирован и
              не сможет войти в систему.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
              >
                Отмена
              </Button>
              <Button variant="danger" onClick={confirmDeleteUser}>
                Удалить
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};
