import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, extractErrorMessage } from '../client'
import * as tokenStorage from '../../utils/tokenStorage'

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('attaches Bearer token in request headers when token is stored', () => {
    vi.spyOn(tokenStorage, 'getStoredToken').mockReturnValue('my-secret-token')

    const requestHandler = (apiClient.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }>
    }).handlers[0].fulfilled

    const config = { headers: {} }
    const result = requestHandler(config)

    expect((result.headers as Record<string, string>).Authorization).toBe('Bearer my-secret-token')
  })

  it('handles 401 on protected endpoint by clearing token and firing unauthorized event', async () => {
    const removeSpy = vi.spyOn(tokenStorage, 'removeStoredToken')
    const eventSpy = vi.fn()
    window.addEventListener('requote:unauthorized', eventSpy)

    const responseErrorHandler = (apiClient.interceptors.response as unknown as {
      handlers: Array<{ rejected: (error: Record<string, unknown>) => Promise<unknown> }>
    }).handlers[0].rejected

    const mockError = {
      config: { url: '/quotations' },
      response: { status: 401, data: { detail: 'Token expired' } },
    }

    await expect(responseErrorHandler(mockError)).rejects.toEqual(mockError)
    expect(removeSpy).toHaveBeenCalled()
    expect(eventSpy).toHaveBeenCalled()

    window.removeEventListener('requote:unauthorized', eventSpy)
  })

  it('does NOT fire unauthorized event on 401 from /auth/login (prevents loop on wrong password)', async () => {
    const removeSpy = vi.spyOn(tokenStorage, 'removeStoredToken')
    const eventSpy = vi.fn()
    window.addEventListener('requote:unauthorized', eventSpy)

    const responseErrorHandler = (apiClient.interceptors.response as unknown as {
      handlers: Array<{ rejected: (error: Record<string, unknown>) => Promise<unknown> }>
    }).handlers[0].rejected

    const mockError = {
      config: { url: '/auth/login' },
      response: { status: 401, data: { detail: 'Invalid email or password' } },
    }

    await expect(responseErrorHandler(mockError)).rejects.toEqual(mockError)
    expect(removeSpy).not.toHaveBeenCalled()
    expect(eventSpy).not.toHaveBeenCalled()

    window.removeEventListener('requote:unauthorized', eventSpy)
  })

  it('extracts error messages from various backend responses', () => {
    expect(extractErrorMessage(new Error('Simple error'))).toBe('Simple error')
    expect(extractErrorMessage(null, 'Custom fallback')).toBe('Custom fallback')
  })
})
