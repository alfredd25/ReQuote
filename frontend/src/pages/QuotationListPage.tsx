import { FC, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { quotationsApi } from '../api/quotations'
import { QuotationResponse } from '../types/quotation'
import { QuotationTable } from '../components/quotations/QuotationTable'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import '../App.css'

export const QuotationListPage: FC = () => {
  const [quotations, setQuotations] = useState<QuotationResponse[]>([])
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(20)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotations = useCallback(async (targetPage = 1) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await quotationsApi.listQuotations({
        page: targetPage,
        page_size: pageSize,
      })
      setQuotations(res.items)
      setPage(res.page)
      setTotalPages(res.total_pages)
      setTotalCount(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch quotations')
    } finally {
      setIsLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    fetchQuotations(page)
  }, [fetchQuotations, page])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  return (
    <>
      <div className="dashboard-hero">
        <div>
          <h1 className="dashboard-heading">Quotations</h1>
          <p className="dashboard-subheading">
            Review, search, and track all your client quotes and status updates.
          </p>
        </div>

        <Link to="/quotations/new">
          <Button variant="primary" size="md">
            + Create Quotation
          </Button>
        </Link>
      </div>

      <Card style={{ marginBottom: '2rem' }}>
        <QuotationTable
          quotations={quotations}
          isLoading={isLoading}
          error={error}
          onRetry={() => fetchQuotations(page)}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          showPagination={true}
          emptyMessage="No quotations found."
        />
      </Card>
    </>
  )
}

