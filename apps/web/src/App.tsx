import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { EnvProvider } from './context/EnvContext'
import { Shell } from './components/layout/Shell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { FlagDetailPage } from './pages/FlagDetailPage'
import { SegmentsPage } from './pages/SegmentsPage'
import { EnvironmentsPage } from './pages/EnvironmentsPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <EnvProvider>
                    <Shell>
                      <Routes>
                        <Route path="/" element={<Navigate to="/flags" replace />} />
                        <Route path="/flags" element={<DashboardPage />} />
                        <Route path="/flags/:id" element={<FlagDetailPage />} />
                        <Route path="/segments" element={<SegmentsPage />} />
                        <Route path="/environments" element={<EnvironmentsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                      </Routes>
                    </Shell>
                  </EnvProvider>
                </AuthGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
