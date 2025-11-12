import { apiSlice } from './apiSlice';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  companyName: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    companyId: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    isSuperAdmin?: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

interface RefreshRequest {
  refreshToken: string;
}

interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  currencyBase?: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    getMe: builder.query<AuthResponse['user'], void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),
    refresh: builder.mutation<AuthResponse, RefreshRequest>({
      query: (data) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: data,
      }),
    }),
    updateUser: builder.mutation<AuthResponse['user'], UpdateUserRequest>({
      query: (data) => ({
        url: '/users/me',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useRefreshMutation,
  useUpdateUserMutation,
} = authApi;
