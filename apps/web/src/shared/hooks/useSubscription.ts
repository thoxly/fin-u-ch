import { useAppDispatch, useAppSelector } from './useRedux';
import {
  fetchSubscription,
  activatePromoThunk,
  clearSubscriptionError,
  resetSubscription,
} from '../../store/slices/subscriptionSlice';

/**
 * Custom hook для работы с подпиской
 * Предоставляет доступ к subscription state и actions
 */
export const useSubscription = () => {
  const dispatch = useAppDispatch();
  const subscription = useAppSelector((state) => state.subscription);

  const loadSubscription = async () => {
    return dispatch(fetchSubscription());
  };

  const activatePromo = async (promoCode: string) => {
    return dispatch(activatePromoThunk(promoCode));
  };

  const clearError = () => {
    dispatch(clearSubscriptionError());
  };

  const reset = () => {
    dispatch(resetSubscription());
  };

  return {
    ...subscription,
    loadSubscription,
    activatePromo,
    clearError,
    reset,
    // Для удобства — прямой доступ к данным подписки
    plan: subscription.data?.plan || null,
    status: subscription.data?.status || null,
    limits: subscription.data?.limits || null,
    userLimit: subscription.data?.userLimit || null,
    features: subscription.data?.limits.features || [],
  };
};
