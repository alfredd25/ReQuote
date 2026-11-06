import { describe, it, expect, vi, beforeEach } from 'vitest'
import { profileApi } from '../profile'
import { apiClient } from '../client'

describe('profileApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /profile and returns user business profile', async () => {
    const mockProfile = {
      id: 'prof-123',
      user_id: 'user-abc',
      business_name: 'Apex Studio',
      contact_person: 'John Doe',
      email: 'john@apex.io',
      phone: '+1 555-0100',
      address: '123 Market St',
      website: 'https://apex.io',
      logo_url: null,
      tax_id: 'EIN-123',
      default_currency: 'USD',
      default_notes: 'Standard notes',
      default_terms: 'Standard terms',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockProfile })

    const result = await profileApi.getBusinessProfile()

    expect(getSpy).toHaveBeenCalledWith('/profile')
    expect(result.business_name).toBe('Apex Studio')
    expect(result.default_currency).toBe('USD')
  })

  it('calls PUT /profile with updated fields and returns updated data', async () => {
    const payload = {
      business_name: 'Apex Studio Global',
      email: 'billing@apex.io',
      default_currency: 'EUR',
    }
    const mockUpdated = {
      id: 'prof-123',
      user_id: 'user-abc',
      ...payload,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({ data: mockUpdated })

    const result = await profileApi.updateBusinessProfile(payload)

    expect(putSpy).toHaveBeenCalledWith('/profile', payload)
    expect(result.business_name).toBe('Apex Studio Global')
    expect(result.default_currency).toBe('EUR')
  })
})

