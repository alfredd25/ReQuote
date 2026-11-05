/**
 * client.ts – Centralized Axios HTTP client for ReQuote.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { ApiErrorResponse } from '../types/auth'
import { getStoredToken, removeStoredToken } from '../utils/tokenStorage'

// Base URL defaults to '/api' (proxied by Vite dev server or Nginx in container)
// or can be overridden via VITE_API_URL environment variable.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Request interceptor: attach Bearer token if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 without infinite loops
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const requestUrl = error.config?.url || ''
    // Exclude /auth/login and /auth/signup from triggering global session-clearing events,
    // so failed credential submissions display normal form errors rather than redirecting/looping.
    const isLoginOrSignup =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/signup')

    if (error.response?.status === 401 && !isLoginOrSignup) {
      // Clear expired / invalid / revoked token
      removeStoredToken()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('requote:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Extracts a human-readable error message from an API error.
 */
export function extractErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined
    if (data?.detail) {
      if (typeof data.detail === 'string') {
        return data.detail
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail.map((d) => d.msg).join(', ')
      }
    }

    if (error.response?.status === 401) {
      return 'Invalid email or password.'
    }
    if (error.response?.status === 409) {
      return 'An account with this email address already exists.'
    }
    if (error.response?.status === 403) {
      return 'Access denied or account is inactive.'
    }
    if (error.response?.status === 404) {
      return 'Requested resource not found.'
    }
    if (error.response?.status && error.response.status >= 500) {
      return 'Server error. Please try again later.'
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your connection.'
    }
    if (error.message === 'Network Error') {
      return 'Cannot reach the server. Please verify your internet or backend status.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}
