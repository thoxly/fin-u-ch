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
  limit?: number;
  offset?: number;
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
      providesTags: (result, error, params) => {
        // Если есть параметры limit/offset, это пагинация - не инвалидируем автоматически
        if (
          params &&
          (params.limit !== undefined || params.offset !== undefined)
        ) {
          return [{ type: 'Operation', id: 'PAGINATED' }];
        }
        // Для обычных запросов используем стандартный тег
        return ['Operation'];
      },
    }),
    getOperation: builder.query<Operation, string>({
      query: (id) => `/operations/${id}`,
      providesTags: (result, error, id) => [{ type: 'Operation', id }],
    }),
    createOperation: builder.mutation<Operation, unknown>({
      query: (data) => ({
        url: '/operations',
        method: 'POST',
        body: data,
      }),
      // Инвалидируем только не-пагинированные запросы
      invalidatesTags: ['Operation', 'Dashboard', 'Report'],
      // Оптимистичное обновление не применяем для пагинированных запросов
    }),
    updateOperation: builder.mutation<Operation, { id: string; data: unknown }>(
      {
        query: ({ id, data }) => ({
          url: `/operations/${id}`,
          method: 'PATCH',
          body: data,
        }),
        invalidatesTags: (result, error, { id }) => [
          'Operation',
          { type: 'Operation', id },
          'Dashboard',
          'Report',
        ],
      }
    ),
    deleteOperation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/operations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        'Operation',
        { type: 'Operation', id },
        'Dashboard',
        'Report',
      ],
    }),
    confirmOperation: builder.mutation<Operation, string>({
      query: (id) => ({
        url: `/operations/${id}/confirm`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [
        'Operation',
        { type: 'Operation', id },
        'Dashboard',
        'Report',
      ],
    }),
    bulkDeleteOperations: builder.mutation<{ count: number }, string[]>({
      query: (ids) => ({
        url: '/operations/bulk-delete',
        method: 'POST',
        body: { ids },
      }),
      invalidatesTags: ['Operation', 'Dashboard', 'Report'],
    }),
  }),
});

export const {
  useGetOperationsQuery,
  useLazyGetOperationsQuery,
  useGetOperationQuery,
  useCreateOperationMutation,
  useUpdateOperationMutation,
  useDeleteOperationMutation,
  useConfirmOperationMutation,
  useBulkDeleteOperationsMutation,
} = operationsApi;
