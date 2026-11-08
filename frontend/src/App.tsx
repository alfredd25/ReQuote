import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/routes/ProtectedRoute'
import { PublicRoute } from './components/routes/PublicRoute'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { QuotationListPage } from './pages/QuotationListPage'
import { CreateQuotationPage } from './pages/CreateQuotationPage'
import { QuotationDetailPage } from './pages/QuotationDetailPage'
import { EditQuotationPage } from './pages/EditQuotationPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import './App.css'

export function AppRoutes() {
  return (
    <Routes>
      {/* Homepage */}
      <Route path="/" element={<HomePage />} />

      {/* Public routes (authenticated users redirected to dashboard) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Protected routes (unauthenticated users redirected to /login) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/quotations" element={<QuotationListPage />} />
          <Route path="/quotations/new" element={<CreateQuotationPage />} />
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
          <Route path="/quotations/:id/edit" element={<EditQuotationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
