import { Routes, Route, Navigate } from 'react-router-dom';
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
import { SalariesPage } from './pages/catalogs/SalariesPage';
import { ProfilePage } from './pages/ProfilePage';
import { CompanyPage } from './pages/CompanyPage';
import { AdminPage } from './pages/AdminPage';
import { PrivateRoute } from './components/PrivateRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RedirectToFirstAvailable } from './components/RedirectToFirstAvailable';
import { useDarkMode } from './shared/hooks/useDarkMode';
import { NotificationContainer } from './components/Notification';

function App() {
  // Автоматическое определение системной темы
  useDarkMode();

  return (
    <>
      <NotificationContainer />
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
        <Route
          path="/catalogs/salaries"
          element={
            <PrivateRoute>
              <ProtectedRoute entity="salaries" action="read">
                <SalariesPage />
              </ProtectedRoute>
            </PrivateRoute>
          }
        />

        {/* Profile and Company routes - accessible to all authenticated users */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/company"
          element={
            <PrivateRoute>
              <CompanyPage />
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
