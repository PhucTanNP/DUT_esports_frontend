import type { ApiResponse, Pagination, ParticipantAccountType, ParticipantStatus } from '../types';
import { apiRequest, API_BASE, getAuthHeader, setAuthToken } from './http';

export const UNIVERSITIES = [
  'Trường Đại học Bách khoa - ĐHĐN (DUT)',
  'Trường Đại học Kinh tế - ĐHĐN (DUE)',
  'Trường Đại học Ngoại ngữ - ĐHĐN (UFL)',
  'Trường Đại học Sư phạm - ĐHĐN (UED)',
  'Trường Đại học Sư phạm Kỹ thuật - ĐHĐN (UTE)',
  'Trường Đại học CNTT & Truyền thông Việt – Hàn - ĐHĐN (VKU)',
  'Viện Nghiên cứu & Đào tạo Việt – Anh (VNUK)',
  'Trường Y Dược – Đại học Đà Nẵng',
  'Đại học Kỹ thuật Y Dược Đà Nẵng (YDN)',
  'Trường Đại học Thể dục Thể thao Đà Nẵng',
  'Trường Đại học FPT Đà Nẵng',
] as const;

export interface ParticipantRow {
  id: string;
  account_type: ParticipantAccountType;
  email: string | null;
  phone_number?: string | null;
  phone?: string | null;
  university_name?: string | null;
  full_name: string;
  status: ParticipantStatus;
  username?: string | null;
  student_id?: string | null;
  class_name?: string | null;
  faculty_name?: string | null;
  faculty?: string | null;
  student_card_url?: string | null;
  selfie_with_student_card_url?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RegisterParticipantPayload {
  account_type?: 'internal' | 'external' | 'dut_student';
  email?: string;
  phone_number?: string;
  university_name?: string;
  password: string;
  full_name: string;
  username?: string | null;
  student_id?: string | null;
  class_name?: string | null;
  faculty_name?: string | null;
  student_card_url?: string | null;
  selfie_with_student_card_url?: string | null;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone_number?: string;
  class_name?: string;
  faculty_name?: string;
  old_password?: string;
  password?: string;
}

export interface ResubmitPayload {
  identifier?: string;
  password?: string;
  full_name?: string;
  phone_number?: string;
  university_name?: string;
  username?: string | null;
  student_id?: string | null;
  class_name?: string | null;
  faculty_name?: string | null;
  student_card_url?: string | null;
  selfie_with_student_card_url?: string | null;
  new_password?: string;
}

export const participantAPI = {
  /** 1. [SV-01] Đăng ký tài khoản sinh viên (KYC 2 ảnh thẻ SV) */
  async register(data: RegisterParticipantPayload): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/auth/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.success && res.token) {
      setAuthToken(res.token);
      const user = res.data || res.participant || (res as any).user;
      if (user) {
        localStorage.setItem('student_user', JSON.stringify(user));
      }
    }
    return res;
  },

  /** 2. [SV-02] Đăng nhập sinh viên (Email / MSSV / Username) */
  async login(login_identifier: string, password: string): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/auth/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_identifier, password }),
    });
    if (res.success && res.token) {
      setAuthToken(res.token);
      const user = res.data || res.participant || (res as any).user;
      if (user) {
        localStorage.setItem('student_user', JSON.stringify(user));
      }
    }
    return res;
  },

  /** 3. [SV-03] Lấy hồ sơ tài khoản hiện tại */
  async getMyProfile(): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/auth/participant/me', { headers: getAuthHeader() });
    if (res.success && res.data) {
      localStorage.setItem('student_user', JSON.stringify(res.data));
    }
    return res;
  },

  /** 4. [SV-03] Cập nhật hồ sơ cá nhân */
  async updateProfile(data: UpdateProfilePayload): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/auth/participant/profile', {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (res.success && res.data) {
      localStorage.setItem('student_user', JSON.stringify(res.data));
    }
    return res;
  },

  /** 5. [SV-04] Cập nhật / nộp lại hồ sơ khi bị từ chối (Re-submit) */
  async resubmit(data: ResubmitPayload): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/auth/participant/resubmit', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (res.success && res.data) {
      localStorage.setItem('student_user', JSON.stringify(res.data));
    }
    return res;
  },

  /** Chuyển đổi loại tài khoản (Switch Type) */
  async switchAccountType(data: {
    target_account_type: 'internal' | 'external' | 'dut_student';
    username?: string | null;
    student_id?: string | null;
    class_name?: string | null;
    faculty_name?: string | null;
    student_card_url?: string | null;
    selfie_with_student_card_url?: string | null;
  }): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/auth/participant/resubmit', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (res.success && res.data) {
      localStorage.setItem('student_user', JSON.stringify(res.data));
    }
    return res;
  },

  /** 6. Upload ảnh thẻ sinh viên xác thực (SV-01, SV-04) */
  async uploadDocument(file: File): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`${API_BASE}/upload/document`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.url) {
        return { success: true, url: json.url };
      }
      return { success: false, message: json.message || 'Tải ảnh lên thất bại' };
    } catch (err) {
      return { success: false, message: 'Lỗi tải ảnh: ' + (err as Error).message };
    }
  },

  /** 7. [AD-01] Lấy danh sách participants cho Admin */
  async getAll(
    search = '',
    accountTypeFilter = 'all',
    statusFilter = 'all',
    facultyFilter = 'all',
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<ParticipantRow[]> & { pagination?: Pagination }> {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (accountTypeFilter !== 'all') params.append('account_type', accountTypeFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (facultyFilter !== 'all') params.append('faculty', facultyFilter);
    params.append('page', String(page));
    params.append('limit', String(limit));

    return apiRequest<ParticipantRow[]>(`/admin/participants?${params.toString()}`, { headers: getAuthHeader() });
  },

  /** 8. [AD-01] Lấy chi tiết thí sinh theo ID kèm 2 ảnh KYC */
  async getById(id: string): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}`, { headers: getAuthHeader() });
  },

  /** 9. [AD-02] Phê duyệt hồ sơ KYC */
  async approve(id: string): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
  },

  /** 10. [AD-02] Từ chối hồ sơ KYC kèm lý do */
  async reject(id: string, rejection_reason: string): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}/reject`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rejection_reason }),
    });
  },

  /** 11. [AD-01] Khóa / Mở khóa / Đổi trạng thái tài khoản */
  async updateStatus(id: string, status: ParticipantStatus, rejection_reason?: string): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}/status`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, rejection_reason }),
    });
  },

  /** 12. Helper review tổng hợp */
  async review(
    participant_id: string,
    action: 'approve' | 'reject',
    rejection_reason?: string,
  ): Promise<ApiResponse<ParticipantRow>> {
    if (action === 'approve') {
      return this.approve(participant_id);
    } else {
      return this.reject(participant_id, rejection_reason || 'Ảnh thẻ sinh viên không hợp lệ.');
    }
  },

  /** 13. Tạo thí sinh mới (Admin) */
  async create(data: Partial<ParticipantRow> & { password?: string }): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>('/admin/participants', {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /** 14. Cập nhật thông tin thí sinh (Admin) */
  async update(id: string, data: Partial<ParticipantRow> & { password?: string }): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /** 15. Xóa thí sinh */
  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/admin/participants/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },
};
