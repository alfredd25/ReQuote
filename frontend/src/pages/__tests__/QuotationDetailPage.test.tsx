import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QuotationDetailPage } from '../QuotationDetailPage'
import { quotationsApi, triggerFileDownload } from '../../api/quotations'
import { QuotationResponse } from '../../types/quotation'

vi.mock('../../api/quotations', () => ({
  quotationsApi: {
    getQuotation: vi.fn(),
    deleteQuotation: vi.fn(),
    updateQuotationStatus: vi.fn(),
    downloadQuotationPdf: vi.fn(),
  },
  triggerFileDownload: vi.fn(),
}))

const mockQuote: QuotationResponse = {
  id: 'q123',
  user_id: 'u-abc',
  quotation_number: 'RQ-20261106-001',
  title: 'Website Redesign Project',
  description: 'Full stack redesign and implementation',
  status: 'draft',
  customer_name: 'Acme Corp',
  customer_email: 'billing@acme.com',
  customer_phone: '+1 555-0199',
  customer_company: 'Acme Industries',
  customer_address: '123 Market St, Suite 400',
  currency: 'USD',
  subtotal: '2500.00',
  tax_rate: '0.0800',
  tax_amount: '200.00',
  total_amount: '2700.00',
  notes: 'Payment net 30 days.',
  terms_and_conditions: 'Standard terms apply.',
  created_at: '2026-11-06T10:00:00Z',
  updated_at: '2026-11-06T10:00:00Z',
  items: [
    {
      id: 'item-1',
      quotation_id: 'q123',
      description: 'UI/UX Design',
      unit: 'hrs',
      quantity: '20.00',
      unit_price: '50.00',
      line_total: '1000.00',
      position: 1,
      created_at: '2026-11-06T10:00:00Z',
      updated_at: '2026-11-06T10:00:00Z',
    },
    {
      id: 'item-2',
      quotation_id: 'q123',
      description: 'Frontend Implementation',
      unit: 'hrs',
      quantity: '30.00',
      unit_price: '50.00',
      line_total: '1500.00',
      position: 2,
      created_at: '2026-11-06T10:00:00Z',
      updated_at: '2026-11-06T10:00:00Z',
    },
  ],
}

describe('QuotationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders quotation details, customer info, and line items', async () => {
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(mockQuote)

    render(
      <MemoryRouter initialEntries={['/quotations/q123']}>
        <Routes>
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Loading indicator is shown initially
    expect(screen.getByRole('status')).toBeInTheDocument()

    // Waits for data to load
    await waitFor(() => {
      expect(screen.getByText('RQ-20261106-001')).toBeInTheDocument()
    })

    expect(screen.getByText('Website Redesign Project')).toBeInTheDocument()
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
    expect(screen.getByText('Acme Industries')).toBeInTheDocument()
    expect(screen.getByText('billing@acme.com')).toBeInTheDocument()
    expect(screen.getByText('+1 555-0199')).toBeInTheDocument()
    expect(screen.getByText('123 Market St, Suite 400')).toBeInTheDocument()

    // Deliverables
    expect(screen.getByText('UI/UX Design')).toBeInTheDocument()
    expect(screen.getByText('Frontend Implementation')).toBeInTheDocument()

    // Totals
    expect(screen.getByText('$2,500.00')).toBeInTheDocument()
    expect(screen.getByText('$200.00')).toBeInTheDocument()
    expect(screen.getByText('$2,700.00')).toBeInTheDocument()

    // Notes
    expect(screen.getByText('Payment net 30 days.')).toBeInTheDocument()
    expect(screen.getByText('Standard terms apply.')).toBeInTheDocument()
  })

  it('renders 404 Not Found card when quotation is not found', async () => {
    const error404 = {
      response: { status: 404, data: { detail: 'Quotation not found' } },
      message: 'Not found',
    }
    vi.mocked(quotationsApi.getQuotation).mockRejectedValue(error404)

    render(
      <MemoryRouter initialEntries={['/quotations/nonexistent']}>
        <Routes>
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Quotation Not Found')).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /return to quotations/i })).toBeInTheDocument()
  })

  it('opens delete confirmation modal and invokes deleteQuotation', async () => {
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(mockQuote)
    vi.mocked(quotationsApi.deleteQuotation).mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/quotations/q123']}>
        <Routes>
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
          <Route path="/quotations" element={<div>Quotations List View</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('RQ-20261106-001')).toBeInTheDocument()
    })

    // Click delete button
    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    await userEvent.click(deleteBtn)

    // Confirm modal opens
    expect(screen.getByText(/are you sure you want to delete quotation 'rq-20261106-001'\?/i)).toBeInTheDocument()

    // Confirm action
    const confirmBtn = screen.getByRole('button', { name: 'Delete Quotation' })
    await userEvent.click(confirmBtn)

    expect(quotationsApi.deleteQuotation).toHaveBeenCalledWith('q123')
    await waitFor(() => {
      expect(screen.getByText('Quotations List View')).toBeInTheDocument()
    })
  })

  it('opens status transition modal and updates quotation status', async () => {
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(mockQuote)
    const updatedQuote: QuotationResponse = {
      ...mockQuote,
      status: 'sent',
    }
    vi.mocked(quotationsApi.updateQuotationStatus).mockResolvedValue(updatedQuote)

    render(
      <MemoryRouter initialEntries={['/quotations/q123']}>
        <Routes>
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('RQ-20261106-001')).toBeInTheDocument()
    })

    // Open status modal
    const changeStatusBtn = screen.getByRole('button', { name: /change status/i })
    await userEvent.click(changeStatusBtn)

    expect(screen.getByRole('heading', { name: /change quotation status/i })).toBeInTheDocument()
    expect(screen.getByText(/select next status/i)).toBeInTheDocument()

    // Transition from draft -> sent
    const submitBtn = screen.getByRole('button', { name: /update status/i })
    await userEvent.click(submitBtn)

    expect(quotationsApi.updateQuotationStatus).toHaveBeenCalledWith('q123', 'sent')
    await waitFor(() => {
      expect(screen.getByText(/quotation status changed to 'sent'/i)).toBeInTheDocument()
    })
  })

  it('disables edit button when quotation status is accepted or cancelled', async () => {
    const acceptedQuote: QuotationResponse = {
      ...mockQuote,
      status: 'accepted',
    }
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(acceptedQuote)

    render(
      <MemoryRouter initialEntries={['/quotations/q123']}>
        <Routes>
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('RQ-20261106-001')).toBeInTheDocument()
    })

    const editBtn = screen.getByRole('button', { name: /edit quote/i })
    expect(editBtn).toBeDisabled()
  })

  it('triggers PDF download when clicking Download PDF button', async () => {
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(mockQuote)
    const mockBlob = new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' })
    vi.mocked(quotationsApi.downloadQuotationPdf).mockResolvedValue(mockBlob)

    render(
      <MemoryRouter initialEntries={['/quotations/q123']}>
        <Routes>
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('RQ-20261106-001')).toBeInTheDocument()
    })

    const downloadBtn = screen.getByRole('button', { name: /download pdf/i })
    await userEvent.click(downloadBtn)

    expect(quotationsApi.downloadQuotationPdf).toHaveBeenCalledWith('q123')
    expect(triggerFileDownload).toHaveBeenCalledWith(
      mockBlob,
      'quotation-RQ-20261106-001.pdf'
    )
    await waitFor(() => {
      expect(screen.getByText(/quotation pdf generated and downloaded/i)).toBeInTheDocument()
    })
  })

  it('displays error alert when PDF download fails', async () => {
    vi.mocked(quotationsApi.getQuotation).mockResolvedValue(mockQuote)
    vi.mocked(quotationsApi.downloadQuotationPdf).mockRejectedValue(
      new Error('Failed to generate PDF')
    )

    render(
      <MemoryRouter initialEntries={['/quotations/q123']}>
        <Routes>
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('RQ-20261106-001')).toBeInTheDocument()
    })

    const downloadBtn = screen.getByRole('button', { name: /download pdf/i })
    await userEvent.click(downloadBtn)

    await waitFor(() => {
      expect(screen.getByText(/failed to generate pdf/i)).toBeInTheDocument()
    })
  })
})
