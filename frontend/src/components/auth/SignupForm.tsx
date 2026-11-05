import { useState, FC, FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import './auth.css'

export interface SignupFormProps {
  onSwitchToLogin?: () => void
  onSuccess?: () => void
}

interface LocationState {
  from?: {
    pathname: string
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const SignupForm: FC<SignupFormProps> = ({
  onSwitchToLogin,
  onSuccess,
}) => {
  const { signup, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (): boolean => {
    const errors: {
      fullName?: string
      email?: string
      password?: string
      confirmPassword?: string
    } = {}

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      errors.email = 'Email is required'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
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
    const cleanEmail = email.trim().toLowerCase()
    const cleanFullName = fullName.trim() || undefined

    try {
      // 1. Create account
      await signup({
        email: cleanEmail,
        password,
        full_name: cleanFullName,
      })

      // 2. Automatically log in the user upon successful signup
      await login({
        email: cleanEmail,
        password,
      })

      if (onSuccess) {
        onSuccess()
      } else {
        const state = location.state as LocationState | null
        const destination = state?.from?.pathname || '/dashboard'
        navigate(destination, { replace: true })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Get started with ReQuote today</p>
      </div>

      {formError && (
        <Alert
          variant="error"
          title="Registration error"
          onClose={() => setFormError(null)}
        >
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <Input
          label="Full name (optional)"
          id="signup-fullname"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={fieldErrors.fullName}
          disabled={isSubmitting}
        />

        <Input
          label="Email address"
          id="signup-email"
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
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
          }}
          helperText="Minimum 8 characters"
          error={fieldErrors.password}
          disabled={isSubmitting}
          required
        />

        <Input
          label="Confirm password"
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (fieldErrors.confirmPassword) {
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
            }
          }}
          error={fieldErrors.confirmPassword}
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
          Create Account
        </Button>
      </form>

      <div className="auth-footer">
        Already have an account?{' '}
        {onSwitchToLogin ? (
          <button
            type="button"
            className="auth-link"
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        ) : (
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        )}
      </div>
    </div>
  )
}
