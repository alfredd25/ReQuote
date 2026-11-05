import { FC, ReactNode } from 'react'
import './ui.css'

export interface AlertProps {
  variant?: 'error' | 'success' | 'info' | 'warning'
  title?: string
  children: ReactNode
  className?: string
  onClose?: () => void
}

export const Alert: FC<AlertProps> = ({
  variant = 'error',
  title,
  children,
  className = '',
  onClose,
}) => {
  const icons: Record<string, string> = {
    error: '⚠️',
    success: '✅',
    info: 'ℹ️',
    warning: '⚡',
  }

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`alert alert-${variant} ${className}`}
    >
      <div className="alert-content">
        <span className="alert-icon" aria-hidden="true">
          {icons[variant]}
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
