import { apiClient } from '@/lib/api-client';
import type { AdminStats, Pagination, SafeUser, UserRole } from '@/types';
import type { CreateUserPayload, CtvRow, UpdateUserPayload, UserRow } from '../types';

/**
 * API admin — gom admin.service + user.service + ctv.service (mới).
 */
export const adminApi = {
  // ---------- Stats ----------
  getStats: () => apiClient<AdminStats>('/admin/stats'),

  // ---------- Users ----------
  getUsers: (query: { search?: string; role?: UserRole | 'all'; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.role && query.role !== 'all') params.append('role', query.role);
    params.append('page', String(query.page ?? 1));
    params.append('limit', String(query.limit ?? 10));
    const qs = params.toString();
    return apiClient<UserRow[]>(`/admin/users${qs ? `?${qs}` : ''}`);
  },

  getUser: (id: string) => apiClient<UserRow>(`/admin/users/${id}`),

  createUser: (payload: CreateUserPayload) =>
    apiClient<UserRow>('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),

  updateUser: (id: string, payload: UpdateUserPayload) =>
    apiClient<UserRow>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  updateUserStatus: (id: string, is_active: boolean) =>
    apiClient<UserRow>(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),

  deleteUser: (id: string) => apiClient<void>(`/admin/users/${id}`, { method: 'DELETE' }),

  // ---------- CTVs ----------
  getCtvs: (query: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.status && query.status !== 'all') params.append('status', query.status);
    params.append('page', String(query.page ?? 1));
    params.append('limit', String(query.limit ?? 10));
    const qs = params.toString();
    return apiClient<CtvRow[]>(`/admin/ctvs${qs ? `?${qs}` : ''}`);
  },

  getCtv: (id: string) => apiClient<CtvRow>(`/admin/ctvs/${id}`),

  createCtv: (payload: { email: string; password: string; full_name: string }) =>
    apiClient<CtvRow>('/admin/ctvs', { method: 'POST', body: JSON.stringify(payload) }),

  updateCtv: (id: string, payload: { email: string; full_name: string; password?: string; is_active?: boolean }) =>
    apiClient<CtvRow>(`/admin/ctvs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  updateCtvStatus: (id: string, is_active: boolean) =>
    apiClient<CtvRow>(`/admin/ctvs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),

  deleteCtv: (id: string) => apiClient<void>(`/admin/ctvs/${id}`, { method: 'DELETE' }),
};

/** Helper đọc pagination từ ApiResponse — backend trả pagination ở field riêng. */
export function extractPagination(res: { pagination?: Pagination }): Pagination {
  return res.pagination ?? { total: 0, page: 1, limit: 10, pages: 1 };
}

// Dùng cho các chỗ cần SafeUser trực tiếp (login flow admin dùng auth feature)
export type { SafeUser };
