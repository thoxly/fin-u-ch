import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchSubscription } from '../store/slices/subscriptionSlice';

interface PrivateRouteProps {
  children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const subscriptionData = useSelector(
    (state: RootState) => state.subscription.data
  );

  /**
   * Загружаем подписку при первой аутентификации (если еще не загружена)
   */
  useEffect(() => {
    if (isAuthenticated && !subscriptionData) {
      dispatch(fetchSubscription());
    }
  }, [isAuthenticated, subscriptionData, dispatch]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
