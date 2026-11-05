import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
} from '../tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no token is in localStorage', () => {
    expect(getStoredToken()).toBeNull()
  })

  it('sets and retrieves token correctly', () => {
    setStoredToken('test-access-token-123')
    expect(getStoredToken()).toBe('test-access-token-123')
  })

  it('removes token from localStorage', () => {
    setStoredToken('test-access-token-123')
    removeStoredToken()
    expect(getStoredToken()).toBeNull()
  })
})

