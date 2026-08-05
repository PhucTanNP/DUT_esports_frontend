import type { ApiResponse, Pagination, SafeUser } from '../types';
import { apiRequest, getAuthHeader } from './http';

export interface CtvRow extends SafeUser {
  created_at?: string;
  updated_at?: string;
}

export const ctvAPI = {
  async getAll(
    search = '',
    status = 'all',
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<CtvRow[]> & { pagination?: Pagination }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status !== 'all') params.append('status', status);
    params.append('page', String(page));
    params.append('limit', String(limit));
    return apiRequest<CtvRow[]>(`/admin/ctvs?${params}`, { headers: getAuthHeader() });
  },

  async getById(id: string): Promise<ApiResponse<CtvRow>> {
    return apiRequest<CtvRow>(`/admin/ctvs/${id}`, { headers: getAuthHeader() });
  },

  async create(email: string, password: string, full_name: string): Promise<ApiResponse<CtvRow>> {
    return apiRequest<CtvRow>('/admin/ctvs', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ email, password, full_name }),
    });
  },

  async update(
    id: string,
    email: string,
    full_name: string,
    password?: string,
    is_active?: boolean,
  ): Promise<ApiResponse<CtvRow>> {
    const body: Record<string, unknown> = { email, full_name, is_active };
    if (password) body.password = password;
    return apiRequest<CtvRow>(`/admin/ctvs/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(body),
    });
  },

  async updateStatus(id: string, is_active: boolean): Promise<ApiResponse<CtvRow>> {
    return apiRequest<CtvRow>(`/admin/ctvs/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ is_active }),
    });
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/admin/ctvs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },
};
