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
          <span className="metric-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </span>
        </div>
        <div className="metric-value">{totalCount}</div>
        <div className="metric-sub">Across all statuses</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Drafts</span>
          <span className="metric-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </span>
        </div>
        <div className="metric-value" style={{ color: '#94a3b8' }}>
          {draftCount}
        </div>
        <div className="metric-sub">In preparation</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Sent to Client</span>
          <span className="metric-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </span>
        </div>
        <div className="metric-value" style={{ color: '#818cf8' }}>
          {sentCount}
        </div>
        <div className="metric-sub">Awaiting client response</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <span className="metric-title">Accepted</span>
          <span className="metric-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
        </div>
        <div className="metric-value" style={{ color: '#4ade80' }}>
          {acceptedCount}
        </div>
        <div className="metric-sub">Approved quotes</div>
      </div>
    </div>
  )
}

