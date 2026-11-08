import { FC } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import './layout.css'

export const Navbar: FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initial = user?.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user?.email.charAt(0).toUpperCase() || 'U'

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        <Link to="/dashboard" className="navbar-brand">
          <span className="navbar-brand-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" />
              <path d="M8 21H3v-5" />
              <path d="M21 3l-7.5 7.5" />
              <path d="M3 21l7.5-7.5" />
            </svg>
          </span>
          <span className="navbar-logo">ReQuote</span>
        </Link>

        <nav className="navbar-nav" aria-label="Main Navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/quotations"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Quotations
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Settings
          </NavLink>
        </nav>
      </div>

      <div className="navbar-user-section">
        <Link to="/quotations/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="sm">
            + New Quote
          </Button>
        </Link>

        {user && (
          <div className="user-badge" title={`Signed in as ${user.email}`}>
            <span className="user-avatar-sm" aria-hidden="true">
              {initial}
            </span>
            <span className="user-name-sm">{user.full_name || user.email}</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </header>
  )
}
