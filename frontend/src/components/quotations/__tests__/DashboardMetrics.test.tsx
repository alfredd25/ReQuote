import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardMetrics } from '../DashboardMetrics'
import { QuotationResponse } from '../../../types/quotation'

const mockQuotations: QuotationResponse[] = [
  {
    id: '1',
    user_id: 'u1',
    quotation_number: 'RQ-001',
    title: 'Draft Quote',
    description: null,
    status: 'draft',
    customer_name: 'Customer A',
    customer_email: null,
    customer_phone: null,
    customer_company: null,
    customer_address: null,
    currency: 'USD',
    subtotal: '100.00',
    tax_rate: '0.00',
    tax_amount: '0.00',
    total_amount: '100.00',
    notes: null,
    terms_and_conditions: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    items: [],
  },
  {
    id: '2',
    user_id: 'u1',
    quotation_number: 'RQ-002',
    title: 'Sent Quote',
    description: null,
    status: 'sent',
    customer_name: 'Customer B',
    customer_email: null,
    customer_phone: null,
    customer_company: null,
    customer_address: null,
    currency: 'USD',
    subtotal: '200.00',
    tax_rate: '0.00',
    tax_amount: '0.00',
    total_amount: '200.00',
    notes: null,
    terms_and_conditions: null,
    created_at: '2026-11-02T00:00:00Z',
    updated_at: '2026-11-02T00:00:00Z',
    items: [],
  },
  {
    id: '3',
    user_id: 'u1',
    quotation_number: 'RQ-003',
    title: 'Accepted Quote',
    description: null,
    status: 'accepted',
    customer_name: 'Customer C',
    customer_email: null,
    customer_phone: null,
    customer_company: null,
    customer_address: null,
    currency: 'USD',
    subtotal: '350.00',
    tax_rate: '0.00',
    tax_amount: '0.00',
    total_amount: '350.00',
    notes: null,
    terms_and_conditions: null,
    created_at: '2026-11-03T00:00:00Z',
    updated_at: '2026-11-03T00:00:00Z',
    items: [],
  },
]

describe('DashboardMetrics', () => {
  it('calculates and renders total, draft, sent, and accepted metrics accurately', () => {
    render(<DashboardMetrics quotations={mockQuotations} totalCount={3} />)

    expect(screen.getByText('Total Quotes')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    expect(screen.getByText('Drafts')).toBeInTheDocument()
    expect(screen.getByText('Sent to Client')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()

    // 1 draft, 1 sent, 1 accepted
    const ones = screen.getAllByText('1')
    expect(ones.length).toBe(3)
  })

  it('renders zero counts correctly on empty quotations list', () => {
    render(<DashboardMetrics quotations={[]} totalCount={0} />)

    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBe(4) // total, drafts, sent, accepted
  })
})

