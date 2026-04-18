import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Sidebar } from './components/Sidebar'
import { LoginPage } from './pages/LoginPage'
import { TicketsPage } from './pages/TicketsPage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { SettingsPage } from './pages/SettingsPage'

function ProtectedLayout() {
  const auth = useAuth()
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={auth.user}
        onLogout={() => auth.logout().then(() => { window.location.href = '/login' })}
      />
      <main className="flex-1 flex flex-col min-h-screen bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}

function Router() {
  const auth = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={auth.isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/tickets" replace />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AuthProvider>
  )
}
