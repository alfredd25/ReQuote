import { useState, FC, FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import './auth.css'

export interface LoginFormProps {
  onSwitchToSignup?: () => void
  onSuccess?: () => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const LoginForm: FC<LoginFormProps> = ({
  onSwitchToSignup,
  onSuccess,
}) => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      errors.email = 'Email is required'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      })
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid credentials'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your ReQuote account</p>
      </div>

      {formError && (
        <Alert
          variant="error"
          title="Sign in failed"
          onClose={() => setFormError(null)}
        >
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <Input
          label="Email address"
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="name@business.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
          }}
          error={fieldErrors.email}
          disabled={isSubmitting}
          required
        />

        <Input
          label="Password"
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
          }}
          error={fieldErrors.password}
          disabled={isSubmitting}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
        >
          Sign In
        </Button>
      </form>

      {onSwitchToSignup && (
        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={onSwitchToSignup}
          >
            Create account
          </button>
        </div>
      )}
    </div>
  )
}
