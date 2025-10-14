import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { OperationsPage } from './pages/OperationsPage';
import { PlansPage } from './pages/PlansPage';
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
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
        path="/plans"
        element={
          <PrivateRoute>
            <PlansPage />
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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
