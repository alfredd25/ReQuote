import { FC, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { quotationsApi } from '../api/quotations'
import { QuotationResponse } from '../types/quotation'
import { DashboardMetrics } from '../components/quotations/DashboardMetrics'
import { QuotationTable } from '../components/quotations/QuotationTable'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import '../components/auth/auth.css'
import '../App.css'

export const DashboardPage: FC = () => {
  const { user } = useAuth()
  const [quotations, setQuotations] = useState<QuotationResponse[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch newest quotations for dashboard summary & recent table
      const res = await quotationsApi.listQuotations({ page: 1, page_size: 10 })
      setQuotations(res.items)
      setTotalCount(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load quotation metrics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (!user) return null

  return (
    <>
      <div className="dashboard-hero">
        <div>
          <h1 className="dashboard-heading">
            Welcome back, {user.full_name || user.email.split('@')[0]}
          </h1>
          <p className="dashboard-subheading">
            Here is an overview of your active quote estimations.
          </p>
        </div>

        <Link to="/quotations/new">
          <Button variant="primary" size="md">
            + Create Quotation
          </Button>
        </Link>
      </div>

      {/* Real-time backend metrics */}
      <DashboardMetrics quotations={quotations} totalCount={totalCount} />

      {/* Recent Quotations Section */}
      <Card style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Quotations
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Latest quote proposals created for your clients.
            </p>
          </div>

          <Link to="/quotations" style={{ fontSize: '0.88rem', color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 600 }}>
            View All Quotes ({totalCount}) →
          </Link>
        </div>

        <QuotationTable
          quotations={quotations}
          isLoading={isLoading}
          error={error}
          onRetry={fetchDashboardData}
          showPagination={false}
          emptyMessage="No quotations created yet."
        />
      </Card>
    </>
  )
}
