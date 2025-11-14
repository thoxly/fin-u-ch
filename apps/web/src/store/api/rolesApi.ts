import { apiSlice } from './apiSlice';

// Типы для ролей
export interface Role {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  category?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  _count?: {
    userRoles: number;
  };
  permissions?: Array<{
    entity: string;
    action: string;
    allowed: boolean;
  }>;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

// Типы для прав
export interface Permission {
  entity: string;
  action: string;
  allowed: boolean;
}

export interface RolePermissions {
  roleId: string;
  roleName: string;
  permissions: Record<string, Record<string, boolean>>; // entity -> action -> allowed
  rawPermissions: Array<{
    id: string;
    roleId: string;
    entity: string;
    action: string;
    allowed: boolean;
  }>;
}

export interface UpdateRolePermissionsRequest {
  permissions: Permission[];
}

export const rolesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Получить все роли компании
    getRoles: builder.query<Role[], void>({
      query: () => '/roles',
      providesTags: ['Role'],
    }),

    // Получить роли по категории
    getRolesByCategory: builder.query<Role[], string>({
      query: (category) => `/roles/category/${category}`,
      providesTags: ['Role'],
    }),

    // Получить роль по ID
    getRole: builder.query<Role, string>({
      query: (id) => `/roles/${id}`,
      providesTags: (result, error, id) => [{ type: 'Role', id }],
    }),

    // Создать роль
    createRole: builder.mutation<Role, CreateRoleRequest>({
      query: (data) => ({
        url: '/roles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Role'],
    }),

    // Обновить роль
    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleRequest }>(
      {
        query: ({ id, data }) => ({
          url: `/roles/${id}`,
          method: 'PUT',
          body: data,
        }),
        invalidatesTags: (result, error, { id }) => [
          'Role',
          { type: 'Role', id },
          'User', // Инвалидируем User, так как изменение роли может повлиять на права пользователей
        ],
      }
    ),

    // Удалить роль (soft delete)
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        'Role',
        { type: 'Role', id },
        'User', // Инвалидируем User, так как удаление роли влияет на права пользователей
      ],
    }),

    // Получить права роли
    getRolePermissions: builder.query<RolePermissions, string>({
      query: (roleId) => `/roles/${roleId}/permissions`,
      providesTags: (result, error, roleId) => [
        { type: 'Role', id: roleId },
        'Permission',
      ],
    }),

    // Обновить права роли
    updateRolePermissions: builder.mutation<
      RolePermissions,
      { roleId: string; permissions: Permission[] }
    >({
      query: ({ roleId, permissions }) => ({
        url: `/roles/${roleId}/permissions`,
        method: 'PUT',
        body: { permissions },
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        'Permission',
        'User', // Инвалидируем User, так как изменение прав роли влияет на права пользователей
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useLazyGetRolesQuery,
  useGetRolesByCategoryQuery,
  useLazyGetRolesByCategoryQuery,
  useGetRoleQuery,
  useLazyGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetRolePermissionsQuery,
  useLazyGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
} = rolesApi;
