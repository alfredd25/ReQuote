import { FC, ReactNode } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export interface PublicRouteProps {
  children?: ReactNode
}

interface LocationState {
  from?: {
    pathname: string
  }
}

export const PublicRoute: FC<PublicRouteProps> = ({ children }) => {
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
        <p>Loading…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    // If the user arrived with an intended destination, redirect there; otherwise dashboard
    const state = location.state as LocationState | null
    const destination = state?.from?.pathname || '/dashboard'
    return <Navigate to={destination} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

