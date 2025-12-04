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
    company?: {
      id: string;
      name: string;
      currencyBase: string;
      inn?: string | null;
    };
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

interface VerifyEmailRequest {
  token: string;
}

interface ResendVerificationRequest {
  email: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface RequestEmailChangeRequest {
  newEmail: string;
}

interface ConfirmOldEmailForChangeRequest {
  token: string;
}

interface ConfirmEmailChangeRequest {
  token: string;
}

interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  navigationIcons?: Record<string, string>;
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
    verifyEmail: builder.mutation<{ message: string }, VerifyEmailRequest>({
      query: (data) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body: data,
      }),
    }),
    resendVerification: builder.mutation<
      { message: string },
      ResendVerificationRequest
    >({
      query: (data) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body: data,
      }),
    }),
    forgotPassword: builder.mutation<
      { message: string },
      ForgotPasswordRequest
    >({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, ResetPasswordRequest>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    changePassword: builder.mutation<
      { message: string },
      ChangePasswordRequest
    >({
      query: (data) => ({
        url: '/users/me/change-password',
        method: 'POST',
        body: data,
      }),
    }),
    requestEmailChange: builder.mutation<
      { message: string },
      RequestEmailChangeRequest
    >({
      query: (data) => ({
        url: '/users/me/request-email-change',
        method: 'POST',
        body: data,
      }),
    }),
    confirmOldEmailForChange: builder.mutation<
      { message: string },
      ConfirmOldEmailForChangeRequest
    >({
      query: (data) => ({
        url: '/auth/confirm-email-change-old',
        method: 'POST',
        body: data,
      }),
    }),
    confirmEmailChange: builder.mutation<
      { message: string },
      ConfirmEmailChangeRequest
    >({
      query: (data) => ({
        url: '/auth/confirm-email-change',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    acceptInvitation: builder.mutation<AuthResponse, AcceptInvitationRequest>({
      query: (data) => ({
        url: '/auth/accept-invitation',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    getPreferences: builder.query<UserPreferences, void>({
      query: () => '/users/me/preferences',
      providesTags: ['User'],
    }),
    updatePreferences: builder.mutation<UserPreferences, UserPreferences>({
      query: (preferences) => ({
        url: '/users/me/preferences',
        method: 'PUT',
        body: preferences,
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
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useRequestEmailChangeMutation,
  useConfirmOldEmailForChangeMutation,
  useConfirmEmailChangeMutation,
  useAcceptInvitationMutation,
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} = authApi;
