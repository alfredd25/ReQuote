import { FC } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './HomePage.css'

export const HomePage: FC = () => {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="landing-page">
      {/* ── Top Announcement Bar (matching Render screenshot) ── */}
      <div className="announcement-bar">
        <span className="announcement-pill">New</span>
        <span className="announcement-text">
          Introducing ReQuote v2.0: Instant PDF generation &amp; decimal-exact itemization.
        </span>
        <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="announcement-link">
          Explore now →
        </Link>
      </div>

      {/* ── Main Navigation Header ── */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand-group">
            <Link to="/" className="landing-brand">
              <span className="brand-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5" />
                  <path d="M8 21H3v-5" />
                  <path d="M21 3l-7.5 7.5" />
                  <path d="M3 21l7.5-7.5" />
                </svg>
              </span>
              <span className="brand-name">ReQuote</span>
            </Link>

            <nav className="landing-nav" aria-label="Main links">
              <a href="#features" className="landing-nav-link">
                Product <span className="nav-chevron">▾</span>
              </a>
              <a href="#architecture" className="landing-nav-link">
                Architecture <span className="nav-chevron">▾</span>
              </a>
            </nav>
          </div>

          <div className="landing-auth-actions">
            {isAuthenticated ? (
              <>
                <span className="landing-user-greet">
                  {user?.full_name || user?.email}
                </span>
                <Link to="/dashboard" className="btn-render-primary">
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="landing-nav-link signout-link"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="landing-nav-link">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-render-primary">
                  Start for free &gt;
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="hero-headline">
            Your fastest path to production
            <br />
            for any quotation
          </h1>

          <p className="hero-subheadline">
            Intuitive quotation infrastructure to scale any agency or freelancer from your first client to your billionth.
          </p>

          <div className="hero-actions-row">
            <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="hero-cta-white">
              Start for free &gt;
            </Link>
            <a href="#architecture" className="hero-cta-dark">
              Explore Architecture
            </a>
          </div>
        </div>

        {/* ── Interactive Architecture Showcase (Render-inspired visual card) ── */}
        <div id="architecture" className="architecture-container">
          <div className="architecture-glow" />
          <div className="architecture-box">
            <div className="arch-top-bar">
              <div className="arch-breadcrumbs">
                <span className="arch-crumb-muted">Acme Global</span>
                <span className="arch-sep">›</span>
                <span className="arch-crumb-active">Project Estimation</span>
              </div>
              <div className="arch-status-pill">
                <span className="pulse-dot green" />
                <span>Verified Proposal</span>
              </div>
            </div>

            <div className="arch-body">
              {/* Left Column: Quotation Workflow Modules */}
              <div className="arch-nodes-grid">
                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </span>
                    <div>
                      <div className="node-title">Client Scope</div>
                      <div className="node-sub">Acme Enterprises LLC</div>
                    </div>
                  </div>
                  <span className="node-badge verified">Verified</span>
                </div>

                <div className="arch-node-card active-node">
                  <div className="node-icon-title">
                    <span className="node-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </span>
                    <div>
                      <div className="node-title">Scope &amp; Deliverables</div>
                      <div className="node-sub">3 Milestones Itemized</div>
                    </div>
                  </div>
                  <span className="node-badge calculated">Calculated</span>
                </div>

                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </span>
                    <div>
                      <div className="node-title">Print-Ready PDF</div>
                      <div className="node-sub">Branded Document Export</div>
                    </div>
                  </div>
                  <span className="node-badge ready">Ready</span>
                </div>

                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </span>
                    <div>
                      <div className="node-title">Tax &amp; Currency</div>
                      <div className="node-sub">8.00% VAT · USD ($)</div>
                    </div>
                  </div>
                  <span className="node-badge applied">Applied</span>
                </div>

                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    </span>
                    <div>
                      <div className="node-title">Payment Terms</div>
                      <div className="node-sub">Net 30 · 50% Deposit</div>
                    </div>
                  </div>
                  <span className="node-badge configured">Configured</span>
                </div>

                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </span>
                    <div>
                      <div className="node-title">Proposal Status</div>
                      <div className="node-sub">Accepted by Client</div>
                    </div>
                  </div>
                  <span className="node-badge accepted">Accepted</span>
                </div>
              </div>

              {/* Right Column: Quotation Summary & Breakdown Stream */}
              <div className="arch-terminal-pane">
                <div className="terminal-header">
                  <span className="terminal-file-name">RQ-2026-0819 · Digital Product Proposal</span>
                  <span className="terminal-badge">● Accepted</span>
                </div>
                <div className="terminal-body font-mono">
                  <div className="term-line prompt">Client:  Acme Global Digital Inc.</div>
                  <div className="term-line info">Project: Web Platform Redesign &amp; Brand System</div>
                  <div className="term-line dim">--------------------------------------------------</div>
                  <div className="term-line">[1] Brand Identity &amp; UI System:   40 hrs @ $125.00 = $5,000.00</div>
                  <div className="term-line">[2] Web Application Build:        80 hrs @ $125.00 = $10,000.00</div>
                  <div className="term-line">[3] Cloud Deployment &amp; Setup:     1 setup @ $1,500 = $1,500.00</div>
                  <div className="term-line dim">--------------------------------------------------</div>
                  <div className="term-line highlight">Subtotal:       $16,500.00 USD</div>
                  <div className="term-line highlight">Tax (8.00%):     $1,320.00 USD</div>
                  <div className="term-line grand-total">Grand Total:    $17,820.00 USD [Exact calculation]</div>
                  <div className="term-line dim">--------------------------------------------------</div>
                  <div className="term-line success">[ok] Branded PDF compiled with payment terms &amp; logo</div>
                  <div className="term-line accepted">[ok] Status: [accepted] · Client approved proposal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Highlights ── */}
      <section id="features" className="features-section">
        <div className="features-header">
          <h2 className="section-title">Engineered for client velocity</h2>
          <p className="section-subtitle">
            Eliminate messy spreadsheets, invoice discrepancies, and unprofessional estimates.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-num">01</div>
            <h3 className="feature-title">High-Precision Decimal Math</h3>
            <p className="feature-desc">
              All quantities, unit rates, tax amounts, and subtotals use Python Decimal arithmetic. Never lose a cent to floating-point rounding errors.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-num">02</div>
            <h3 className="feature-title">Print-Ready PDF Generation</h3>
            <p className="feature-desc">
              Generate publication-grade PDFs built with ReportLab. Includes custom business branding, client address, payment terms, and dynamic two-pass pagination.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-num">03</div>
            <h3 className="feature-title">Clear Status Tracking</h3>
            <p className="feature-desc">
              Track proposals systematically through Draft, Sent, Accepted, Rejected, and Expired states with transparent history.
            </p>
          </div>
        </div>
      </section>

      {/* ── Call To Action Banner ── */}
      <section className="cta-banner-section">
        <div className="cta-banner-box">
          <h2 className="cta-banner-title">
            Start quoting with precision today
          </h2>
          <p className="cta-banner-subtitle">
            Join thousands of professional agencies and freelancers who deliver clean, branded proposals with ReQuote.
          </p>
          <div className="cta-banner-actions">
            <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="hero-cta-white">
              Create your first quote &gt;
            </Link>
            <Link to={isAuthenticated ? '/quotations' : '/login'} className="hero-cta-dark">
              {isAuthenticated ? 'View Quotations' : 'Sign In to Workspace'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Clean Minimal Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-left">
            <span className="footer-brand">ReQuote</span>
            <span className="footer-copy">
              © {new Date().getFullYear()} ReQuote Solutions Inc. All rights reserved.
            </span>
          </div>
          <div className="footer-links">
            <a href="#features" className="footer-link">Features</a>
            <a href="#architecture" className="footer-link">Architecture</a>
            <Link to="/login" className="footer-link">Sign In</Link>
            <Link to="/signup" className="footer-link">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

