import { apiSlice } from './apiSlice';
import type { Operation } from '@shared/types/operations';

interface GetOperationsParams {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  articleId?: string;
  dealId?: string;
  departmentId?: string;
  counterpartyId?: string;
  isConfirmed?: boolean;
}

export const operationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOperations: builder.query<Operation[], GetOperationsParams | void>({
      query: (params) =>
        params
          ? {
              url: '/operations',
              params,
            }
          : '/operations',
      providesTags: ['Operation'],
    }),
    getOperation: builder.query<Operation, string>({
      query: (id) => `/operations/${id}`,
      providesTags: ['Operation'],
    }),
    createOperation: builder.mutation<Operation, Partial<Operation>>({
      query: (data) => ({
        url: '/operations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Operation', 'Dashboard', 'Report'],
    }),
    updateOperation: builder.mutation<
      Operation,
      { id: string; data: Partial<Operation> }
    >({
      query: ({ id, data }) => ({
        url: `/operations/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Operation', 'Dashboard', 'Report'],
    }),
    deleteOperation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/operations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Operation', 'Dashboard', 'Report'],
    }),
    confirmOperation: builder.mutation<Operation, string>({
      query: (id) => ({
        url: `/operations/${id}/confirm`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Operation', 'Dashboard', 'Report'],
    }),
  }),
});

export const {
  useGetOperationsQuery,
  useGetOperationQuery,
  useCreateOperationMutation,
  useUpdateOperationMutation,
  useDeleteOperationMutation,
  useConfirmOperationMutation,
} = operationsApi;
