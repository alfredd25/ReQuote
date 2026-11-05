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
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/dashboard" className="navbar-brand">
          <span className="navbar-logo">
            Re<span className="accent">Quote</span>
          </span>
          <span className="navbar-badge">Phase 5</span>
        </Link>

        <nav className="navbar-nav" aria-label="Main Navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Dashboard
          </NavLink>
        </nav>
      </div>

      <div className="navbar-user-section">
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

