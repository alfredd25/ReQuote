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
              <a href="#workflow" className="landing-nav-link">
                Workflow
              </a>
              <a href="#docs" className="landing-nav-link">
                Docs
              </a>
              <a href="#pricing" className="landing-nav-link">
                Pricing
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
            <Link to={isAuthenticated ? '/quotations/new' : '/login'} className="hero-cta-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              View live demo
            </Link>
          </div>
        </div>

        {/* ── Interactive Architecture Showcase (Render-inspired visual card) ── */}
        <div id="architecture" className="architecture-container">
          <div className="architecture-glow" />
          <div className="architecture-box">
            <div className="arch-top-bar">
              <div className="arch-breadcrumbs">
                <span className="arch-dot-icon">❖</span>
                <span className="arch-crumb-muted">Acme Global</span>
                <span className="arch-sep">›</span>
                <span className="arch-crumb-active">Production Quotation</span>
              </div>
              <div className="arch-status-pill">
                <span className="pulse-dot green" />
                <span>Live System</span>
              </div>
            </div>

            <div className="arch-body">
              {/* Left Column: Flow Nodes */}
              <div className="arch-nodes-grid">
                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">▤</span>
                    <div>
                      <div className="node-title">Client Scope</div>
                      <div className="node-sub">Acme Enterprises</div>
                    </div>
                  </div>
                  <span className="node-badge live">✓ Live</span>
                </div>

                <div className="arch-node-card active-node">
                  <div className="node-icon-title">
                    <span className="node-icon">⚡</span>
                    <div>
                      <div className="node-title">Itemization API</div>
                      <div className="node-sub">Decimal Precision</div>
                    </div>
                  </div>
                  <span className="node-badge deploying">⟳ Active</span>
                </div>

                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">📄</span>
                    <div>
                      <div className="node-title">PDF Engine</div>
                      <div className="node-sub">ReportLab Worker</div>
                    </div>
                  </div>
                  <span className="node-badge live">✓ Live</span>
                </div>

                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">❖</span>
                    <div>
                      <div className="node-title">Tax &amp; Currency</div>
                      <div className="node-sub">PostgreSQL 16</div>
                    </div>
                  </div>
                  <span className="node-badge succeeded">✓ Succeeded</span>
                </div>

                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">🔒</span>
                    <div>
                      <div className="node-title">Audit Trail</div>
                      <div className="node-sub">JWT Ownership</div>
                    </div>
                  </div>
                  <span className="node-badge live">✓ Live</span>
                </div>

                <div className="arch-node-card">
                  <div className="node-icon-title">
                    <span className="node-icon">⏱</span>
                    <div>
                      <div className="node-title">Lifecycle State</div>
                      <div className="node-sub">Accepted Proposal</div>
                    </div>
                  </div>
                  <span className="node-badge live">✓ Live</span>
                </div>
              </div>

              {/* Right Column: Live Terminal / Quotation Console */}
              <div className="arch-terminal-pane">
                <div className="terminal-header">
                  <span className="terminal-file-name">RQ-2026-0819 · Quote Stream</span>
                  <span className="terminal-badge">● Accepted</span>
                </div>
                <div className="terminal-body font-mono">
                  <div className="term-line prompt">&gt; requote generate --id RQ-2026-0819</div>
                  <div className="term-line success">✔ Connected to PostgreSQL (Neon Pool) in 1.2ms</div>
                  <div className="term-line info">✔ Loaded client profile: Acme Global Digital Inc.</div>
                  <div className="term-line dim">--------------------------------------------------</div>
                  <div className="term-line">[1] Cloud Migration Consulting: 40 hrs @ $175.00  = $7,000.00</div>
                  <div className="term-line">[2] High-Availability DB Setup: 1 system @ $4,500 = $4,500.00</div>
                  <div className="term-line">[3] CI/CD Pipeline Automation:  1 pipeline @ $3,000= $3,000.00</div>
                  <div className="term-line dim">--------------------------------------------------</div>
                  <div className="term-line highlight">Subtotal:       $14,500.00 USD</div>
                  <div className="term-line highlight">Tax (8.00%):     $1,160.00 USD</div>
                  <div className="term-line grand-total">Grand Total:    $15,660.00 USD [Decimal-exact]</div>
                  <div className="term-line success">✔ PDF compiled: 2 pages, NumberedCanvas (14ms)</div>
                  <div className="term-line accepted">✔ Status Transition: [sent] → [accepted] verified</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Strip ── */}
      <section className="social-proof-strip">
        <div className="social-proof-inner">
          <span className="social-proof-label">
            TRUSTED BY OVER 10,000+ FREELANCERS &amp; MODERN AGENCIES
          </span>
          <div className="stats-badges-row">
            <div className="stat-pill">
              <span className="stat-num">&lt; 30s</span>
              <span className="stat-desc">Quote Creation</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">100%</span>
              <span className="stat-desc">Decimal Precision</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">14ms</span>
              <span className="stat-desc">PDF Generation</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">99.9%</span>
              <span className="stat-desc">Cloud Uptime</span>
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
            <h3 className="feature-title">Enforced Lifecycle States</h3>
            <p className="feature-desc">
              Track quotations systematically through Draft, Sent, Accepted, Rejected, and Expired states with complete audit timestamps.
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

