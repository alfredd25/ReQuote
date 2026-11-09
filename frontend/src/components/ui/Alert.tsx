import { FC, ReactNode, CSSProperties } from 'react'
import './ui.css'

export interface AlertProps {
  variant?: 'error' | 'success' | 'info' | 'warning'
  title?: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClose?: () => void
}

export const Alert: FC<AlertProps> = ({
  variant = 'error',
  title,
  children,
  className = '',
  style,
  onClose,
}) => {
  const renderIcon = () => {
    switch (variant) {
      case 'success':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )
      case 'warning':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
      case 'info':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )
      case 'error':
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )
    }
  }

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`alert alert-${variant} ${className}`}
      style={style}
    >
      <div className="alert-content">
        <span className="alert-icon" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {renderIcon()}
        </span>
        <div className="alert-body">
          {title && <h4 className="alert-title">{title}</h4>}
          <div className="alert-message">{children}</div>
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="alert-close"
        >
          ×
        </button>
      )}
    </div>
  )
}
