import { FC, useState } from 'react'
import {
  QuotationResponse,
  QuotationStatus,
  VALID_STATUS_TRANSITIONS,
} from '../../types/quotation'
import { quotationsApi } from '../../api/quotations'
import { extractErrorMessage } from '../../api/client'
import { StatusBadge } from './StatusBadge'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { getStatusMeta } from '../../utils/formatters'
import '../ui/ui.css'
import './quotations.css'

export interface StatusTransitionModalProps {
  isOpen: boolean
  quotation: QuotationResponse
  onClose: () => void
  onSuccess: (updated: QuotationResponse) => void
}

export const StatusTransitionModal: FC<StatusTransitionModalProps> = ({
  isOpen,
  quotation,
  onClose,
  onSuccess,
}) => {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[quotation.status] || []
  const [selectedStatus, setSelectedStatus] = useState<QuotationStatus | ''>(
    allowedTransitions.length > 0 ? allowedTransitions[0] : ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isTerminal = allowedTransitions.length === 0

  const handleTransition = async () => {
    if (!selectedStatus || isTerminal) return
    setIsSubmitting(true)
    setError(null)
    try {
      const updated = await quotationsApi.updateQuotationStatus(
        quotation.id,
        selectedStatus
      )
      onSuccess(updated)
      onClose()
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to update quotation status')
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
      >
        <div>
          <h3 id="status-modal-title" className="modal-title">
            Change Quotation Status
          </h3>
          <p className="modal-desc">
            Update the lifecycle state of quote{' '}
            <strong style={{ color: 'var(--accent-light)' }}>
              {quotation.quotation_number}
            </strong>
            .
          </p>
        </div>

        {error && (
          <Alert variant="error" title="Status transition failed" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Current Status:</span>
          <StatusBadge status={quotation.status} />
        </div>

        {isTerminal ? (
          <Alert variant="info" title="Terminal State">
            Quotation is currently <strong>{quotation.status}</strong>. Terminal quotations cannot be moved to any other status.
          </Alert>
        ) : (
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Select Next Status:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allowedTransitions.map((status) => {
                const meta = getStatusMeta(status)
                const isSelected = selectedStatus === status

                return (
                  <label
                    key={status}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? 'var(--accent-light)' : 'var(--border)'}`,
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <input
                        type="radio"
                        name="quotation-status"
                        value={status}
                        checked={isSelected}
                        onChange={() => setSelectedStatus(status)}
                        disabled={isSubmitting}
                      />
                      <span style={{ fontWeight: 600, color: meta.color }}>{meta.label}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Valid transition
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {!isTerminal && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleTransition}
              isLoading={isSubmitting}
              disabled={!selectedStatus}
            >
              Update Status
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

