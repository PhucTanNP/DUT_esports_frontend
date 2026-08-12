import type { ApiResponse, Pagination } from '../types';
import { apiRequest, getAuthHeader } from './http';

export interface ParticipantRow {
  id: string;
  account_type: 'dut' | 'free';
  username: string;
  full_name: string;
  class_name: string | null;
  faculty_name: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateParticipantData {
  account_type: 'dut' | 'free';
  username: string;
  full_name: string;
  class_name?: string;
  faculty_name?: string;
  password?: string;
}

export interface UpdateParticipantData {
  account_type?: 'dut' | 'free';
  username?: string;
  full_name?: string;
  class_name?: string;
  faculty_name?: string;
  password?: string;
}

export const participantAPI = {
  /** Lấy danh sách người dùng (participants) với tìm kiếm, lọc loại tài khoản và phân trang */
  async getAll(
    search = '',
    accountTypeFilter = 'all', // 'all' | 'dut' | 'free'
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<ParticipantRow[]> & { pagination?: Pagination }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (accountTypeFilter !== 'all') params.append('account_type', accountTypeFilter);
    params.append('page', String(page));
    params.append('limit', String(limit));

    return apiRequest<ParticipantRow[]>(`/admin/participants?${params.toString()}`, { headers: getAuthHeader() });
  },

  /** Lấy chi tiết người dùng theo ID */
  async getById(id: string): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}`, { headers: getAuthHeader() });
  },

  /** Tạo người dùng mới */
  async create(data: CreateParticipantData): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>('/admin/participants', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
  },

  /** Cập nhật thông tin người dùng */
  async update(id: string, data: UpdateParticipantData): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
  },

  /** Xóa người dùng */
  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/admin/participants/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },
};

