import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import * as AuthContextModule from '../../../context/AuthContext'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading spinner while authentication session is loading', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/restoring session…/i)).toBeInTheDocument()
    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated user to /login and preserves intended destination in location state', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Login Page Target')).toBeInTheDocument()
    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument()
  })

  it('renders protected child component when user is authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'auth@example.com',
        full_name: 'Auth User',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Secret Dashboard')).toBeInTheDocument()
  })
})

