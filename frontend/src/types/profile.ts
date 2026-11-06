/**
 * profile.ts – TypeScript types for Business Profile & Settings.
 */

export interface BusinessProfile {
  id: string | null
  user_id: string
  business_name: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  logo_url: string | null
  tax_id: string | null
  default_currency: string
  default_notes: string | null
  default_terms: string | null
  created_at: string | null
  updated_at: string | null
}

export interface BusinessProfileUpdate {
  business_name?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  logo_url?: string | null
  tax_id?: string | null
  default_currency?: string
  default_notes?: string | null
  default_terms?: string | null
}

