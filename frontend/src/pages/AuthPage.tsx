import { useState, FC } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { SignupForm } from '../components/auth/SignupForm'
import '../components/auth/auth.css'

export type AuthTab = 'login' | 'signup'

export interface AuthPageProps {
  initialTab?: AuthTab
}

export const AuthPage: FC<AuthPageProps> = ({ initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab)

  return (
    <div style={{ width: '100%', maxWidth: '460px', margin: '0 auto' }}>
      <div className="auth-tabs" role="tablist" aria-label="Authentication Options">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'login'}
          className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'signup'}
          className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
          onClick={() => setActiveTab('signup')}
        >
          Create Account
        </button>
      </div>

      {activeTab === 'login' ? (
        <LoginForm onSwitchToSignup={() => setActiveTab('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setActiveTab('login')} />
      )}
    </div>
  )
}
