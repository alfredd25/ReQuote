import { FC } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import './auth.css'

export const UserProfileCard: FC = () => {
  const { user, logout } = useAuth()

  if (!user) return null

  const initial = user.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase()

  const formattedDate = new Date(user.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Card className="profile-card" elevated>
      <div className="profile-header">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">
            {initial}
          </div>
          <div>
            <h3 className="profile-name">{user.full_name || 'Business User'}</h3>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          Sign Out
        </Button>
      </div>

      <div className="profile-grid">
        <div className="profile-item">
          <div className="profile-label">Status</div>
          <div className="profile-value">
            <span className="badge-active">Active Account</span>
          </div>
        </div>

        <div className="profile-item">
          <div className="profile-label">Member Since</div>
          <div className="profile-value">{formattedDate}</div>
        </div>

        <div className="profile-item" style={{ gridColumn: '1 / -1' }}>
          <div className="profile-label">User ID (Owner Scope)</div>
          <div className="profile-value" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
            {user.id}
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        You are authenticated. Quotations created in subsequent phases will automatically link to your account.
      </p>
    </Card>
  )
}
