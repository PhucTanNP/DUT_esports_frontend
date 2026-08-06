import type { ApiResponse, SafeUser } from '../types';
import { apiRequest, getAuthHeader, removeAuthToken, setAuthToken } from './http';

// Re-export token helpers để component import trực tiếp từ service này
export { getAuthToken, removeAuthToken } from './http';

export const authAPI = {
  async login(email: string, password: string): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.token) {
      setAuthToken(response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.user));
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
    const response = await apiRequest<SafeUser>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.success && response.token) {
      setAuthToken(response.token);
      localStorage.setItem('student_user', JSON.stringify(response.user));
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
    if (response.success && response.token) {
      setAuthToken(response.token);
      localStorage.setItem('student_user', JSON.stringify(response.user));
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
    if (response.success && response.token) {
      setAuthToken(response.token);
      localStorage.setItem('student_user', JSON.stringify(response.user));
    }
    return response;
  },
};
