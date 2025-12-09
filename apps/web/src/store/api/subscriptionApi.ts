import { apiSlice } from './apiSlice';

export interface SubscriptionLimits {
  maxUsers: number;
  features: string[];
}

export interface UserLimitInfo {
  current: number;
  max: number | null;
  remaining: number | null;
  isUnlimited: boolean;
}

export interface CurrentSubscriptionResponse {
  plan: 'START' | 'TEAM' | 'BUSINESS';
  status: string;
  startDate: string;
  endDate: string | null;
  trialEndsAt: string | null;
  promoCode: string | null;
  limits: SubscriptionLimits;
  userLimit: UserLimitInfo;
}

export const subscriptionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSubscription: builder.query<CurrentSubscriptionResponse, void>({
      query: () => ({ url: '/subscription/current' }),
      providesTags: ['AuditLog'],
    }),

    activatePromo: builder.mutation<
      CurrentSubscriptionResponse,
      { promoCode: string }
    >({
      query: ({ promoCode }) => ({
        url: '/subscription/activate-promo',
        method: 'POST',
        body: { promoCode },
      }),
      invalidatesTags: ['AuditLog'],
    }),
  }),
});

export const { useGetSubscriptionQuery, useActivatePromoMutation } =
  subscriptionApi;

export default subscriptionApi;
