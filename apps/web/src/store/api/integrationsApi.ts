// store/api/integrationsApi.ts
import { apiSlice } from './apiSlice';

interface OzonIntegrationData {
  clientKey: string;
  apiKey: string;
  paymentSchedule: 'next_week' | 'week_after';
  articleId: string;
  accountId: string;
}

interface IntegrationResponse {
  success: boolean;
  data?: {
    id: string;
    type: string;
    connected: boolean;
    data: OzonIntegrationData;
  };
  error?: string;
}

export const integrationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    saveOzonIntegration: builder.mutation<
      IntegrationResponse,
      OzonIntegrationData
    >({
      query: (integrationData) => ({
        url: '/integrations/ozon',
        method: 'POST',
        body: integrationData,
      }),
      invalidatesTags: ['Integration'],
    }),
    getOzonIntegration: builder.query<IntegrationResponse, void>({
      query: () => '/integrations/ozon',
      providesTags: ['Integration'],
    }),
    disconnectOzonIntegration: builder.mutation<IntegrationResponse, void>({
      query: () => ({
        url: '/integrations/ozon',
        method: 'DELETE',
      }),
      invalidatesTags: ['Integration'],
    }),
  }),
});

export const {
  useSaveOzonIntegrationMutation,
  useGetOzonIntegrationQuery,
  useDisconnectOzonIntegrationMutation,
} = integrationsApi;
