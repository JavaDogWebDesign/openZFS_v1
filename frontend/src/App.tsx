import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PoolsPage from './pages/PoolsPage';
import PoolDetailPage from './pages/PoolDetailPage';
import DatasetsPage from './pages/DatasetsPage';
import UsersPage from './pages/UsersPage';
import SharesPage from './pages/SharesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pools" element={<PoolsPage />} />
              <Route path="/pools/:name" element={<PoolDetailPage />} />
              <Route path="/datasets" element={<DatasetsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/shares" element={<SharesPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
