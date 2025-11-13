import { apiSlice } from './apiSlice';

export interface DemoRequest {
  name: string;
  phone?: string;
  email?: string;
  telegram?: string;
  consentMarketing: boolean;
}

export interface DemoRequestResponse {
  message: string;
}

export const demoApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    requestDemo: builder.mutation<DemoRequestResponse, DemoRequest>({
      query: (data) => ({
        url: '/demo/request',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { useRequestDemoMutation } = demoApi;
