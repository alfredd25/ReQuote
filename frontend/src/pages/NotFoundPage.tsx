import { FC } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import '../App.css'

export const NotFoundPage: FC = () => {
  return (
    <div className="app">
      <header className="hero">
        <div className="hero-badge">404 · Not Found</div>
        <h1 className="hero-title">
          Page Not <span className="accent">Found</span>
        </h1>
        <p className="hero-subtitle">
          The requested page does not exist or has moved.
        </p>
      </header>
      <main style={{ textAlign: 'center' }}>
        <Link to="/dashboard">
          <Button variant="primary" size="md">
            Return to Dashboard
          </Button>
        </Link>
      </main>
    </div>
  )
}

