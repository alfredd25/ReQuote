import { FC } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QuotationForm } from '../components/quotations/QuotationForm'
import '../App.css'

export const CreateQuotationPage: FC = () => {
  const navigate = useNavigate()

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
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
      </div>

      <div className="dashboard-hero" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-heading">Create New Quotation</h1>
          <p className="dashboard-subheading">
            Add client information, specify deliverables, and generate an itemized quote.
          </p>
        </div>
      </div>

      <QuotationForm
        onSuccess={() => {
          navigate('/quotations')
        }}
      />
    </>
  )
}

