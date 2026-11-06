/**
 * quotation.ts – TypeScript types for Quotations and Quotation Items.
 * Aligned with FastAPI Pydantic schemas in backend/app/schemas/quotation.py
 * and SQLAlchemy model rules in backend/app/models/quotation.py.
 */

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled'

export const VALID_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['accepted', 'rejected', 'expired', 'cancelled', 'draft'],
  expired: ['draft', 'cancelled'],
  rejected: ['draft', 'cancelled'],
  accepted: [],
  cancelled: [],
}

export interface QuotationItemCreate {
  description: string
  unit?: string | null
  quantity: number | string
  unit_price: number | string
  position?: number | null
}

export interface QuotationItemResponse {
  id: string
  quotation_id: string
  position: number
  description: string
  unit: string | null
  quantity: string
  unit_price: string
  line_total: string
  created_at: string
  updated_at: string
}

export interface QuotationCreate {
  title: string
  description?: string | null
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  customer_company?: string | null
  customer_address?: string | null
  currency?: string
  tax_rate?: number | string
  notes?: string | null
  terms_and_conditions?: string | null
  quotation_number?: string | null
  items: QuotationItemCreate[]
}

export interface QuotationUpdate {
  title?: string | null
  description?: string | null
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  customer_company?: string | null
  customer_address?: string | null
  currency?: string | null
  tax_rate?: number | string | null
  notes?: string | null
  terms_and_conditions?: string | null
  items?: QuotationItemCreate[] | null
}

export interface QuotationStatusUpdate {
  status: QuotationStatus
}

export interface QuotationResponse {
  id: string
  user_id: string
  quotation_number: string
  title: string
  description: string | null
  status: QuotationStatus
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  customer_company: string | null
  customer_address: string | null
  currency: string
  subtotal: string
  tax_rate: string
  tax_amount: string
  total_amount: string
  notes: string | null
  terms_and_conditions: string | null
  created_at: string
  updated_at: string
  items: QuotationItemResponse[]
}

export interface QuotationListResponse {
  items: QuotationResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
