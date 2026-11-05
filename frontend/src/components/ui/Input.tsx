import { InputHTMLAttributes, forwardRef } from 'react'
import './ui.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, helperText, className = '', disabled, ...props }, ref) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    return (
      <div className={`form-group ${error ? 'has-error' : ''} ${className}`}>
        <label htmlFor={inputId} className="form-label">
          {label}
          {props.required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`form-input ${error ? 'input-error' : ''}`}
          {...props}
        />
        {error && (
          <span id={errorId} className="form-error" role="alert">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className="form-helper">
            {helperText}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
