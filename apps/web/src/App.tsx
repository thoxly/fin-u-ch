import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from './store/slices/authSlice';
import { apiSlice } from './store/api/apiSlice';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { OperationsPage } from './pages/OperationsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { BudgetDetailsPage } from './pages/BudgetDetailsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ArticlesPage } from './pages/catalogs/ArticlesPage';
import { AccountsPage } from './pages/catalogs/AccountsPage';
import { DepartmentsPage } from './pages/catalogs/DepartmentsPage';
import { CounterpartiesPage } from './pages/catalogs/CounterpartiesPage';
import { DealsPage } from './pages/catalogs/DealsPage';
// Profile pages with new structure
import { ProfilePage } from './pages/profile/ProfilePage';
import { SecurityPage } from './pages/profile/SecurityPage';
import { SettingsPage as ProfileSettingsPage } from './pages/profile/SettingsPage';
// Company pages with new structure
import { CompanySettingsPage } from './pages/company/SettingsPage';
import { CurrencyPage } from './pages/company/CurrencyPage';
import { TariffPage } from './pages/company/TariffPage';
import { IntegrationsPage } from './pages/company/IntegrationsPage';
// Admin pages
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { CompanyPage } from './pages/CompanyPage';
import { AdminPage } from './pages/AdminPage';
import { PricingPage } from './pages/PricingPage';
import { PrivateRoute } from './components/PrivateRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RedirectToFirstAvailable } from './components/RedirectToFirstAvailable';
import { NotificationContainer } from './components/Notification';
import { ThemeProvider } from './components/ThemeProvider';
import { YandexMetrikaTracker } from './components/YandexMetrikaTracker';

function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'logout') {
        // Сбрасываем кэш RTK Query, чтобы не осталось данных демо-сессии
        dispatch(apiSlice.util.resetApiState());
        dispatch(logout());
        navigate('/login');
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [dispatch, navigate]);
  return (
    <>
      <ThemeProvider />
      <NotificationContainer />
      <YandexMetrikaTracker />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Redirect route - определяет первую доступную страницу после логина */}
        <Route
          path="/redirect"
          element={
            <PrivateRoute>
              <RedirectToFirstAvailable />
            </PrivateRoute>
          }
        />

        {/* Private routes with permission checks */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="dashboard" action="read">
                <DashboardPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/operations"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="operations" action="read">
                <OperationsPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="budgets" action="read">
                <BudgetsPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/budgets/:budgetId"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="budgets" action="read">
                <BudgetDetailsPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="reports" action="read">
                <ReportsPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/articles"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="articles" action="read">
                <ArticlesPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/accounts"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="accounts" action="read">
                <AccountsPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/departments"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="departments" action="read">
                <DepartmentsPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/counterparties"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="counterparties" action="read">
                <CounterpartiesPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/deals"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="deals" action="read">
                <DealsPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />

        {/* Profile routes with new structure */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/security"
          element={
            <PrivateRoute>
              <SecurityPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/settings"
          element={
            <PrivateRoute>
              <ProfileSettingsPage />
            </PrivateRoute>
          }
        />

        {/* Company routes with new structure */}
        <Route
          path="/company"
          element={
            <PrivateRoute>
              <CompanySettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/company/tariff"
          element={
            <PrivateRoute>
              <TariffPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/company/currency"
          element={
            <PrivateRoute>
              <CurrencyPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/company/settings"
          element={
            <PrivateRoute>
              <CompanySettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/company/integrations"
          element={
            <PrivateRoute>
              <IntegrationsPage />
            </PrivateRoute>
          }
        />

        {/* Pricing page */}
        <Route
          path="/pricing"
          element={
            <PrivateRoute>
              <PricingPage />
            </PrivateRoute>
          }
        />

        {/* Admin route - single page with tabs */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminPage />
            </PrivateRoute>
          }
        />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
