import { FC } from 'react'
import { Link } from 'react-router-dom'
import { SignupForm } from '../components/auth/SignupForm'
import '../App.css'

export const SignupPage: FC = () => {
  return (
    <div className="app auth-page-container">
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
        <h1 className="auth-hero-title">Create your account</h1>
        <p className="auth-hero-subtitle">
          Start generating professional, decimal-exact quotations in seconds
        </p>
      </header>

      <main style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <SignupForm />
      </main>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link to="/" className="back-home-link">
          ← Back to Homepage
        </Link>
      </div>
    </div>
  )
}


