import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NetworkMapPage from './pages/NetworkMapPage';
import HostsPage from './pages/HostsPage';
import AlertsPage from './pages/AlertsPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

function ProtectedLayout() {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/hosts" replace />} />
        <Route path="/dashboard/:id" element={<DashboardPage />} />
        <Route path="/network-map/:id" element={<NetworkMapPage />} />
        <Route path="/hosts" element={<HostsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
