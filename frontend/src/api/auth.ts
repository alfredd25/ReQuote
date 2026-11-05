/**
 * auth.ts – Authentication API calls using the centralized client.
 */

import { apiClient, extractErrorMessage } from './client'
import {
  LoginPayload,
  SignupPayload,
  TokenResponse,
  User,
} from '../types/auth'

export const authApi = {
  /**
   * Register a new user account.
   */
  async signup(payload: SignupPayload): Promise<User> {
    const response = await apiClient.post<User>('/auth/signup', payload)
    return response.data
  },

  /**
   * Authenticate user credentials and retrieve a JWT token.
   */
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/login', payload)
    return response.data
  },

  /**
   * Retrieve current user profile using the stored Bearer token.
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  },
}

export { extractErrorMessage }

