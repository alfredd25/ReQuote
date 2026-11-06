import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QuotationTable } from '../QuotationTable'
import { QuotationResponse } from '../../../types/quotation'

const mockQuotes: QuotationResponse[] = [
  {
    id: '1',
    user_id: 'u1',
    quotation_number: 'RQ-20261105-001',
    title: 'HVAC Installation',
    description: 'Install heat pump',
    status: 'draft',
    customer_name: 'Alice Johnson',
    customer_email: 'alice@example.com',
    customer_phone: null,
    customer_company: 'Johnson Logistics',
    customer_address: null,
    currency: 'USD',
    subtotal: '1200.00',
    tax_rate: '0.1000',
    tax_amount: '120.00',
    total_amount: '1320.00',
    notes: null,
    terms_and_conditions: null,
    created_at: '2026-11-05T00:00:00Z',
    updated_at: '2026-11-05T00:00:00Z',
    items: [],
  },
  {
    id: '2',
    user_id: 'u1',
    quotation_number: 'RQ-20261105-002',
    title: 'Electrical Rewiring',
    description: null,
    status: 'accepted',
    customer_name: 'Bob Miller',
    customer_email: 'bob@example.com',
    customer_phone: null,
    customer_company: null,
    customer_address: null,
    currency: 'USD',
    subtotal: '850.00',
    tax_rate: '0.0000',
    tax_amount: '0.00',
    total_amount: '850.00',
    notes: null,
    terms_and_conditions: null,
    created_at: '2026-11-05T00:00:00Z',
    updated_at: '2026-11-05T00:00:00Z',
    items: [],
  },
]

describe('QuotationTable', () => {
  it('renders quotation rows with all required fields', () => {
    render(
      <MemoryRouter>
        <QuotationTable
          quotations={mockQuotes}
          isLoading={false}
          totalCount={2}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('RQ-20261105-001')).toBeInTheDocument()
    expect(screen.getByText('HVAC Installation')).toBeInTheDocument()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getAllByText('Draft').length).toBe(2) // 1 in filter dropdown, 1 in badge

    expect(screen.getByText('RQ-20261105-002')).toBeInTheDocument()
    expect(screen.getByText('Electrical Rewiring')).toBeInTheDocument()
    expect(screen.getByText('Bob Miller')).toBeInTheDocument()
    expect(screen.getAllByText('Accepted').length).toBe(2) // 1 in filter dropdown, 1 in badge
  })

  it('renders loading state when isLoading is true', () => {
    render(
      <MemoryRouter>
        <QuotationTable quotations={[]} isLoading={true} />
      </MemoryRouter>
    )

    expect(screen.getByText(/loading quotations…/i)).toBeInTheDocument()
  })

  it('renders empty message with create quote CTA when list is empty', () => {
    render(
      <MemoryRouter>
        <QuotationTable
          quotations={[]}
          isLoading={false}
          emptyMessage="No quotations created yet."
        />
      </MemoryRouter>
    )

    expect(screen.getByText('No quotations created yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\+ create quotation/i })).toBeInTheDocument()
  })

  it('filters rows based on search input', async () => {
    render(
      <MemoryRouter>
        <QuotationTable
          quotations={mockQuotes}
          isLoading={false}
          totalCount={2}
        />
      </MemoryRouter>
    )

    const searchInput = screen.getByLabelText(/search quotations/i)
    await userEvent.type(searchInput, 'HVAC')

    expect(screen.getByText('HVAC Installation')).toBeInTheDocument()
    expect(screen.queryByText('Electrical Rewiring')).not.toBeInTheDocument()
  })

  it('filters rows by status dropdown', async () => {
    render(
      <MemoryRouter>
        <QuotationTable
          quotations={mockQuotes}
          isLoading={false}
          totalCount={2}
        />
      </MemoryRouter>
    )

    const statusSelect = screen.getByLabelText(/filter quotations by status/i)
    await userEvent.selectOptions(statusSelect, 'accepted')

    expect(screen.getByText('Electrical Rewiring')).toBeInTheDocument()
    expect(screen.queryByText('HVAC Installation')).not.toBeInTheDocument()
  })

  it('renders error alert with retry button when error is provided', async () => {
    const mockRetry = vi.fn()
    render(
      <MemoryRouter>
        <QuotationTable
          quotations={[]}
          isLoading={false}
          error="Network Error"
          onRetry={mockRetry}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Network Error')).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(retryBtn)
    expect(mockRetry).toHaveBeenCalled()
  })

  it('renders pagination controls and responds to page change clicks', async () => {
    const mockPageChange = vi.fn()
    render(
      <MemoryRouter>
        <QuotationTable
          quotations={mockQuotes}
          isLoading={false}
          page={1}
          totalPages={3}
          totalCount={50}
          onPageChange={mockPageChange}
          showPagination={true}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: /next/i })
    await userEvent.click(nextBtn)
    expect(mockPageChange).toHaveBeenCalledWith(2)
  })
})
