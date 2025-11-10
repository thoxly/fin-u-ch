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
import { PrivateRoute } from './components/PrivateRoute';
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

        {/* Private routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/operations"
          element={
            <PrivateRoute>
              <OperationsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <PrivateRoute>
              <BudgetsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/budgets/:budgetId"
          element={
            <PrivateRoute>
              <BudgetDetailsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <ReportsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/articles"
          element={
            <PrivateRoute>
              <ArticlesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/accounts"
          element={
            <PrivateRoute>
              <AccountsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/departments"
          element={
            <PrivateRoute>
              <DepartmentsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/counterparties"
          element={
            <PrivateRoute>
              <CounterpartiesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/deals"
          element={
            <PrivateRoute>
              <DealsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/catalogs/salaries"
          element={
            <PrivateRoute>
              <SalariesPage />
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
