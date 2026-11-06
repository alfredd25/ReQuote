import { FC, useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { quotationsApi } from '../api/quotations'
import { extractErrorMessage } from '../api/client'
import { QuotationResponse } from '../types/quotation'
import { QuotationForm } from '../components/quotations/QuotationForm'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import '../App.css'

export const EditQuotationPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [quotation, setQuotation] = useState<QuotationResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState<boolean>(false)

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
        <p>Loading quotation for editing…</p>
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
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to={`/quotations/${quotation.id}`}
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
          ← Back to Quotation Details
        </Link>
      </div>

      <div className="dashboard-hero" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--accent-light)' }}>
              Editing {quotation.quotation_number}
            </span>
          </div>
          <h1 className="dashboard-heading">Edit Quotation</h1>
          <p className="dashboard-subheading">
            Modify quotation details, adjust pricing, or update line items. Changes will recalculate totals automatically.
          </p>
        </div>
      </div>

      {isTerminal ? (
        <Alert
          variant="warning"
          title={`Cannot Edit '${quotation.status.toUpperCase()}' Quotation`}
        >
          <p>
            Quotations in <strong>{quotation.status}</strong> status are finalized and cannot be modified.
          </p>
          <Link to={`/quotations/${quotation.id}`} style={{ display: 'inline-block', marginTop: '0.75rem' }}>
            <Button variant="secondary" size="sm">
              Return to Quotation View
            </Button>
          </Link>
        </Alert>
      ) : (
        <QuotationForm
          initialData={quotation}
          onSuccess={(updated) => {
            navigate(`/quotations/${updated.id}`)
          }}
        />
      )}
    </>
  )
}

