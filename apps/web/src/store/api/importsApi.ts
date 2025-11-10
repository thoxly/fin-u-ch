import { apiSlice } from './apiSlice';
import type {
  ImportSession,
  ImportedOperation,
  MappingRule,
  ImportedOperationsResponse,
  ImportSessionsResponse,
  ImportOperationsRequest,
} from '@shared/types/imports';

interface UploadStatementResponse {
  sessionId: string;
  importedCount: number;
  fileName: string;
}

interface BulkUpdateRequest {
  operationIds: string[];
  matchedArticleId?: string | null;
  matchedCounterpartyId?: string | null;
  matchedAccountId?: string | null;
  confirmed?: boolean;
}

interface ApplyRulesResponse {
  applied: number;
  updated: number;
}

interface ImportOperationsResponse {
  imported: number;
  created: number;
  errors: number;
  sessionId: string;
}

interface DeleteSessionResponse {
  deleted: number;
}

export const importsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    uploadStatement: builder.mutation<
      UploadStatementResponse,
      FormData
    >({
      query: (formData) => ({
        url: '/imports/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Import'],
    }),

    getImportedOperations: builder.query<
      ImportedOperationsResponse,
      {
        sessionId: string;
        confirmed?: boolean;
        matched?: boolean;
        limit?: number;
        offset?: number;
      }
    >({
      query: ({ sessionId, ...params }) => ({
        url: `/imports/sessions/${sessionId}/operations`,
        params,
      }),
      providesTags: ['Import'],
    }),

    updateImportedOperation: builder.mutation<
      ImportedOperation,
      {
        id: string;
        data: {
          matchedArticleId?: string | null;
          matchedCounterpartyId?: string | null;
          matchedAccountId?: string | null;
          matchedDealId?: string | null;
          matchedDepartmentId?: string | null;
          currency?: string;
          repeat?: string;
          confirmed?: boolean;
          direction?: 'income' | 'expense' | 'transfer';
        };
      }
    >({
      query: ({ id, data }) => ({
        url: `/imports/operations/${id}`,
        method: 'PATCH',
        body: data,
      }),
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled, getState }) {
        // Optimistic update - обновляем кеш локально без перезапроса
        // Находим все активные запросы getImportedOperations и обновляем их
        const state = getState() as any;
        const cache = importsApi.endpoints.getImportedOperations.select({} as any)(state);
        
        // Собираем все ключи кеша для getImportedOperations
        const cacheKeys: any[] = [];
        if (state.api?.queries) {
          Object.keys(state.api.queries).forEach((key) => {
            const query = state.api.queries[key];
            if (query?.endpointName === 'getImportedOperations' && query?.data) {
              cacheKeys.push(query.originalArgs || {});
            }
          });
        }

        // Обновляем каждый найденный запрос
        const patchResults: any[] = [];
        cacheKeys.forEach((args) => {
          const patchResult = dispatch(
            importsApi.util.updateQueryData('getImportedOperations', args, (draft) => {
              if (draft?.operations) {
                const operation = draft.operations.find((op) => op.id === id);
                if (operation) {
                  // Обновляем поля операции
                  if (data.matchedArticleId !== undefined) {
                    operation.matchedArticleId = data.matchedArticleId;
                  }
                  if (data.matchedCounterpartyId !== undefined) {
                    operation.matchedCounterpartyId = data.matchedCounterpartyId;
                  }
                  if (data.matchedAccountId !== undefined) {
                    operation.matchedAccountId = data.matchedAccountId;
                  }
                  if (data.matchedDealId !== undefined) {
                    operation.matchedDealId = data.matchedDealId;
                  }
                  if (data.matchedDepartmentId !== undefined) {
                    operation.matchedDepartmentId = data.matchedDepartmentId;
                  }
                  if (data.currency !== undefined) {
                    operation.currency = data.currency;
                  }
                  if (data.repeat !== undefined) {
                    operation.repeat = data.repeat;
                  }
                  if (data.confirmed !== undefined) {
                    operation.confirmed = data.confirmed;
                  }
                  if (data.direction !== undefined) {
                    operation.direction = data.direction;
                  }
                  // matchedBy будет обновлен из ответа сервера после успешного запроса
                }
              }
            })
          );
          patchResults.push(patchResult);
        });

        try {
          const result = await queryFulfilled;
          // После успешного обновления обновляем связанные объекты из ответа
          cacheKeys.forEach((args) => {
            dispatch(
              importsApi.util.updateQueryData('getImportedOperations', args, (draft) => {
                if (draft?.operations) {
                  const operation = draft.operations.find((op) => op.id === id);
                  const updatedOperation = result.data;
                  if (operation && updatedOperation) {
                    // Обновляем все поля из ответа сервера
                    operation.matchedArticle = updatedOperation.matchedArticle;
                    operation.matchedCounterparty = updatedOperation.matchedCounterparty;
                    operation.matchedAccount = updatedOperation.matchedAccount;
                    operation.matchedDeal = updatedOperation.matchedDeal;
                    operation.matchedDepartment = updatedOperation.matchedDepartment;
                    // Обновляем все примитивные поля из ответа
                    if (updatedOperation.currency !== undefined) {
                      operation.currency = updatedOperation.currency;
                    }
                    if (updatedOperation.direction !== undefined) {
                      operation.direction = updatedOperation.direction;
                    }
                    // matchedBy устанавливается на сервере при полном сопоставлении
                    operation.matchedBy = updatedOperation.matchedBy ?? null;
                    operation.matchedRuleId = updatedOperation.matchedRuleId ?? null;
                  }
                }
              })
            );
          });
        } catch {
          // В случае ошибки откатываем изменения
          patchResults.forEach((patchResult) => patchResult.undo());
        }
      },
      // Не инвалидируем теги, чтобы не вызывать перезапрос всего списка
      // invalidatesTags: ['Import'],
    }),

    bulkUpdateImportedOperations: builder.mutation<
      { updated: number },
      {
        sessionId: string;
        data: BulkUpdateRequest;
      }
    >({
      query: ({ sessionId, data }) => ({
        url: `/imports/sessions/${sessionId}/operations/bulk`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Import'],
    }),

    applyRules: builder.mutation<
      ApplyRulesResponse,
      { sessionId: string }
    >({
      query: ({ sessionId }) => ({
        url: `/imports/sessions/${sessionId}/apply-rules`,
        method: 'POST',
      }),
      invalidatesTags: ['Import'],
    }),

    importOperations: builder.mutation<
      ImportOperationsResponse,
      {
        sessionId: string;
        data?: ImportOperationsRequest;
      }
    >({
      query: ({ sessionId, data }) => ({
        url: `/imports/sessions/${sessionId}/import`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Import', 'Operation', 'Dashboard', 'Report'],
    }),

    deleteSession: builder.mutation<
      DeleteSessionResponse,
      { sessionId: string }
    >({
      query: ({ sessionId }) => ({
        url: `/imports/sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Import'],
    }),

    getMappingRules: builder.query<
      MappingRule[],
      {
        targetType?: string;
        sourceField?: string;
      } | void
    >({
      query: (params) => ({
        url: '/imports/rules',
        params,
      }),
      providesTags: ['MappingRule'],
    }),

    createMappingRule: builder.mutation<
      MappingRule,
      {
        ruleType: 'contains' | 'equals' | 'regex' | 'alias';
        pattern: string;
        targetType: 'article' | 'counterparty' | 'account' | 'operationType';
        targetId?: string;
        targetName?: string;
        sourceField?: 'description' | 'receiver' | 'payer' | 'inn';
      }
    >({
      query: (data) => ({
        url: '/imports/rules',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['MappingRule'],
    }),

    updateMappingRule: builder.mutation<
      MappingRule,
      {
        id: string;
        data: Partial<MappingRule>;
      }
    >({
      query: ({ id, data }) => ({
        url: `/imports/rules/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['MappingRule'],
    }),

    deleteMappingRule: builder.mutation<
      void,
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/imports/rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MappingRule'],
    }),

    getImportSessions: builder.query<
      ImportSessionsResponse,
      {
        status?: string;
        limit?: number;
        offset?: number;
      } | void
    >({
      query: (params) => ({
        url: '/imports/sessions',
        params,
      }),
      providesTags: ['Import'],
    }),
  }),
});

export const {
  useUploadStatementMutation,
  useGetImportedOperationsQuery,
  useUpdateImportedOperationMutation,
  useBulkUpdateImportedOperationsMutation,
  useApplyRulesMutation,
  useImportOperationsMutation,
  useDeleteSessionMutation,
  useGetMappingRulesQuery,
  useCreateMappingRuleMutation,
  useUpdateMappingRuleMutation,
  useDeleteMappingRuleMutation,
  useGetImportSessionsQuery,
} = importsApi;

