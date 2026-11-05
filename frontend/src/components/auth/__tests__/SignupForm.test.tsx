import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupForm } from '../SignupForm'
import * as AuthContextModule from '../../../context/AuthContext'

describe('SignupForm', () => {
  const mockSignup = vi.fn()
  const mockLogin = vi.fn()
  const mockOnSwitchToLogin = vi.fn()
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
      signup: mockSignup,
      logout: vi.fn(),
      clearError: vi.fn(),
    })
  })

  it('renders all form inputs and submit button', () => {
    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<SignupForm />)
    const submitBtn = screen.getByRole('button', { name: /create account/i })

    await userEvent.click(submitBtn)

    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(mockSignup).not.toHaveBeenCalled()
  })

  it('enforces password minimum length of 8 characters', async () => {
    render(<SignupForm />)

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'short')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    expect(mockSignup).not.toHaveBeenCalled()
  })

  it('detects mismatched password confirmation', async () => {
    render(<SignupForm />)

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password123!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'PasswordDifferent!')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mockSignup).not.toHaveBeenCalled()
  })

  it('submits signup and automatically logs in on success', async () => {
    mockSignup.mockResolvedValueOnce({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'newuser@example.com',
      full_name: 'New Contractor',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    mockLogin.mockResolvedValueOnce({
      access_token: 'fake-token',
      token_type: 'bearer',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'newuser@example.com',
        full_name: 'New Contractor',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    })

    render(<SignupForm onSuccess={mockOnSuccess} />)

    await userEvent.type(screen.getByLabelText(/full name/i), 'New Contractor')
    await userEvent.type(screen.getByLabelText(/email address/i), 'NewUser@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password123!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'Password123!',
        full_name: 'New Contractor',
      })
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'Password123!',
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('displays duplicate email conflict error from backend', async () => {
    mockSignup.mockRejectedValueOnce(
      new Error('An account with this email address already exists.')
    )

    render(<SignupForm />)

    await userEvent.type(screen.getByLabelText(/email address/i), 'existing@example.com')
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password123!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password123!')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(
        screen.getByText(/an account with this email address already exists/i)
      ).toBeInTheDocument()
    })
  })

  it('calls onSwitchToLogin when clicking sign in link', async () => {
    render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />)
    const switchBtn = screen.getByRole('button', { name: /sign in/i })

    await userEvent.click(switchBtn)
    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1)
  })
})

