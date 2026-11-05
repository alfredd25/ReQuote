import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginForm } from '../LoginForm'
import * as AuthContextModule from '../../../context/AuthContext'

describe('LoginForm', () => {
  const mockLogin = vi.fn()
  const mockOnSwitchToSignup = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockLogin,
      signup: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    })
  })

  it('renders email, password inputs and submit button', () => {
    render(
      <MemoryRouter>
        <LoginForm onSwitchToSignup={mockOnSwitchToSignup} />
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('validates required fields before submitting', async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await userEvent.click(submitButton)

    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await userEvent.type(emailInput, 'notanemail')
    await userEvent.type(passwordInput, 'validpass123')
    await userEvent.click(submitButton)

    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('submits credentials successfully and calls onSuccess', async () => {
    mockLogin.mockResolvedValueOnce({
      access_token: 'fake-token',
      token_type: 'bearer',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        full_name: 'Test User',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    })

    render(
      <MemoryRouter>
        <LoginForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    )

    await userEvent.type(screen.getByLabelText(/email address/i), 'USER@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'SecurePass123!',
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('displays error alert on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid email or password.'))

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    )

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it('calls onSwitchToSignup when link is clicked', async () => {
    render(
      <MemoryRouter>
        <LoginForm onSwitchToSignup={mockOnSwitchToSignup} />
      </MemoryRouter>
    )
    const switchBtn = screen.getByRole('button', { name: /create account/i })

    await userEvent.click(switchBtn)
    expect(mockOnSwitchToSignup).toHaveBeenCalledTimes(1)
  })
})
