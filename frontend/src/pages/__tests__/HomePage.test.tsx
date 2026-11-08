import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '../HomePage'
import * as AuthContextModule from '../../context/AuthContext'

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders hero headline, architecture showcase, and CTA links for guests', () => {
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
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    // Hero title
    expect(
      screen.getByRole('heading', { name: /your fastest path to production/i })
    ).toBeInTheDocument()

    // Architecture section
    expect(screen.getByText('Client Scope')).toBeInTheDocument()
    expect(screen.getByText('Itemization API')).toBeInTheDocument()
    expect(screen.getByText('PDF Engine')).toBeInTheDocument()

    // Guest CTAs
    const signInLinks = screen.getAllByRole('link', { name: /sign in/i })
    expect(signInLinks.length).toBeGreaterThan(0)
    const startLinks = screen.getAllByRole('link', { name: /start for free/i })
    expect(startLinks.length).toBeGreaterThan(0)
  })

  it('renders dashboard link when user is authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'agency@example.com',
        full_name: 'Agency Leader',
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
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })
})
