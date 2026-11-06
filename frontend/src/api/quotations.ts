/**
 * quotations.ts – API client methods for quotation management.
 */

import { apiClient } from './client'
import {
  QuotationCreate,
  QuotationListResponse,
  QuotationResponse,
  QuotationStatus,
  QuotationUpdate,
} from '../types/quotation'

export const quotationsApi = {
  /**
   * Retrieve a paginated list of quotations for the authenticated user.
   */
  async listQuotations(params?: {
    page?: number
    page_size?: number
  }): Promise<QuotationListResponse> {
    const response = await apiClient.get<QuotationListResponse>('/quotations', {
      params,
    })
    return response.data
  },

  /**
   * Create a new quotation with line items.
   * Calculations (subtotal, tax, total) are authoritative on the backend.
   */
  async createQuotation(payload: QuotationCreate): Promise<QuotationResponse> {
    const response = await apiClient.post<QuotationResponse>(
      '/quotations',
      payload
    )
    return response.data
  },

  /**
   * Retrieve a single quotation by UUID.
   */
  async getQuotation(id: string): Promise<QuotationResponse> {
    const response = await apiClient.get<QuotationResponse>(`/quotations/${id}`)
    return response.data
  },

  /**
   * Update an existing quotation and replace its line items.
   * Calculations are recalculated server-side with Decimal arithmetic.
   */
  async updateQuotation(
    id: string,
    payload: QuotationUpdate
  ): Promise<QuotationResponse> {
    const response = await apiClient.put<QuotationResponse>(
      `/quotations/${id}`,
      payload
    )
    return response.data
  },

  /**
   * Delete a quotation and its line items.
   */
  async deleteQuotation(id: string): Promise<void> {
    await apiClient.delete(`/quotations/${id}`)
  },

  /**
   * Transition quotation to a new lifecycle status.
   */
  async updateQuotationStatus(
    id: string,
    status: QuotationStatus
  ): Promise<QuotationResponse> {
    const response = await apiClient.patch<QuotationResponse>(
      `/quotations/${id}/status`,
      { status }
    )
    return response.data
  },
}
