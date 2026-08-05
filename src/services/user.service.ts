import type { ApiResponse, Pagination, SafeUser, UserRole } from '../types';
import { apiRequest, getAuthHeader } from './http';

export interface UserRow extends SafeUser {
  created_at?: string;
  updated_at?: string;
}

export const userAPI = {
  async getAll(
    search = '',
    role: UserRole | 'all' = 'all',
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<UserRow[]> & { pagination?: Pagination }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role !== 'all') params.append('role', role);
    params.append('page', String(page));
    params.append('limit', String(limit));
    return apiRequest<UserRow[]>(`/admin/users?${params}`, { headers: getAuthHeader() });
  },

  async getById(id: string): Promise<ApiResponse<UserRow>> {
    return apiRequest<UserRow>(`/admin/users/${id}`, { headers: getAuthHeader() });
  },

  async create(email: string, password: string, full_name: string, role: UserRole = 'ctv'): Promise<ApiResponse<UserRow>> {
    return apiRequest<UserRow>('/admin/users', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ email, password, full_name, role }),
    });
  },

  async update(
    id: string,
    email: string,
    full_name: string,
    password: string | undefined,
    role: UserRole,
    is_active: boolean,
  ): Promise<ApiResponse<UserRow>> {
    const body: Record<string, unknown> = { email, full_name, role, is_active };
    if (password) body.password = password;
    return apiRequest<UserRow>(`/admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(body),
    });
  },

  async updateStatus(id: string, is_active: boolean): Promise<ApiResponse<UserRow>> {
    return apiRequest<UserRow>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ is_active }),
    });
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },
};
