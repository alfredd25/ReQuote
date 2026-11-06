import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QuotationForm } from '../QuotationForm'
import { quotationsApi } from '../../../api/quotations'

describe('QuotationForm', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all required form sections and fields', () => {
    render(
      <MemoryRouter>
        <QuotationForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/quotation title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tax rate/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ add line item/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save & create quotation/i })).toBeInTheDocument()
  })

  it('adds and removes line items dynamically', async () => {
    render(
      <MemoryRouter>
        <QuotationForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/item #1 description/i)).toBeInTheDocument()

    const addBtn = screen.getByRole('button', { name: /\+ add line item/i })
    await userEvent.click(addBtn)

    expect(screen.getByLabelText(/item #2 description/i)).toBeInTheDocument()

    const removeBtn = screen.getByRole('button', { name: /remove item #2/i })
    await userEvent.click(removeBtn)

    expect(screen.queryByLabelText(/item #2 description/i)).not.toBeInTheDocument()
  })

  it('computes live subtotal and estimated total accurately', async () => {
    render(
      <MemoryRouter>
        <QuotationForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    )

    const qtyInput = screen.getByLabelText(/quantity/i)
    const priceInput = screen.getByLabelText(/unit price/i)
    const taxInput = screen.getByLabelText(/tax rate/i)

    // Set qty to 5, price to 20, tax to 10%
    await userEvent.clear(qtyInput)
    await userEvent.type(qtyInput, '5')

    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '20')

    await userEvent.clear(taxInput)
    await userEvent.type(taxInput, '10')

    // 5 * 20 = $100.00 subtotal (appears in item total preview and summary), 10% tax = $10.00, total = $110.00
    expect(screen.getAllByText('$100.00').length).toBe(2)
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('$110.00')).toBeInTheDocument()
  })

  it('validates required fields before submitting', async () => {
    render(
      <MemoryRouter>
        <QuotationForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    )

    const submitBtn = screen.getByRole('button', { name: /save & create quotation/i })
    await userEvent.click(submitBtn)

    expect(screen.getByText('Quotation title is required')).toBeInTheDocument()
    expect(screen.getByText('Customer name is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
  })

  it('submits valid quotation payload and calls onSuccess', async () => {
    const mockCreated = {
      id: 'quote-uuid-1',
      user_id: 'user-uuid-1',
      quotation_number: 'RQ-20261105-999',
      title: 'Kitchen Remodel',
      description: null,
      status: 'draft' as const,
      customer_name: 'Sarah Connor',
      customer_email: 'sarah@example.com',
      customer_phone: null,
      customer_company: null,
      customer_address: null,
      currency: 'USD',
      subtotal: '500.0000',
      tax_rate: '0.0000',
      tax_amount: '0.0000',
      total_amount: '500.0000',
      notes: null,
      terms_and_conditions: null,
      created_at: '2026-11-05T00:00:00Z',
      updated_at: '2026-11-05T00:00:00Z',
      items: [],
    }

    const createSpy = vi.spyOn(quotationsApi, 'createQuotation').mockResolvedValueOnce(mockCreated)

    render(
      <MemoryRouter>
        <QuotationForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    )

    await userEvent.type(screen.getByLabelText(/quotation title/i), 'Kitchen Remodel')
    await userEvent.type(screen.getByLabelText(/customer name/i), 'Sarah Connor')
    await userEvent.type(screen.getByLabelText(/customer email/i), 'sarah@example.com')
    await userEvent.type(screen.getByLabelText(/item #1 description/i), 'Cabinet Installation')

    const priceInput = screen.getByLabelText(/unit price/i)
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '500')

    const submitBtn = screen.getByRole('button', { name: /save & create quotation/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Kitchen Remodel',
          customer_name: 'Sarah Connor',
          customer_email: 'sarah@example.com',
          currency: 'USD',
          items: expect.arrayContaining([
            expect.objectContaining({
              description: 'Cabinet Installation',
              quantity: '1',
              unit_price: '500',
            }),
          ]),
        })
      )
      expect(mockOnSuccess).toHaveBeenCalledWith(mockCreated)
    })
  })

  it('displays API error alert when quotation creation fails', async () => {
    vi.spyOn(quotationsApi, 'createQuotation').mockRejectedValueOnce(
      new Error('Quotation with number already exists.')
    )

    render(
      <MemoryRouter>
        <QuotationForm onSuccess={mockOnSuccess} />
      </MemoryRouter>
    )

    await userEvent.type(screen.getByLabelText(/quotation title/i), 'Roof Repair')
    await userEvent.type(screen.getByLabelText(/customer name/i), 'David Clark')
    await userEvent.type(screen.getByLabelText(/item #1 description/i), 'Shingle Replacement')

    const priceInput = screen.getByLabelText(/unit price/i)
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '300')

    const submitBtn = screen.getByRole('button', { name: /save & create quotation/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/quotation with number already exists/i)).toBeInTheDocument()
    })
  })
})
