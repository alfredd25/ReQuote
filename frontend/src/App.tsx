import { useEffect, useState } from 'react'
import './App.css'

interface HealthStatus {
  status: string
  service: string
  version: string
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<HealthStatus>
      })
      .then((data) => {
        setHealth(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-badge">Phase 1 · Foundation</div>
        <h1 className="hero-title">
          Re<span className="accent">Quote</span>
        </h1>
        <p className="hero-subtitle">
          Professional Quote Estimation &amp; Management Platform
        </p>
      </header>

      <main className="main">
        <section className="card status-card">
          <div className="card-header">
            <div className="status-icon">
              {loading ? '⏳' : error ? '❌' : '✅'}
            </div>
            <h2>Backend Health</h2>
          </div>

          {loading && <p className="status-text loading">Pinging backend…</p>}

          {error && (
            <div className="status-error">
              <p className="status-text">Could not reach backend</p>
              <code>{error}</code>
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
        </section>

        <section className="card info-card">
          <h2>Stack</h2>
          <ul className="stack-list">
            <li><span className="pill frontend">Frontend</span> React 18 + Vite + TypeScript</li>
            <li><span className="pill backend">Backend</span> Python 3.12 + FastAPI</li>
            <li><span className="pill db">Database</span> PostgreSQL 16</li>
            <li><span className="pill infra">Infra</span> Docker + Docker Compose</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default App
