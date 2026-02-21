import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PoolsPage = lazy(() => import('./pages/PoolsPage'));
const PoolDetailPage = lazy(() => import('./pages/PoolDetailPage'));
const DatasetsPage = lazy(() => import('./pages/DatasetsPage'));
const DrivesPage = lazy(() => import('./pages/DrivesPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const SharesPage = lazy(() => import('./pages/SharesPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
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
                  <Route path="/drives" element={<DrivesPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/shares" element={<SharesPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
