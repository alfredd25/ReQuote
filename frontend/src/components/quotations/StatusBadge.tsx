import { FC } from 'react'
import { QuotationStatus } from '../../types/quotation'
import { getStatusMeta } from '../../utils/formatters'

export interface StatusBadgeProps {
  status: QuotationStatus
  className?: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const meta = getStatusMeta(status)

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: meta.color,
        backgroundColor: meta.bg,
        border: `1px solid ${meta.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: meta.color,
        }}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  )
}

