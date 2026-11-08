import { FC, useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { quotationsApi, triggerFileDownload } from '../api/quotations'
import { extractErrorMessage } from '../api/client'
import { QuotationResponse } from '../types/quotation'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import { StatusBadge } from '../components/quotations/StatusBadge'
import { StatusTransitionModal } from '../components/quotations/StatusTransitionModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Alert } from '../components/ui/Alert'
import '../components/quotations/quotations.css'
import '../App.css'

export const QuotationDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [quotation, setQuotation] = useState<QuotationResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState<boolean>(false)

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const fetchQuotation = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    setIsNotFound(false)
    try {
      const data = await quotationsApi.getQuotation(id)
      setQuotation(data)
    } catch (err: unknown) {
      const errorMsg = extractErrorMessage(err, 'Failed to load quotation')
      setError(errorMsg)
      // Check if 404
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 404) {
          setIsNotFound(true)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchQuotation()
  }, [fetchQuotation])

  const handleDelete = async () => {
    if (!quotation) return
    setIsDeleting(true)
    setActionError(null)
    try {
      await quotationsApi.deleteQuotation(quotation.id)
      navigate('/quotations', { replace: true })
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to delete quotation')
      setActionError(msg)
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  const handleStatusUpdated = (updated: QuotationResponse) => {
    setQuotation(updated)
    setActionSuccess(`Quotation status changed to '${updated.status}'.`)
    setTimeout(() => setActionSuccess(null), 4000)
  }

  const handleDownloadPdf = async () => {
    if (!quotation) return
    setIsDownloadingPdf(true)
    setActionError(null)
    try {
      const blob = await quotationsApi.downloadQuotationPdf(quotation.id)
      triggerFileDownload(blob, `quotation-${quotation.quotation_number}.pdf`)
      setActionSuccess('Quotation PDF generated and downloaded.')
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to download quotation PDF')
      setActionError(msg)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          color: 'var(--text-secondary)',
        }}
        role="status"
        aria-live="polite"
      >
        <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }} />
        <p>Loading quotation details…</p>
      </div>
    )
  }

  if (isNotFound) {
    return (
      <Card style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '580px', margin: '2rem auto' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Quotation Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          The requested quotation does not exist or you do not have permission to access it.
        </p>
        <Link to="/quotations">
          <Button variant="primary" size="md">
            Return to Quotations
          </Button>
        </Link>
      </Card>
    )
  }

  if (error || !quotation) {
    return (
      <div>
        <Alert variant="error" title="Error loading quotation" onClose={fetchQuotation}>
          <p>{error || 'An error occurred while loading this quotation.'}</p>
          <Button variant="outline" size="sm" onClick={fetchQuotation} style={{ marginTop: '0.75rem' }}>
            Try Again
          </Button>
        </Alert>
      </div>
    )
  }

  const isTerminal = quotation.status === 'accepted' || quotation.status === 'cancelled'

  return (
    <>
      {/* Top Breadcrumb Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <Link
          to="/quotations"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          ← Back to Quotations
        </Link>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Created {formatDateTime(quotation.created_at)}
        </div>
      </div>

      {actionSuccess && (
        <Alert variant="success" onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert variant="error" title="Action failed" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Main Quotation Header Banner */}
      <div className="dashboard-hero" style={{ marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-light)' }}>
              {quotation.quotation_number}
            </span>
            <StatusBadge status={quotation.status} />
          </div>
          <h1 className="dashboard-heading" style={{ fontSize: '1.85rem' }}>
            {quotation.title}
          </h1>
          <p className="dashboard-subheading">
            Prepared for <strong style={{ color: 'var(--text-primary)' }}>{quotation.customer_name}</strong>
            {quotation.customer_company ? ` (${quotation.customer_company})` : ''}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleDownloadPdf}
            isLoading={isDownloadingPdf}
            title="Download printable PDF quotation"
          >
            📄 Download PDF
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setIsStatusModalOpen(true)}
          >
            Change Status
          </Button>

          <Link to={`/quotations/${quotation.id}/edit`}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={isTerminal}
              title={isTerminal ? `Cannot edit quotes in '${quotation.status}' status` : 'Edit quotation'}
            >
              ✏️ Edit Quote
            </Button>
          </Link>

          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            🗑️ Delete
          </Button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Customer Information */}
        <Card>
          <div className="card-header">
            <div className="status-icon">👤</div>
            <h2>Customer Details</h2>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Contact Name</span>
              <span className="value">{quotation.customer_name}</span>
            </div>
            {quotation.customer_company && (
              <div className="status-item">
                <span className="label">Company</span>
                <span className="value">{quotation.customer_company}</span>
              </div>
            )}
            {quotation.customer_email && (
              <div className="status-item">
                <span className="label">Email</span>
                <span className="value" style={{ wordBreak: 'break-all' }}>{quotation.customer_email}</span>
              </div>
            )}
            {quotation.customer_phone && (
              <div className="status-item">
                <span className="label">Phone</span>
                <span className="value">{quotation.customer_phone}</span>
              </div>
            )}
            {quotation.customer_address && (
              <div className="status-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                <span className="label">Billing Address</span>
                <span className="value" style={{ fontWeight: 400, fontSize: '0.85rem' }}>
                  {quotation.customer_address}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Quotation Metadata */}
        <Card>
          <div className="card-header">
            <div className="status-icon">📋</div>
            <h2>Quotation Info</h2>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Status</span>
              <StatusBadge status={quotation.status} />
            </div>
            <div className="status-item">
              <span className="label">Currency</span>
              <span className="value">{quotation.currency}</span>
            </div>
            <div className="status-item">
              <span className="label">Tax Rate</span>
              <span className="value">{(parseFloat(quotation.tax_rate) * 100).toFixed(2)}%</span>
            </div>
            <div className="status-item">
              <span className="label">Created Date</span>
              <span className="value">{formatDateTime(quotation.created_at)}</span>
            </div>
            <div className="status-item">
              <span className="label">Last Modified</span>
              <span className="value">{formatDateTime(quotation.updated_at)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Description / Scope */}
      {quotation.description && (
        <Card style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
            Project Overview &amp; Description
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {quotation.description}
          </p>
        </Card>
      )}

      {/* Line Items Table */}
      <Card style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Itemized Deliverables &amp; Pricing
        </h2>

        <div className="table-responsive">
          <table className="quotation-table" aria-label="Quotation Line Items">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Description</th>
                <th style={{ width: '90px' }}>Unit</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Quantity</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Unit Price</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {item.position || index + 1}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.description}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {item.unit || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {parseFloat(item.quantity).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatCurrency(item.unit_price, quotation.currency)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrency(item.line_total, quotation.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="financial-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(quotation.subtotal, quotation.currency)}</span>
          </div>

          <div className="summary-row">
            <span>
              Tax ({(parseFloat(quotation.tax_rate) * 100).toFixed(2)}%)
            </span>
            <span>{formatCurrency(quotation.tax_amount, quotation.currency)}</span>
          </div>

          <div className="summary-row total-row">
            <span>Total Amount</span>
            <span style={{ color: 'var(--accent-light)' }}>
              {formatCurrency(quotation.total_amount, quotation.currency)}
            </span>
          </div>
        </div>
      </Card>

      {/* Notes & Terms */}
      {(quotation.notes || quotation.terms_and_conditions) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {quotation.notes && (
            <Card>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Client Notes
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {quotation.notes}
              </p>
            </Card>
          )}

          {quotation.terms_and_conditions && (
            <Card>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Terms &amp; Conditions
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {quotation.terms_and_conditions}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Deletion */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="Delete Quotation"
        message={`Are you sure you want to delete quotation '${quotation.quotation_number}'? This will permanently delete the quote and all of its line items. This action cannot be undone.`}
        confirmText="Delete Quotation"
        cancelText="Keep Quotation"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Status Transition Dialog */}
      <StatusTransitionModal
        isOpen={isStatusModalOpen}
        quotation={quotation}
        onClose={() => setIsStatusModalOpen(false)}
        onSuccess={handleStatusUpdated}
      />
    </>
  )
}

