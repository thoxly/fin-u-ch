import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { VerifyEmailChangeOldPage } from './pages/auth/VerifyEmailChangeOldPage';
import { VerifyEmailChangePage } from './pages/auth/VerifyEmailChangePage';
import { AcceptInvitationPage } from './pages/auth/AcceptInvitationPage';
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
import { ProfilePage as ProfilePageOld } from './pages/ProfilePage';
import { CompanyPage as CompanyPageOld } from './pages/CompanyPage';
import { PricingPage } from './pages/PricingPage';
import { AdminPage as AdminPageOld } from './pages/AdminPage';
// Profile pages
import { ProfilePage } from './pages/profile/ProfilePage';
import { SecurityPage } from './pages/profile/SecurityPage';
import { SettingsPage as ProfileSettingsPage } from './pages/profile/SettingsPage';
// Company pages
import { CompanySettingsPage } from './pages/company/SettingsPage';
import { CurrencyPage } from './pages/company/CurrencyPage';
import { TariffPage } from './pages/company/TariffPage';
import { IntegrationsPage } from './pages/company/IntegrationsPage';
// Admin pages
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { PrivateRoute } from './components/PrivateRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RedirectToFirstAvailable } from './components/RedirectToFirstAvailable';
import { NotificationContainer } from './components/Notification';
import { ThemeProvider } from './components/ThemeProvider';

function App() {
  return (
    <>
      <ThemeProvider />
      <NotificationContainer />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/verify-email-change-old"
          element={<VerifyEmailChangeOldPage />}
        />
        <Route
          path="/verify-email-change"
          element={<VerifyEmailChangePage />}
        />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
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

        {/* Profile routes - separate pages for profile sections */}
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

        {/* Company routes - separate pages for company sections */}
        <Route
          path="/company"
          element={
            <PrivateRoute>
              <CompanySettingsPage />
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
          path="/company/tarif"
          element={
            <PrivateRoute>
              <TariffPage />
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

        {/* Pricing page - for selecting and upgrading tariffs */}
        <Route
          path="/pricing"
          element={
            <PrivateRoute>
              <PricingPage />
            </PrivateRoute>
          }
        />

        {/* Admin route - single tabbed admin page (legacy) */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminPageOld />
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
