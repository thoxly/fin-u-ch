import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { config } from '../../shared/config/env';
import type { RootState } from '../store';

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

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
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

