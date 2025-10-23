import { apiSlice } from './apiSlice';
import type { PlanItem } from '@shared/types/operations';

interface GetPlansParams {
  budgetId?: string;
}

export const plansApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query<PlanItem[], GetPlansParams | void>({
      query: (params) => ({
        url: '/plans',
        params: params || {},
      }),
      providesTags: ['Plan'],
    }),
    getPlan: builder.query<PlanItem, string>({
      query: (id) => `/plans/${id}`,
      providesTags: ['Plan'],
    }),
    createPlan: builder.mutation<PlanItem, Partial<PlanItem>>({
      query: (data) => ({
        url: '/plans',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Plan', 'Budget', 'Dashboard', 'Report'],
    }),
    updatePlan: builder.mutation<
      PlanItem,
      { id: string; data: Partial<PlanItem> }
    >({
      query: ({ id, data }) => ({
        url: `/plans/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Plan', 'Budget', 'Dashboard', 'Report'],
    }),
    deletePlan: builder.mutation<void, string>({
      query: (id) => ({
        url: `/plans/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Plan', 'Budget', 'Dashboard', 'Report'],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useGetPlanQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation,
} = plansApi;
