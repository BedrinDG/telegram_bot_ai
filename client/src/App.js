import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ManagerPage from './pages/ManagerPage';
import ManagerEmployeesPage from './pages/ManagerEmployeesPage';
import ManagerReportsPage from './pages/ManagerReportsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminTemplatePage from './pages/AdminTemplatePage';
import AdminLogsPage from './pages/AdminLogsPage';
import EmployeePage from './pages/EmployeePage';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager') return <Navigate to="/manager" replace />;
  return <Navigate to="/employee" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />

          {/* Manager routes */}
          <Route path="/manager" element={
            <ProtectedRoute roles={['manager', 'admin']}>
              <ManagerPage />
            </ProtectedRoute>
          } />
          <Route path="/manager/employees" element={
            <ProtectedRoute roles={['manager', 'admin']}>
              <ManagerEmployeesPage />
            </ProtectedRoute>
          } />
          <Route path="/manager/reports" element={
            <ProtectedRoute roles={['manager', 'admin']}>
              <ManagerReportsPage />
            </ProtectedRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsersPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/template" element={
            <ProtectedRoute roles={['admin']}>
              <AdminTemplatePage />
            </ProtectedRoute>
          } />
          <Route path="/admin/logs" element={
            <ProtectedRoute roles={['admin']}>
              <AdminLogsPage />
            </ProtectedRoute>
          } />

          {/* Employee route */}
          <Route path="/employee" element={
            <ProtectedRoute roles={['employee', 'manager', 'admin']}>
              <EmployeePage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
