import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { config } from '../../shared/config/env';
import type { RootState, AppDispatch } from '../store';
import { setCredentials, logout } from '../slices/authSlice';
import { showNotification } from '../slices/notificationSlice';

const baseQueryWithoutReauth = fetchBaseQuery({
  baseUrl: config.apiUrl,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQueryWithoutReauth(args, api, extraOptions);

  // Обработка ошибки 403 (Доступ запрещён)
  if (result.error && result.error.status === 403) {
    const dispatch = api.dispatch as AppDispatch;
    const errorMessage =
      (result.error.data as { message?: string })?.message ||
      'У вас нет прав для выполнения этого действия';

    dispatch(
      showNotification({
        type: 'error',
        title: 'Доступ запрещён',
        message: errorMessage,
        duration: 5000,
      })
    );
  }

  // Если получили 401, пытаемся рефрешить токен
  if (result.error && result.error.status === 401) {
    // Получаем refreshToken из Redux store
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (refreshToken) {
      // Используем baseQueryWithoutReauth для рефреша (избегаем рекурсии)
      const refreshResult = await baseQueryWithoutReauth(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const refreshData = refreshResult.data as {
          user: { id: string; email: string; companyId: string };
          accessToken: string;
          refreshToken: string;
        };

        // Обновляем токены в store и localStorage
        api.dispatch(
          setCredentials({
            user: refreshData.user,
            accessToken: refreshData.accessToken,
            refreshToken: refreshData.refreshToken,
          })
        );

        // Повторяем оригинальный запрос с новым токеном
        result = await baseQueryWithoutReauth(args, api, extraOptions);
      } else {
        // Рефреш не удался - разлогиниваем
        api.dispatch(logout());
        // Безопасный редирект только в браузере
        if (
          typeof window !== 'undefined' &&
          typeof window.location !== 'undefined'
        ) {
          window.location.assign('/login');
        }
      }
    } else {
      // Нет refresh токена - разлогиниваем
      api.dispatch(logout());
      // Безопасный редирект только в браузере
      if (
        typeof window !== 'undefined' &&
        typeof window.location !== 'undefined'
      ) {
        window.location.assign('/login');
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Article',
    'Account',
    'Department',
    'Counterparty',
    'Deal',
    'Salary',
    'Operation',
    'Plan',
    'Budget',
    'Dashboard',
    'Report',
    'Role',
    'Permission',
    'AuditLog',
    'Import',
    'MappingRule',
    'Integration',
  ],
  endpoints: () => ({}),
});
