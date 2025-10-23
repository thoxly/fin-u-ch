import { apiSlice } from './apiSlice';
import type {
  Budget,
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from '@fin-u-ch/shared';

interface GetBudgetsParams {
  status?: 'active' | 'archived';
}

export const budgetsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBudgets: builder.query<Budget[], GetBudgetsParams | void>({
      query: (params) => ({
        url: '/budgets',
        params: params || {},
      }),
      providesTags: ['Budget'],
    }),
    getBudget: builder.query<Budget, string>({
      query: (id) => `/budgets/${id}`,
      providesTags: ['Budget'],
    }),
    createBudget: builder.mutation<Budget, CreateBudgetDTO>({
      query: (data) => ({
        url: '/budgets',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Budget'],
    }),
    updateBudget: builder.mutation<
      Budget,
      { id: string; data: UpdateBudgetDTO }
    >({
      query: ({ id, data }) => ({
        url: `/budgets/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Budget'],
    }),
    deleteBudget: builder.mutation<void, string>({
      query: (id) => ({
        url: `/budgets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Budget'],
    }),
  }),
});

export const {
  useGetBudgetsQuery,
  useGetBudgetQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetsApi;
