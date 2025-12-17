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
  }),
});

export const { useGetDemoCredentialsQuery, useStartDemoSessionMutation } =
  demoApi;
