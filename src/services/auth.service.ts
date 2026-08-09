import type { ApiResponse, SafeUser } from '../types';
import { apiRequest, getAuthHeader, removeAuthToken, setAuthToken } from './http';

// Re-export token helpers để component import trực tiếp từ service này
export { getAuthToken, removeAuthToken } from './http';

export const extractUserFromResponse = (response: ApiResponse<unknown>): SafeUser | null => {
  const payload = response as ApiResponse<unknown>;
  const candidates: unknown[] = [
    payload.user,
    (payload.data as { user?: SafeUser } | undefined)?.user,
    (payload.data as { participant?: SafeUser } | undefined)?.participant,
    (payload.data as { student?: SafeUser } | undefined)?.student,
    (payload.data as { profile?: SafeUser } | undefined)?.profile,
    payload.data,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;

    const maybeUser = candidate as Partial<SafeUser>;
    if (maybeUser.full_name || maybeUser.student_id || maybeUser.id || maybeUser.username) {
      return maybeUser as SafeUser;
    }
  }

  return null;
};

const persistStudentUser = (user: SafeUser | null) => {
  if (!user) return;
  localStorage.setItem('student_user', JSON.stringify(user));
};

const extractTokenFromResponse = (response: ApiResponse<unknown>): string | null => {
  const payload = response as ApiResponse<any>;
  if (typeof payload.token === 'string' && payload.token) return payload.token;
  const data = payload.data as any;
  if (!data) return null;
  return data.token || data.access_token || data.accessToken || data.auth_token || null;
};

export const authAPI = {
  async login(email: string, password: string): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const token = extractTokenFromResponse(response);
    if (response.success && token) {
      setAuthToken(token);
      localStorage.setItem('admin_user', JSON.stringify(response.user ?? response.data ?? {}));
    }
    return response;
  },

  logout(): void {
    removeAuthToken();
    localStorage.removeItem('admin_user');
    localStorage.removeItem('student_user');
  },

  async getCurrentUser(): Promise<ApiResponse<SafeUser>> {
    return apiRequest<SafeUser>('/auth/me', { headers: getAuthHeader() });
  },

  async getCurrentStudentProfile(): Promise<ApiResponse<SafeUser>> {
    try {
      // Gọi ĐÚNG đường dẫn dành cho participant (Nhớ đảm bảo backend cũng khai báo đúng URL này)
      const response = await apiRequest<unknown>('/auth/participant/me', { headers: getAuthHeader() });

      // Nếu API trả về lỗi (ví dụ 401, 403, 404)
      if ((response as any).success === false) {
        return response as ApiResponse<SafeUser>;
      }

      const user = extractUserFromResponse(response as ApiResponse<unknown>);
      if (user) {
        persistStudentUser(user);
        return { ...(response as object), success: true, user } as ApiResponse<SafeUser>;
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin profile:", error);
    }

    return { success: false, message: 'Không thể lấy thông tin người dùng từ hệ thống.' };
  },
  async register(email: string, password: string, full_name: string): Promise<ApiResponse<SafeUser>> {
    return apiRequest<SafeUser>('/auth/register', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ email, password, full_name }),
    });
  },

  async freeRegister(data: {
    username: string;
    password: string;
    full_name: string;
  }): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/free/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const user = extractUserFromResponse(response);
    if (response.success) {
      const token = extractTokenFromResponse(response);
      if (token) setAuthToken(token);
      persistStudentUser(user);
    }
    return response;
  },

  // ===========================
  // SINH VIÊN (mã số sinh viên)
  // ===========================

  /** Đăng ký tài khoản sinh viên bằng MSSV. */
  async studentRegister(data: {
    student_id: string;
    password: string;
    full_name: string;
    email?: string;
    phone?: string;
    faculty?: string;
    class_name?: string;
    course?: string;
  }): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const user = extractUserFromResponse(response);
    if (response.success) {
      const token = extractTokenFromResponse(response);
      if (token) setAuthToken(token);
      persistStudentUser(user);
    }
    return response;
  },

  /** Đăng nhập sinh viên bằng MSSV + mật khẩu. */
  async studentLogin(student_id: string, password: string): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, password }),
    });
    const user = extractUserFromResponse(response);
    if (response.success) {
      const token = extractTokenFromResponse(response);
      if (token) setAuthToken(token);
      persistStudentUser(user);
    }
    return response;
  },
};
