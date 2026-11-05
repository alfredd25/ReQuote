import { FC } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import '../App.css'

export const LoginPage: FC = () => {
  return (
    <div className="app">
      <header className="hero">
        <div className="hero-badge">Phase 5 · Authentication &amp; Sessions</div>
        <h1 className="hero-title">
          Re<span className="accent">Quote</span>
        </h1>
        <p className="hero-subtitle">
          Professional Quote Estimation &amp; Management Platform
        </p>
      </header>

      <main style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <LoginForm />
      </main>
    </div>
  )
}

