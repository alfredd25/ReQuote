import { FC, useState, useEffect, FormEvent, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { profileApi } from '../api/profile'
import { extractErrorMessage } from '../api/client'
import { BusinessProfile, BusinessProfileUpdate } from '../types/profile'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import '../App.css'
import '../components/quotations/quotations.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const POPULAR_CURRENCIES = [
  { code: 'USD', label: 'USD ($) – US Dollar' },
  { code: 'EUR', label: 'EUR (€) – Euro' },
  { code: 'GBP', label: 'GBP (£) – British Pound' },
  { code: 'CAD', label: 'CAD (CA$) – Canadian Dollar' },
  { code: 'AUD', label: 'AUD (AU$) – Australian Dollar' },
  { code: 'JPY', label: 'JPY (¥) – Japanese Yen' },
  { code: 'CHF', label: 'CHF (Fr) – Swiss Franc' },
  { code: 'INR', label: 'INR (₹) – Indian Rupee' },
]

export const SettingsPage: FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form State
  const [businessName, setBusinessName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [taxId, setTaxId] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState('USD')
  const [defaultNotes, setDefaultNotes] = useState('')
  const [defaultTerms, setDefaultTerms] = useState('')

  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data: BusinessProfile = await profileApi.getBusinessProfile()
      setBusinessName(data.business_name || '')
      setContactPerson(data.contact_person || '')
      setEmail(data.email || '')
      setPhone(data.phone || '')
      setAddress(data.address || '')
      setWebsite(data.website || '')
      setLogoUrl(data.logo_url || '')
      setTaxId(data.tax_id || '')
      setDefaultCurrency(data.default_currency || 'USD')
      setDefaultNotes(data.default_notes || '')
      setDefaultTerms(data.default_terms || '')
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load business profile'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (website.trim() && !/^https?:\/\//i.test(website.trim())) {
      errors.website = 'Website must start with http:// or https://'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!validate()) return

    setIsSaving(true)
    const payload: BusinessProfileUpdate = {
      business_name: businessName.trim() || null,
      contact_person: contactPerson.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      website: website.trim() || null,
      logo_url: logoUrl.trim() || null,
      tax_id: taxId.trim() || null,
      default_currency: defaultCurrency.trim().toUpperCase(),
      default_notes: defaultNotes.trim() || null,
      default_terms: defaultTerms.trim() || null,
    }

    try {
      const updated = await profileApi.updateBusinessProfile(payload)
      setBusinessName(updated.business_name || '')
      setContactPerson(updated.contact_person || '')
      setEmail(updated.email || '')
      setPhone(updated.phone || '')
      setAddress(updated.address || '')
      setWebsite(updated.website || '')
      setLogoUrl(updated.logo_url || '')
      setTaxId(updated.tax_id || '')
      setDefaultCurrency(updated.default_currency || 'USD')
      setDefaultNotes(updated.default_notes || '')
      setDefaultTerms(updated.default_terms || '')
      setSuccessMessage('Business profile and quotation settings saved successfully!')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to update business profile'))
    } finally {
      setIsSaving(false)
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
        <p>Loading business profile &amp; settings…</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/dashboard"
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
          ← Back to Dashboard
        </Link>
      </div>

      <div className="dashboard-hero" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 className="dashboard-heading">Business Profile &amp; Settings</h1>
          <p className="dashboard-subheading">
            Configure your company identity, contact information, and defaults for printed and PDF quotations.
          </p>
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)} style={{ marginBottom: '1.25rem' }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" title="Settings Error" onClose={() => setError(null)} style={{ marginBottom: '1.25rem' }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
          {/* Card 1: Company Profile & Identity */}
          <Card>
            <div className="card-header">
              <h2>Company Identity</h2>
            </div>

            <Input
              label="Business Name"
              id="businessName"
              placeholder="e.g. Acme Studio LLC"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              helperText="Appears as the primary issuer name on quotations and PDFs"
            />

            <Input
              label="Primary Contact Person"
              id="contactPerson"
              placeholder="e.g. Sarah Jenkins"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              helperText="Representative name or quote preparer"
            />

            <Input
              label="Tax ID / VAT Registration"
              id="taxId"
              placeholder="e.g. US-EIN-12345678 or GB999999999"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              helperText="Optional business tax identifier for customer invoices"
            />

            <Input
              label="Logo URL"
              id="logoUrl"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              helperText="URL pointing to your company logo image"
            />
          </Card>

          {/* Card 2: Contact Information */}
          <Card>
            <div className="card-header">
              <h2>Contact Information</h2>
            </div>

            <Input
              label="Public Business Email"
              id="email"
              type="email"
              placeholder="contact@mycompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              helperText="Displayed in the header and footer of exported quote PDFs"
            />

            <Input
              label="Business Phone Number"
              id="phone"
              type="tel"
              placeholder="+1 (555) 019-2834"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Website URL"
              id="website"
              type="url"
              placeholder="https://mycompany.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              error={fieldErrors.website}
            />

            <div className="form-group">
              <label htmlFor="address" className="form-label">
                Business Mailing Address
              </label>
              <textarea
                id="address"
                className="form-textarea"
                rows={3}
                placeholder="100 Innovation Way, Suite 500, San Francisco, CA 94105"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </Card>
        </div>

        {/* Card 3: Quotation Defaults */}
        <Card style={{ marginBottom: '1.75rem' }}>
          <div className="card-header">
            <h2>Quotation Defaults</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label htmlFor="defaultCurrency" className="form-label">
                Default Currency
              </label>
              <select
                id="defaultCurrency"
                className="filter-select"
                style={{ width: '100%', height: '42px' }}
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
              >
                {POPULAR_CURRENCIES.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.label}
                  </option>
                ))}
              </select>
              <span className="form-helper-text">
                Primary currency used when creating new quotations
              </span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="defaultNotes" className="form-label">
              Default Client Notes
            </label>
            <textarea
              id="defaultNotes"
              className="form-textarea"
              rows={2}
              placeholder="e.g. Estimates are valid for 30 calendar days from issue date."
              value={defaultNotes}
              onChange={(e) => setDefaultNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="defaultTerms" className="form-label">
              Default Terms &amp; Conditions
            </label>
            <textarea
              id="defaultTerms"
              className="form-textarea"
              rows={3}
              placeholder="e.g. 50% deposit due on project acceptance. Balance net 15 days upon milestone sign-off."
              value={defaultTerms}
              onChange={(e) => setDefaultTerms(e.target.value)}
            />
          </div>
        </Card>

        {/* Live Preview Card */}
        <Card style={{ marginBottom: '2rem', border: '1px solid var(--accent-light)', background: 'rgba(99, 102, 241, 0.03)' }}>
          <div className="card-header">
            <h2>PDF Header Preview</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', padding: '0.75rem 0' }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {businessName || 'Your Business Name'}
              </div>
              {contactPerson && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Attn: {contactPerson}
                </div>
              )}
              {address && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {address}
                </div>
              )}
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {[email, phone].filter(Boolean).join(' • ') || 'email & phone'}
              </div>
              {website && (
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-light)' }}>
                  {website}
                </div>
              )}
              {taxId && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Tax ID: {taxId}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                QUOTATION
              </div>
              <div style={{ fontFamily: 'monospace', color: 'var(--accent-light)', fontSize: '0.9rem', fontWeight: 700 }}>
                RQ-20261106-PREVIEW
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Currency: <strong>{defaultCurrency}</strong>
              </div>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <Link to="/dashboard">
            <Button variant="secondary" size="md">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </>
  )
}

