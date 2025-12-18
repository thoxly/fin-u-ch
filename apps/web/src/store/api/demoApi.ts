import { apiSlice } from './apiSlice';

export interface DemoUserCredentials {
  email: string;
  password: string;
  companyName: string;
}

export interface DemoStartSessionResponse {
  user: {
    id: string;
    email: string;
    companyId: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RequestDemoInput {
  name: string;
  phone?: string;
  email?: string;
  telegram?: string;
  consentMarketing: boolean;
}

export const demoApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Получить учетные данные статического демо-пользователя
    getDemoCredentials: builder.query<DemoUserCredentials, void>({
      query: () => '/demo/credentials',
      transformResponse: (response: { data: DemoUserCredentials }) =>
        response.data,
    }),

    // Создать динамическую демо-сессию (возвращает токены)
    startDemoSession: builder.mutation<DemoStartSessionResponse, void>({
      query: () => ({
        url: '/demo/start-session',
        method: 'POST',
      }),
      transformResponse: (response: { data: DemoStartSessionResponse }) =>
        response.data,
    }),

    // Отправить заявку на демонстрацию (для связи с менеджером)
    requestDemo: builder.mutation<void, RequestDemoInput>({
      query: (data) => ({
        url: '/demo/request',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetDemoCredentialsQuery,
  useStartDemoSessionMutation,
  useRequestDemoMutation,
} = demoApi;
