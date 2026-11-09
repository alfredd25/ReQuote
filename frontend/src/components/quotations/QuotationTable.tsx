import { FC, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { QuotationResponse, QuotationStatus } from '../../types/quotation'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { StatusBadge } from './StatusBadge'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import './quotations.css'

export interface QuotationTableProps {
  quotations: QuotationResponse[]
  isLoading: boolean
  error?: string | null
  onRetry?: () => void
  page?: number
  totalPages?: number
  totalCount?: number
  onPageChange?: (newPage: number) => void
  showPagination?: boolean
  emptyMessage?: string
}

export const QuotationTable: FC<QuotationTableProps> = ({
  quotations,
  isLoading,
  error,
  onRetry,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  showPagination = true,
  emptyMessage = 'No quotations found.',
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Frontend filter for search query and status filter
  const filteredQuotations = useMemo(() => {
    return quotations.filter((quote) => {
      const matchesSearch =
        searchTerm === '' ||
        quote.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || quote.status === (statusFilter as QuotationStatus)

      return matchesSearch && matchesStatus
    })
  }, [quotations, searchTerm, statusFilter])

  if (error) {
    return (
      <Alert
        variant="error"
        title="Failed to load quotations"
        onClose={onRetry}
      >
        <p>{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} style={{ marginTop: '0.75rem' }}>
            Try Again
          </Button>
        )}
      </Alert>
    )
  }

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            aria-label="Search quotations"
            placeholder="Search by quote #, title, or customer…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ×
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label htmlFor="status-filter" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter quotations by status"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-responsive">
        <table className="quotation-table" aria-label="Quotations Table">
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Title / Project</th>
              <th>Customer</th>
              <th>Created</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <span className="spinner" style={{ width: '1.75rem', height: '1.75rem', borderWidth: '3px' }} />
                  <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
                    Loading quotations…
                  </p>
                </td>
              </tr>
            ) : filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <div style={{ marginBottom: '0.75rem', opacity: 0.5 }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {emptyMessage}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search terms or filters.'
                      : 'Get started by creating your first quote estimation.'}
                  </p>
                  <Link to="/quotations/new">
                    <Button variant="primary" size="md">
                      + Create Quotation
                    </Button>
                  </Link>
                </td>
              </tr>
            ) : (
              filteredQuotations.map((quote) => (
                <tr key={quote.id}>
                  <td>
                    <Link
                      to={`/quotations/${quote.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <span className="quote-number">{quote.quotation_number}</span>
                    </Link>
                  </td>
                  <td>
                    <Link
                      to={`/quotations/${quote.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="quote-title">{quote.title}</div>
                    </Link>
                    {quote.description && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {quote.description.length > 50
                          ? `${quote.description.slice(0, 50)}…`
                          : quote.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="quote-customer">{quote.customer_name}</div>
                    {quote.customer_company && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {quote.customer_company}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {formatDate(quote.created_at)}
                  </td>
                  <td>
                    <span className="quote-amount">
                      {formatCurrency(quote.total_amount, quote.currency)}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={quote.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/quotations/${quote.id}`}>
                      <Button variant="secondary" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {showPagination && totalPages > 1 && onPageChange && (
        <div className="pagination">
          <div>
            Showing {filteredQuotations.length} of {totalCount} total
          </div>
          <div className="pagination-controls">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span style={{ fontSize: '0.85rem', padding: '0 0.5rem' }}>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

