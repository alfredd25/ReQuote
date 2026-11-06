import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SettingsPage } from '../SettingsPage'
import { profileApi } from '../../api/profile'
import { BusinessProfile } from '../../types/profile'

vi.mock('../../api/profile', () => ({
  profileApi: {
    getBusinessProfile: vi.fn(),
    updateBusinessProfile: vi.fn(),
  },
}))

const mockProfile: BusinessProfile = {
  id: 'prof-123',
  user_id: 'user-abc',
  business_name: 'Pioneer Code Works',
  contact_person: 'Taylor Reed',
  email: 'taylor@pioneercode.com',
  phone: '+1 555-0199',
  address: '77 Silicon St, San Jose, CA',
  website: 'https://pioneercode.com',
  logo_url: 'https://pioneercode.com/logo.png',
  tax_id: 'US-EIN-992123',
  default_currency: 'USD',
  default_notes: 'Quotes valid for 30 days.',
  default_terms: 'Payment due on delivery.',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially and then displays populated form', async () => {
    vi.mocked(profileApi.getBusinessProfile).mockResolvedValue(mockProfile)

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pioneer Code Works')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Taylor Reed')).toBeInTheDocument()
    expect(screen.getByDisplayValue('taylor@pioneercode.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+1 555-0199')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://pioneercode.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('US-EIN-992123')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Quotes valid for 30 days.')).toBeInTheDocument()
  })

  it('validates invalid email format and prevents submission', async () => {
    vi.mocked(profileApi.getBusinessProfile).mockResolvedValue(mockProfile)

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('taylor@pioneercode.com')).toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/public business email/i)
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'invalid-email-string')

    const saveBtn = screen.getByRole('button', { name: /save settings/i })
    await userEvent.click(saveBtn)

    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    expect(profileApi.updateBusinessProfile).not.toHaveBeenCalled()
  })

  it('submits updated profile values and displays success banner', async () => {
    vi.mocked(profileApi.getBusinessProfile).mockResolvedValue(mockProfile)
    const updatedProfile: BusinessProfile = {
      ...mockProfile,
      business_name: 'Pioneer Code Works Global',
      phone: '+1 555-9999',
    }
    vi.mocked(profileApi.updateBusinessProfile).mockResolvedValue(updatedProfile)

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pioneer Code Works')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/business name/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Pioneer Code Works Global')

    const phoneInput = screen.getByLabelText(/business phone number/i)
    await userEvent.clear(phoneInput)
    await userEvent.type(phoneInput, '+1 555-9999')

    const saveBtn = screen.getByRole('button', { name: /save settings/i })
    await userEvent.click(saveBtn)

    expect(profileApi.updateBusinessProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        business_name: 'Pioneer Code Works Global',
        phone: '+1 555-9999',
      })
    )

    await waitFor(() => {
      expect(
        screen.getByText(/business profile and quotation settings saved successfully!/i)
      ).toBeInTheDocument()
    })
  })

  it('displays error alert when profile update API fails', async () => {
    vi.mocked(profileApi.getBusinessProfile).mockResolvedValue(mockProfile)
    vi.mocked(profileApi.updateBusinessProfile).mockRejectedValue(
      new Error('Database connection failed')
    )

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pioneer Code Works')).toBeInTheDocument()
    })

    const saveBtn = screen.getByRole('button', { name: /save settings/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText(/database connection failed/i)).toBeInTheDocument()
    })
  })
})

