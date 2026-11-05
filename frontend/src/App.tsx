import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { UserProfileCard } from './components/auth/UserProfileCard'
import { apiClient } from './api/client'
import './App.css'

interface HealthStatus {
  status: string
  service: string
  version: string
}

function MainContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)

  useEffect(() => {
    // Ping backend health endpoint
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

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-badge">Phase 5 · Authentication &amp; User Access</div>
        <h1 className="hero-title">
          Re<span className="accent">Quote</span>
        </h1>
        <p className="hero-subtitle">
          Professional Quote Estimation &amp; Management Platform
        </p>
      </header>

      <main className="main-content-flow">
        {authLoading ? (
          <div className="card" style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
            <p className="status-text loading">Checking authentication session…</p>
          </div>
        ) : isAuthenticated ? (
          <UserProfileCard />
        ) : (
          <AuthPage />
        )}

        {/* Backend & Environment Health Verification */}
        <section className="status-container">
          <div className="card status-card">
            <div className="card-header">
              <div className="status-icon">
                {loadingHealth ? '⏳' : healthError ? '❌' : '✅'}
              </div>
              <h2>Backend Health</h2>
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
          </div>

          <div className="card info-card">
            <h2>Stack &amp; Security</h2>
            <ul className="stack-list">
              <li><span className="pill frontend">Frontend</span> React 18 · TypeScript · Vite · Axios</li>
              <li><span className="pill backend">Backend</span> FastAPI · PyJWT · Passlib / Bcrypt</li>
              <li><span className="pill db">Database</span> PostgreSQL 16 · SQLAlchemy 2.0 (async)</li>
              <li><span className="pill infra">Security</span> Scoped User Ownership &amp; Protected APIs</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}

export default App
