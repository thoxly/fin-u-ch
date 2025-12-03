import { apiSlice } from './apiSlice';
import type { Role } from './rolesApi';

// Типы для пользователей
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyId: string;
  isActive: boolean;
  isSuperAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
  tempPassword?: string; // Временный пароль (только при приглашении)
}

export interface UserRole {
  id: string;
  roleId: string;
  role: Role;
  assignedAt: string;
  assignedBy?: string;
}

export interface AssignRoleRequest {
  roleId: string;
}

// Типы для прав
export interface PermissionsByEntity {
  [entity: string]: string[]; // entity -> массив разрешённых действий
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Получить всех пользователей компании
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),

    // Получить роли пользователя
    getUserRoles: builder.query<UserRole[], string>({
      query: (userId) => `/users/${userId}/roles`,
      providesTags: (result, error, userId) => [
        { type: 'User', id: userId },
        'Role',
      ],
    }),

    // Назначить роль пользователю
    assignRole: builder.mutation<UserRole, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles`,
        method: 'POST',
        body: { roleId },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId },
        'User', // Инвалидируем общий список пользователей
        'Role', // Инвалидируем роли, так как изменилось количество пользователей с ролями
      ],
    }),

    // Снять роль с пользователя
    removeRole: builder.mutation<void, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId },
        'User', // Инвалидируем общий список пользователей
        'Role', // Инвалидируем роли, так как изменилось количество пользователей с ролями
        'Permission', // Инвалидируем права, так как изменились роли пользователя
      ],
    }),

    // Получить права пользователя
    getUserPermissions: builder.query<PermissionsByEntity, string>({
      query: (userId) => `/users/${userId}/permissions`,
      providesTags: (result, error, userId) => [
        { type: 'User', id: userId },
        'Permission',
      ],
    }),

    // Пригласить пользователя
    inviteUser: builder.mutation<User, { email: string; roleIds?: string[] }>({
      query: (data) => ({
        url: '/users/invite',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Обновить пользователя (для админки)
    updateUserById: builder.mutation<
      User,
      {
        userId: string;
        data: { firstName?: string; lastName?: string; isActive?: boolean };
      }
    >({
      query: ({ userId, data }) => {
        console.log('[usersApi.updateUserById] Called with:', { userId, data });
        if (!userId || userId === 'me') {
          console.error('[usersApi.updateUserById] Invalid userId:', userId);
          throw new Error(
            'Invalid userId: cannot use "me" for admin user update'
          );
        }
        const url = `/users/${userId}`;
        console.log('[usersApi.updateUserById] Making request to:', url);
        return {
          url,
          method: 'PATCH',
          body: data,
        };
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', id: userId },
        'User',
      ],
    }),

    // Удалить пользователя
    deleteUser: builder.mutation<{ success: boolean }, string>({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: 'DELETE',
      }),
      // Оптимистичное обновление: сразу удаляем пользователя из списка
      async onQueryStarted(userId, { dispatch, queryFulfilled }) {
        // Оптимистично удаляем пользователя из кэша
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getUsers', undefined, (draft) => {
            const index = draft.findIndex((user) => user.id === userId);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          // В случае ошибки откатываем изменения
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, userId) => [
        { type: 'User', id: userId },
        'User',
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useGetUserRolesQuery,
  useLazyGetUserRolesQuery,
  useAssignRoleMutation,
  useRemoveRoleMutation,
  useGetUserPermissionsQuery,
  useLazyGetUserPermissionsQuery,
  useInviteUserMutation,
  useUpdateUserByIdMutation,
  useDeleteUserMutation,
} = usersApi;

// Для обратной совместимости - используем прямое имя, чтобы избежать конфликта с authApi
export { useUpdateUserByIdMutation as useUpdateUserMutation };
