import { FC, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../api/client'
import { Card } from '../components/ui/Card'
import '../components/auth/auth.css'
import '../App.css'

interface HealthStatus {
  status: string
  service: string
  version: string
}

export const DashboardPage: FC = () => {
  const { user } = useAuth()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .get<HealthStatus>('/health')
      .then((res) => {
        setHealth(res.data)
        setLoadingHealth(false)
      })
      .catch((err: Error) => {
        setHealthError(err.message)
        setLoadingHealth(false)
      })
  }, [])

  if (!user) return null

  const formattedDate = new Date(user.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <>
      <div className="dashboard-hero">
        <div>
          <h1 className="dashboard-heading">
            Welcome, {user.full_name || user.email.split('@')[0]}
          </h1>
          <p className="dashboard-subheading">
            Manage your account session and quotation workspace.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Account Details Card */}
        <Card elevated>
          <div className="card-header">
            <div className="status-icon">👤</div>
            <h2>Account Profile</h2>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Email</span>
              <span className="value">{user.email}</span>
            </div>
            <div className="status-item">
              <span className="label">Full Name</span>
              <span className="value">{user.full_name || 'Not provided'}</span>
            </div>
            <div className="status-item">
              <span className="label">Status</span>
              <span className="value healthy">
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Member Since</span>
              <span className="value">{formattedDate}</span>
            </div>
            <div className="status-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
              <span className="label">Owner UUID</span>
              <code style={{ fontSize: '0.78rem', color: 'var(--accent-light)', wordBreak: 'break-all' }}>
                {user.id}
              </code>
            </div>
          </div>
        </Card>

        {/* Backend & Database Health Check */}
        <Card>
          <div className="card-header">
            <div className="status-icon">
              {loadingHealth ? '⏳' : healthError ? '❌' : '✅'}
            </div>
            <h2>Backend &amp; Database Health</h2>
          </div>

          {loadingHealth && <p className="status-text loading">Pinging backend…</p>}

          {healthError && (
            <div className="status-error">
              <p className="status-text">Could not reach backend</p>
              <code>{healthError}</code>
            </div>
          )}

          {health && (
            <div className="status-grid">
              <div className="status-item">
                <span className="label">Status</span>
                <span className="value healthy">{health.status}</span>
              </div>
              <div className="status-item">
                <span className="label">Service</span>
                <span className="value">{health.service}</span>
              </div>
              <div className="status-item">
                <span className="label">Version</span>
                <span className="value">{health.version}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Quotations Placeholder Card */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="status-icon">📄</div>
            <h2>Quotations Workspace</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Your quotation endpoints are protected by user ownership on the backend.
            Full quotation management UI (creation, line-item calculations, PDF generation, status lifecycle transitions)
            will be integrated in the upcoming development phases.
          </p>
        </Card>
      </div>
    </>
  )
}

