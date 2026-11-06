import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { EditQuotationPage } from '../EditQuotationPage'
import { quotationsApi } from '../../api/quotations'
import { QuotationResponse } from '../../types/quotation'

vi.mock('../../api/quotations', () => ({
  quotationsApi: {
    getQuotation: vi.fn(),
    updateQuotation: vi.fn(),
  },
}))

const mockQuote: QuotationResponse = {
  id: 'q999',
  user_id: 'u-abc',
  quotation_number: 'RQ-20261106-999',
  title: 'Cloud Migration Consulting',
  description: 'AWS setup and configuration',
  status: 'draft',
  customer_name: 'Starlight Tech',
  customer_email: 'hello@starlight.io',
  customer_phone: null,
  customer_company: 'Starlight Inc',
  customer_address: null,
  currency: 'USD',
  subtotal: '1000.00',
  tax_rate: '0.0500',
  tax_amount: '50.00',
  total_amount: '1050.00',
  notes: 'Net 15 terms.',
  terms_and_conditions: null,
  created_at: '2026-11-06T10:00:00Z',
  updated_at: '2026-11-06T10:00:00Z',
  items: [
    {
      id: 'it-1',
      quotation_id: 'q999',
      description: 'Discovery Workshop',
      unit: 'session',
      quantity: '1.00',
      unit_price: '1000.00',
      line_total: '1000.00',
      position: 1,
      created_at: '2026-11-06T10:00:00Z',
      updated_at: '2026-11-06T10:00:00Z',
    },
  ],
}

describe('EditQuotationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders prefilled quotation form in edit mode', async () => {
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(mockQuote)

    render(
      <MemoryRouter initialEntries={['/quotations/q999/edit']}>
        <Routes>
          <Route path="/quotations/:id/edit" element={<EditQuotationPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/loading quotation for editing…/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Cloud Migration Consulting')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Starlight Tech')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Discovery Workshop')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1000.00')).toBeInTheDocument()

    // Save changes button exists
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('renders 404 Not Found card when quotation does not exist', async () => {
    const error404 = {
      response: { status: 404, data: { detail: 'Quotation not found' } },
      message: 'Not found',
    }
    vi.mocked(quotationsApi.getQuotation).mockRejectedValue(error404)

    render(
      <MemoryRouter initialEntries={['/quotations/missing/edit']}>
        <Routes>
          <Route path="/quotations/:id/edit" element={<EditQuotationPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Quotation Not Found')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /return to quotations/i })).toBeInTheDocument()
  })

  it('displays warning alert when quotation is in terminal status (accepted)', async () => {
    const acceptedQuote: QuotationResponse = {
      ...mockQuote,
      status: 'accepted',
    }
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(acceptedQuote)

    render(
      <MemoryRouter initialEntries={['/quotations/q999/edit']}>
        <Routes>
          <Route path="/quotations/:id/edit" element={<EditQuotationPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/cannot edit 'accepted' quotation/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/quotations in/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return to quotation view/i })).toBeInTheDocument()
  })

  it('submits updated values and navigates back to quotation detail page', async () => {
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(mockQuote)
    const updatedQuote: QuotationResponse = {
      ...mockQuote,
      title: 'Cloud Migration Consulting - Phase 2',
    }
    vi.mocked(quotationsApi.updateQuotation).mockResolvedValue(updatedQuote)

    render(
      <MemoryRouter initialEntries={['/quotations/q999/edit']}>
        <Routes>
          <Route path="/quotations/:id/edit" element={<EditQuotationPage />} />
          <Route path="/quotations/:id" element={<div>Detail Page View</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Cloud Migration Consulting')).toBeInTheDocument()
    })

    const titleInput = screen.getByLabelText(/quotation title/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Cloud Migration Consulting - Phase 2')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await userEvent.click(saveBtn)

    expect(quotationsApi.updateQuotation).toHaveBeenCalledWith('q999', expect.objectContaining({
      title: 'Cloud Migration Consulting - Phase 2',
      customer_name: 'Starlight Tech',
    }))

    await waitFor(() => {
      expect(screen.getByText('Detail Page View')).toBeInTheDocument()
    })
  })
})
