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

const baseQuery = fetchBaseQuery({
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
  let result = await baseQuery(args, api, extraOptions);

  // Если получили 401, пытаемся рефрешить токен
  if (result.error && result.error.status === 401) {
    // Безопасное получение refreshToken с проверкой на SSR
    const refreshToken =
      typeof window !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;

    if (refreshToken) {
      try {
        // Делаем запрос на рефреш напрямую (минуя RTK Query, чтобы избежать рекурсии)
        const refreshResponse = await fetch(`${config.apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = (await refreshResponse.json()) as {
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
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Рефреш не удался - разлогиниваем
          console.warn(
            'Token refresh failed:',
            refreshResponse.status,
            refreshResponse.statusText
          );
          api.dispatch(logout());
          // Используем более безопасный способ редиректа
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch (error) {
        // Ошибка при рефреше - разлогиниваем
        console.error('Token refresh error:', error);
        api.dispatch(logout());
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
