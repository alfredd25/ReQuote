import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PublicRoute } from '../PublicRoute'
import * as AuthContextModule from '../../../context/AuthContext'

describe('PublicRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders child when user is unauthenticated', () => {
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
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Public Login Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Public Login Content')).toBeInTheDocument()
  })

  it('redirects authenticated user to /dashboard by default', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        full_name: 'Logged In User',
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
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Public Login Content</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Authenticated Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Authenticated Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Public Login Content')).not.toBeInTheDocument()
  })

  it('redirects authenticated user to saved destination in location state if present', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        full_name: 'Logged In User',
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
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: { pathname: '/custom-destination' } },
          },
        ]}
      >
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Public Login Content</div>} />
          </Route>
          <Route path="/custom-destination" element={<div>Target Destination</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Target Destination')).toBeInTheDocument()
  })
})

