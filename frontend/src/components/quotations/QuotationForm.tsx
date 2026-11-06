import { FC, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { quotationsApi } from '../../api/quotations'
import { extractErrorMessage } from '../../api/client'
import { QuotationCreate, QuotationItemCreate, QuotationResponse } from '../../types/quotation'
import { formatCurrency } from '../../utils/formatters'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Card } from '../ui/Card'
import './quotations.css'

export interface QuotationFormProps {
  onSuccess?: (quote: QuotationResponse) => void
}

interface FormLineItem {
  id: string
  description: string
  unit: string
  quantity: string
  unit_price: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const QuotationForm: FC<QuotationFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate()

  // Header state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [quotationNumber, setQuotationNumber] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [taxRatePercent, setTaxRatePercent] = useState('0')

  // Customer state
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Notes & terms
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')

  // Line items state (start with 1 empty line item)
  const [items, setItems] = useState<FormLineItem[]>([
    {
      id: 'item-1',
      description: '',
      unit: '',
      quantity: '1',
      unit_price: '0.00',
    },
  ])

  // UI state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dynamic line item actions
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        description: '',
        unit: '',
        quantity: '1',
        unit_price: '0.00',
      },
    ])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleItemChange = (id: string, field: keyof FormLineItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  // Decimal calculations for live preview
  const computeLineTotal = (quantity: string, unitPrice: string): number => {
    const q = parseFloat(quantity) || 0
    const p = parseFloat(unitPrice) || 0
    return Math.max(0, q * p)
  }

  const subtotal = items.reduce(
    (acc, item) => acc + computeLineTotal(item.quantity, item.unit_price),
    0
  )
  const taxRateDecimal = (parseFloat(taxRatePercent) || 0) / 100
  const taxAmount = subtotal * Math.max(0, taxRateDecimal)
  const grandTotal = subtotal + taxAmount

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (!title.trim()) {
      errors.title = 'Quotation title is required'
    }

    if (!customerName.trim()) {
      errors.customerName = 'Customer name is required'
    }

    if (customerEmail.trim() && !EMAIL_REGEX.test(customerEmail.trim())) {
      errors.customerEmail = 'Invalid customer email address'
    }

    if (items.length === 0) {
      errors.items = 'At least one line item is required'
    } else {
      items.forEach((item, index) => {
        if (!item.description.trim()) {
          errors[`item_${index}_desc`] = 'Description is required'
        }
        const qty = parseFloat(item.quantity)
        if (isNaN(qty) || qty <= 0) {
          errors[`item_${index}_qty`] = 'Quantity must be > 0'
        }
        const price = parseFloat(item.unit_price)
        if (isNaN(price) || price < 0) {
          errors[`item_${index}_price`] = 'Price cannot be negative'
        }
      })
    }

    const taxNum = parseFloat(taxRatePercent)
    if (isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
      errors.taxRate = 'Tax rate must be between 0% and 100%'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setApiError(null)

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    // Build payload matching QuotationCreate schema
    const payloadItems: QuotationItemCreate[] = items.map((item, idx) => ({
      description: item.description.trim(),
      unit: item.unit.trim() || null,
      quantity: item.quantity.trim(),
      unit_price: item.unit_price.trim(),
      position: idx + 1,
    }))

    const payload: QuotationCreate = {
      title: title.trim(),
      description: description.trim() || null,
      quotation_number: quotationNumber.trim() || null,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim() || null,
      customer_phone: customerPhone.trim() || null,
      customer_company: customerCompany.trim() || null,
      customer_address: customerAddress.trim() || null,
      currency: currency.trim().toUpperCase(),
      tax_rate: (parseFloat(taxRatePercent) / 100).toFixed(4),
      notes: notes.trim() || null,
      terms_and_conditions: terms.trim() || null,
      items: payloadItems,
    }

    try {
      const created = await quotationsApi.createQuotation(payload)
      if (onSuccess) {
        onSuccess(created)
      } else {
        navigate('/quotations')
      }
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to create quotation')
      setApiError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {apiError && (
        <Alert
          variant="error"
          title="Could not create quotation"
          onClose={() => setApiError(null)}
        >
          {apiError}
        </Alert>
      )}

      {/* Quotation Header & Project Details */}
      <Card elevated style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          Quotation Details
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <Input
            label="Quotation Title"
            id="quote-title"
            placeholder="e.g. Website Redesign & SEO"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
            disabled={isSubmitting}
            required
          />

          <Input
            label="Quotation Number (Optional)"
            id="quote-number"
            placeholder="Auto-generated if left blank"
            value={quotationNumber}
            onChange={(e) => setQuotationNumber(e.target.value)}
            helperText="e.g. RQ-20261105-001"
            disabled={isSubmitting}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.25rem' }}>
          <div className="form-group">
            <label htmlFor="quote-currency" className="form-label">
              Currency
            </label>
            <select
              id="quote-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="filter-select"
              style={{ width: '100%', padding: '0.7rem' }}
              disabled={isSubmitting}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
            </select>
          </div>

          <Input
            label="Tax Rate (%)"
            id="quote-tax"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="0"
            value={taxRatePercent}
            onChange={(e) => setTaxRatePercent(e.target.value)}
            error={fieldErrors.taxRate}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label htmlFor="quote-description" className="form-label">
            Project Overview / Description
          </label>
          <textarea
            id="quote-description"
            rows={2}
            className="form-input"
            placeholder="Optional project scope or background details…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </Card>

      {/* Customer Information */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          Customer Information
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <Input
            label="Customer Name / Contact"
            id="customer-name"
            placeholder="e.g. Acme Industries, Jane Smith"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            error={fieldErrors.customerName}
            disabled={isSubmitting}
            required
          />

          <Input
            label="Customer Email"
            id="customer-email"
            type="email"
            placeholder="billing@customer.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            error={fieldErrors.customerEmail}
            disabled={isSubmitting}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.25rem' }}>
          <Input
            label="Company Name (Optional)"
            id="customer-company"
            placeholder="Acme Corp"
            value={customerCompany}
            onChange={(e) => setCustomerCompany(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Phone Number (Optional)"
            id="customer-phone"
            placeholder="+1 (555) 012-3456"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label htmlFor="customer-address" className="form-label">
            Billing Address (Optional)
          </label>
          <textarea
            id="customer-address"
            rows={2}
            className="form-input"
            placeholder="123 Business St, Suite 400, City, Country"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </Card>

      {/* Line Items Builder */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div className="line-item-header">
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Quotation Line Items
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Add billable services, goods, or deliverables.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddItem}
            disabled={isSubmitting}
          >
            + Add Line Item
          </Button>
        </div>

        {fieldErrors.items && (
          <p className="form-error" style={{ marginBottom: '1rem' }}>
            {fieldErrors.items}
          </p>
        )}

        <div className="line-items-container">
          {items.map((item, index) => {
            const lineTotal = computeLineTotal(item.quantity, item.unit_price)

            return (
              <div key={item.id} className="line-item-row">
                <Input
                  label={`Item #${index + 1} Description`}
                  id={`item-desc-${index}`}
                  placeholder="e.g. Design mockups, Backend API integration"
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                  error={fieldErrors[`item_${index}_desc`]}
                  disabled={isSubmitting}
                  required
                />

                <Input
                  label="Quantity"
                  id={`item-qty-${index}`}
                  type="number"
                  step="any"
                  min="0.0001"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                  error={fieldErrors[`item_${index}_qty`]}
                  disabled={isSubmitting}
                  required
                />

                <Input
                  label="Unit"
                  id={`item-unit-${index}`}
                  placeholder="hrs, pcs"
                  value={item.unit}
                  onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                  disabled={isSubmitting}
                />

                <Input
                  label="Unit Price"
                  id={`item-price-${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) => handleItemChange(item.id, 'unit_price', e.target.value)}
                  error={fieldErrors[`item_${index}_price`]}
                  disabled={isSubmitting}
                  required
                />

                <div className="item-total-preview">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Line Total</span>
                  <span>{formatCurrency(lineTotal, currency)}</span>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove item #${index + 1}`}
                    className="delete-btn"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isSubmitting}
                  >
                    🗑️
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Financial Summary Preview */}
        <div className="financial-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>

          <div className="summary-row">
            <span>Tax ({taxRatePercent || '0'}%)</span>
            <span>{formatCurrency(taxAmount, currency)}</span>
          </div>

          <div className="summary-row total-row">
            <span>Estimated Total</span>
            <span style={{ color: 'var(--accent-light)' }}>
              {formatCurrency(grandTotal, currency)}
            </span>
          </div>

          <div className="summary-hint">
            * Authoritative totals will be recalculated and verified by the backend.
          </div>
        </div>
      </Card>

      {/* Notes & Terms (Optional) */}
      <Card style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          Terms &amp; Notes (Optional)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="quote-notes" className="form-label">
              Client Notes
            </label>
            <textarea
              id="quote-notes"
              rows={3}
              className="form-input"
              placeholder="e.g. Thanks for your business! Estimated turnaround is 2 weeks."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="quote-terms" className="form-label">
              Terms &amp; Conditions
            </label>
            <textarea
              id="quote-terms"
              rows={3}
              className="form-input"
              placeholder="e.g. Payment due within 30 days of acceptance. 50% upfront deposit."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </Card>

      {/* Form Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => navigate('/quotations')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
        >
          Save &amp; Create Quotation
        </Button>
      </div>
    </form>
  )
}

