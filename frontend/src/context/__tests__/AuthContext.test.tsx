import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../AuthContext'
import { authApi } from '../../api/auth'
import * as tokenStorage from '../../utils/tokenStorage'

const TestConsumer = () => {
  const { user, token, isAuthenticated, isLoading, login, logout } = useAuth()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="token">{token || 'none'}</div>
      <button
        onClick={() =>
          login({ email: 'test@example.com', password: 'Password123!' }).catch(() => {})
        }
      >
        Trigger Login
      </button>
      <button onClick={logout}>Trigger Logout</button>
    </div>
  )
}

describe('AuthContext & useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('initializes as unauthenticated when no stored token exists', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
    expect(screen.getByTestId('token')).toHaveTextContent('none')
  })

  it('restores user session when valid stored token exists', async () => {
    vi.spyOn(tokenStorage, 'getStoredToken').mockReturnValue('valid-saved-jwt')
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'restored@example.com',
      full_name: 'Restored User',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent('restored@example.com')
    expect(screen.getByTestId('token')).toHaveTextContent('valid-saved-jwt')
  })

  it('clears token if session restoration fails with 401', async () => {
    vi.spyOn(tokenStorage, 'getStoredToken').mockReturnValue('expired-jwt')
    const removeSpy = vi.spyOn(tokenStorage, 'removeStoredToken')
    vi.spyOn(authApi, 'getMe').mockRejectedValueOnce(new Error('Unauthorized'))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
    expect(removeSpy).toHaveBeenCalled()
  })

  it('updates state and token storage upon successful login', async () => {
    const setSpy = vi.spyOn(tokenStorage, 'setStoredToken')
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      access_token: 'new-login-token',
      token_type: 'bearer',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        full_name: 'Logged In User',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    await userEvent.click(screen.getByText('Trigger Login'))

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('token')).toHaveTextContent('new-login-token')
      expect(setSpy).toHaveBeenCalledWith('new-login-token')
    })
  })

  it('clears state and storage on logout', async () => {
    vi.spyOn(tokenStorage, 'getStoredToken').mockReturnValue('valid-token')
    const removeSpy = vi.spyOn(tokenStorage, 'removeStoredToken')
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      full_name: 'Logged In User',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })

    await userEvent.click(screen.getByText('Trigger Logout'))

    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
    expect(screen.getByTestId('token')).toHaveTextContent('none')
    expect(removeSpy).toHaveBeenCalled()
  })

  it('clears session when window receives requote:unauthorized event', async () => {
    vi.spyOn(tokenStorage, 'getStoredToken').mockReturnValue('valid-token')
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      full_name: 'Logged In User',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })

    act(() => {
      window.dispatchEvent(new CustomEvent('requote:unauthorized'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
    })
  })
})

