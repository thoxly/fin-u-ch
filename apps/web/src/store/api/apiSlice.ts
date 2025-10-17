import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { config } from '../../shared/config/env';
import type { RootState } from '../store';
import { setCredentials, logout } from '../slices/authSlice';

const baseQueryWithoutReauth = fetchBaseQuery({
  baseUrl: config.apiUrl,
  prepareHeaders: (headers, { getState }) => {
    const token =
      (getState() as RootState).auth.accessToken ||
      localStorage.getItem('accessToken');
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

  // Если получили 401, пытаемся рефрешить токен
  if (result.error && result.error.status === 401) {
    // Безопасное получение refreshToken с проверкой на SSR
    const refreshToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;

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
        // Используем более безопасный способ редиректа
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } else {
      // Нет refresh токена - разлогиниваем
      api.dispatch(logout());
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
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
    'Dashboard',
    'Report',
  ],
  endpoints: () => ({}),
});
