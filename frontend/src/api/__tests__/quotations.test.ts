import { describe, it, expect, vi, beforeEach } from 'vitest'
import { quotationsApi } from '../quotations'
import { apiClient } from '../client'

describe('quotationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /quotations with pagination params', async () => {
    const mockResponse = {
      data: {
        items: [],
        total: 0,
        page: 2,
        page_size: 10,
        total_pages: 0,
      },
    }
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockResponse)

    const result = await quotationsApi.listQuotations({ page: 2, page_size: 10 })

    expect(getSpy).toHaveBeenCalledWith('/quotations', {
      params: { page: 2, page_size: 10 },
    })
    expect(result.page).toBe(2)
  })

  it('calls POST /quotations with valid QuotationCreate payload', async () => {
    const mockQuote = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: 'user-uuid',
      quotation_number: 'RQ-20261105-001',
      title: 'Plumbing Repair',
      status: 'draft',
      customer_name: 'John Smith',
      currency: 'USD',
      subtotal: '250.0000',
      tax_rate: '0.1000',
      tax_amount: '25.0000',
      total_amount: '275.0000',
      created_at: '2026-11-05T00:00:00Z',
      updated_at: '2026-11-05T00:00:00Z',
      items: [],
    }
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockQuote })

    const payload = {
      title: 'Plumbing Repair',
      customer_name: 'John Smith',
      currency: 'USD',
      items: [
        {
          description: 'Fix pipes',
          quantity: 2,
          unit_price: 125,
        },
      ],
    }

    const result = await quotationsApi.createQuotation(payload)

    expect(postSpy).toHaveBeenCalledWith('/quotations', payload)
    expect(result.title).toBe('Plumbing Repair')
    expect(result.quotation_number).toBe('RQ-20261105-001')
  })

  it('calls GET /quotations/:id to fetch a single quotation', async () => {
    const mockQuote = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      quotation_number: 'RQ-20261105-001',
      title: 'Sample Quote',
    }
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockQuote })

    const result = await quotationsApi.getQuotation('123e4567-e89b-12d3-a456-426614174000')

    expect(getSpy).toHaveBeenCalledWith('/quotations/123e4567-e89b-12d3-a456-426614174000')
    expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
  })
})

