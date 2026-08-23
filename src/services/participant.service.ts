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
  email: string;
  phone_number?: string | null;
  university_name?: string | null;
  full_name: string;
  status: ParticipantStatus;
  cccd_number?: string | null;
  cccd_front_url?: string | null;
  cccd_back_url?: string | null;
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
  account_type?: 'dut_student' | 'external';
  email: string;
  phone_number?: string;
  university_name?: string;
  password: string;
  full_name: string;
  cccd_number?: string;
  cccd_front_url?: string;
  cccd_back_url?: string;
  username?: string | null;
  student_id?: string | null;
  class_name?: string | null;
  faculty_name?: string | null;
  student_card_url?: string | null;
  selfie_with_student_card_url?: string | null;
}

export interface SwitchAccountTypePayload {
  target_account_type: 'dut_student' | 'external';
  username?: string | null;
  student_id?: string | null;
  class_name?: string | null;
  faculty_name?: string | null;
  student_card_url?: string | null;
  selfie_with_student_card_url?: string | null;
}

export interface ResubmitPayload {
  full_name?: string;
  phone_number?: string;
  university_name?: string;
  cccd_number?: string;
  cccd_front_url?: string;
  cccd_back_url?: string;
  username?: string | null;
  student_id?: string | null;
  class_name?: string | null;
  faculty_name?: string | null;
  student_card_url?: string | null;
  selfie_with_student_card_url?: string | null;
}

export const participantAPI = {
  /** 1. Đăng ký tài khoản giải đấu (DUT Student hoặc External) */
  async register(data: RegisterParticipantPayload): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/participants/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // Không tự động đăng nhập khi đăng ký để trả người dùng về màn hình đăng nhập
    return res;
  },

  /** 2. Đăng nhập thí sinh bằng Email, MSSV, Username hoặc CCCD */
  async login(login_identifier: string, password: string): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/participants/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_identifier, password }),
    });
    if (res.success && res.token) {
      setAuthToken(res.token);
      const user = res.data || (res as any).user || (res as any).participant;
      if (user) {
        localStorage.setItem('student_user', JSON.stringify(user));
      }
    }
    return res;
  },

  /** 3. Lấy hồ sơ tài khoản hiện tại */
  async getMyProfile(): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/participants/me', { headers: getAuthHeader() });
    if (res.success && res.data) {
      localStorage.setItem('student_user', JSON.stringify(res.data));
    }
    return res;
  },

  /** 4. Chuyển đổi loại tài khoản (Switch Type) */
  async switchAccountType(data: SwitchAccountTypePayload): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/participants/switch-type', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (res.success && res.data) {
      localStorage.setItem('student_user', JSON.stringify(res.data));
    }
    return res;
  },

  /** 5. Cập nhật / nộp lại hồ sơ khi bị từ chối (Re-submit) */
  async resubmit(data: ResubmitPayload): Promise<ApiResponse<ParticipantRow>> {
    const res = await apiRequest<ParticipantRow>('/participants/re-submit', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (res.success && res.data) {
      localStorage.setItem('student_user', JSON.stringify(res.data));
    }
    return res;
  },

  /** 6. Upload ảnh giấy tờ (CCCD, Thẻ sinh viên, Selfie) */
  async uploadDocument(file: File): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/upload/document`, {
        method: 'POST',
        headers: {
          ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}),
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

  /** 7. Admin Kiểm duyệt hồ sơ (Phê duyệt / Từ chối kèm lý do) */
  async review(
    participant_id: string,
    action: 'approve' | 'reject',
    rejection_reason?: string,
  ): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>('/admin/participants/review', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ participant_id, action, rejection_reason }),
    });
  },

  /** 8. Lấy danh sách participants cho Admin (hỗ trợ lọc status, type, search) */
  async getAll(
    search = '',
    accountTypeFilter = 'all',
    statusFilter = 'all',
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<ParticipantRow[]> & { pagination?: Pagination }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (accountTypeFilter !== 'all') params.append('account_type', accountTypeFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    params.append('page', String(page));
    params.append('limit', String(limit));

    return apiRequest<ParticipantRow[]>(`/admin/participants?${params.toString()}`, { headers: getAuthHeader() });
  },

  /** 9. Lấy chi tiết thí sinh theo ID */
  async getById(id: string): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}`, { headers: getAuthHeader() });
  },

  /** 10. Tạo thí sinh mới (Admin) */
  async create(data: Partial<ParticipantRow> & { password?: string }): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>('/admin/participants', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
  },

  /** 11. Cập nhật thông tin thí sinh (Admin) */
  async update(id: string, data: Partial<ParticipantRow> & { password?: string }): Promise<ApiResponse<ParticipantRow>> {
    return apiRequest<ParticipantRow>(`/admin/participants/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
  },

  /** 12. Xóa thí sinh */
  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/admin/participants/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },
};

