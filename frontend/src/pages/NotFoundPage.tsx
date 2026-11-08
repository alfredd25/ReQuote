import { FC } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import '../App.css'

export const NotFoundPage: FC = () => {
  return (
    <div className="app auth-page-container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <header className="auth-page-header">
        <Link to="/" className="auth-brand-link">
          <span className="auth-brand-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" />
              <path d="M8 21H3v-5" />
              <path d="M21 3l-7.5 7.5" />
              <path d="M3 21l7.5-7.5" />
            </svg>
          </span>
          <span className="auth-brand-name">ReQuote</span>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontSize: '0.85rem', fontWeight: 600 }}>
          404 · ERROR
        </span>
        <h1 className="auth-hero-title">Page not found</h1>
        <p className="auth-hero-subtitle">
          The requested route does not exist or has been moved.
        </p>
      </header>

      <main style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="md">
            Go to Homepage
          </Button>
        </Link>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="md">
            Go to Dashboard
          </Button>
        </Link>
      </main>
    </div>
  )
}
