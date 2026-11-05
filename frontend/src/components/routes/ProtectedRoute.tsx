import { FC, ReactNode } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export interface ProtectedRouteProps {
  children?: ReactNode
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          color: 'var(--text-secondary)',
        }}
        role="status"
        aria-live="polite"
      >
        <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }} />
        <p>Restoring session…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Preserve intended destination so user is redirected back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

