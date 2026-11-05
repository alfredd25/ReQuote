/**
 * auth.ts – TypeScript types aligned with FastAPI backend authentication models.
 */

export interface User {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface SignupPayload {
  email: string
  password: string
  full_name?: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ApiValidationErrorItem {
  loc?: (string | number)[]
  msg: string
  type?: string
}

export interface ApiErrorResponse {
  detail?: string | ApiValidationErrorItem[]
}

