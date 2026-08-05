import type { AdminStats, ApiResponse } from '../types';
import { apiRequest, getAuthHeader } from './http';

export const adminAPI = {
  async getStats(): Promise<ApiResponse<AdminStats>> {
    return apiRequest<AdminStats>('/admin/stats', { headers: getAuthHeader() });
  },
};
