/**
 * formatters.ts – Utilities for formatting currency, numbers, and dates.
 */

import { QuotationStatus } from '../types/quotation'

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'USD'
): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0.00'
  }
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount)
  if (isNaN(numeric)) {
    return '0.00'
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric)
  } catch {
    // Fallback if currency code is unusual
    return `${currency.toUpperCase()} ${numeric.toFixed(2)}`
  }
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export interface StatusMeta {
  label: string
  color: string
  bg: string
  border: string
}

export function getStatusMeta(status: QuotationStatus): StatusMeta {
  switch (status) {
    case 'draft':
      return {
        label: 'Draft',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.25)',
      }
    case 'sent':
      return {
        label: 'Sent',
        color: '#818cf8',
        bg: 'rgba(99, 102, 241, 0.15)',
        border: 'rgba(99, 102, 241, 0.3)',
      }
    case 'accepted':
      return {
        label: 'Accepted',
        color: '#4ade80',
        bg: 'rgba(34, 197, 94, 0.15)',
        border: 'rgba(34, 197, 94, 0.3)',
      }
    case 'rejected':
      return {
        label: 'Rejected',
        color: '#f87171',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)',
      }
    case 'expired':
      return {
        label: 'Expired',
        color: '#facc15',
        bg: 'rgba(234, 179, 8, 0.15)',
        border: 'rgba(234, 179, 8, 0.3)',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.1)',
        border: 'rgba(148, 163, 184, 0.2)',
      }
    default:
      return {
        label: status,
        color: '#cbd5e1',
        bg: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.2)',
      }
  }
}
