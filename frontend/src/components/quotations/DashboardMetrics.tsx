import { FC } from 'react'
import { QuotationResponse } from '../../types/quotation'
import './quotations.css'

export interface DashboardMetricsProps {
  quotations: QuotationResponse[]
  totalCount: number
}

export const DashboardMetrics: FC<DashboardMetricsProps> = ({
  quotations,
  totalCount,
}) => {
  const draftCount = quotations.filter((q) => q.status === 'draft').length
  const sentCount = quotations.filter((q) => q.status === 'sent').length
  const acceptedCount = quotations.filter((q) => q.status === 'accepted').length

  return (
    <div className="metrics-grid" role="region" aria-label="Quotation Summary Metrics">
      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Total Quotes</span>
          <span className="metric-icon" aria-hidden="true">📊</span>
        </div>
        <div className="metric-value">{totalCount}</div>
        <div className="metric-sub">Across all statuses</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Drafts</span>
          <span className="metric-icon" aria-hidden="true">📝</span>
        </div>
        <div className="metric-value" style={{ color: '#94a3b8' }}>
          {draftCount}
        </div>
        <div className="metric-sub">In preparation</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Sent to Client</span>
          <span className="metric-icon" aria-hidden="true">📨</span>
        </div>
        <div className="metric-value" style={{ color: '#818cf8' }}>
          {sentCount}
        </div>
        <div className="metric-sub">Awaiting client response</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Accepted</span>
          <span className="metric-icon" aria-hidden="true">🎉</span>
        </div>
        <div className="metric-value" style={{ color: '#4ade80' }}>
          {acceptedCount}
        </div>
        <div className="metric-sub">Approved quotes</div>
      </div>
    </div>
  )
}

