/**
 * AuthContext.tsx – Global Authentication Context and useAuth hook.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  FC,
  ReactNode,
} from 'react'
import { authApi, extractErrorMessage } from '../api/auth'
import {
  LoginPayload,
  SignupPayload,
  TokenResponse,
  User,
} from '../types/auth'
import {
  getStoredToken,
  removeStoredToken,
  setStoredToken,
} from '../utils/tokenStorage'

export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginPayload) => Promise<TokenResponse>
  signup: (payload: SignupPayload) => Promise<User>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const logout = useCallback(() => {
    removeStoredToken()
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  // Hydrate user session on mount if token is found
  useEffect(() => {
    let isMounted = true
    const initAuth = async () => {
      const stored = getStoredToken()
      if (!stored) {
        if (isMounted) {
          setIsLoading(false)
        }
        return
      }

      try {
        const currentUser = await authApi.getMe()
        if (isMounted) {
          setUser(currentUser)
          setToken(stored)
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Session restoration failed; clearing stored token.', err)
          removeStoredToken()
          setToken(null)
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    // Listen for unauthorized events emitted by client interceptor
    const handleUnauthorized = () => {
      if (isMounted) {
        logout()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('requote:unauthorized', handleUnauthorized)
    }

    return () => {
      isMounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('requote:unauthorized', handleUnauthorized)
      }
    }
  }, [logout])

  const login = useCallback(
    async (credentials: LoginPayload): Promise<TokenResponse> => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await authApi.login(credentials)
        setStoredToken(data.access_token)
        setToken(data.access_token)
        setUser(data.user)
        return data
      } catch (err) {
        const message = extractErrorMessage(err, 'Failed to log in.')
        setError(message)
        throw new Error(message)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const signup = useCallback(
    async (payload: SignupPayload): Promise<User> => {
      setIsLoading(true)
      setError(null)
      try {
        const newUser = await authApi.signup(payload)
        return newUser
      } catch (err) {
        const message = extractErrorMessage(err, 'Registration failed.')
        setError(message)
        throw new Error(message)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      error,
      login,
      signup,
      logout,
      clearError,
    }),
    [user, token, isLoading, error, login, signup, logout, clearError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth hook for accessing authentication state and actions.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
