/**
 * profile.ts – API client for Business Profile & Settings endpoints.
 */

import { apiClient } from './client'
import { BusinessProfile, BusinessProfileUpdate } from '../types/profile'

export const profileApi = {
  /**
   * Retrieve authenticated user's business profile.
   */
  async getBusinessProfile(): Promise<BusinessProfile> {
    const response = await apiClient.get<BusinessProfile>('/profile')
    return response.data
  },

  /**
   * Create or update authenticated user's business profile.
   */
  async updateBusinessProfile(
    payload: BusinessProfileUpdate
  ): Promise<BusinessProfile> {
    const response = await apiClient.put<BusinessProfile>('/profile', payload)
    return response.data
  },
}

