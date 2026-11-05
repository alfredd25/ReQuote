import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from '../Navbar'
import * as AuthContextModule from '../../../context/AuthContext'

describe('Navbar', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'contractor@example.com',
        full_name: 'Alex Builder',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      token: 'valid-jwt',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: mockLogout,
      clearError: vi.fn(),
    })
  })

  it('renders brand, dashboard link and user details', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /requote/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByText('Alex Builder')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('invokes logout and navigates to /login when clicking sign out', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Navbar />
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>
    )

    const signoutBtn = screen.getByRole('button', { name: /sign out/i })
    await userEvent.click(signoutBtn)

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Login Page Target')).toBeInTheDocument()
  })
})
