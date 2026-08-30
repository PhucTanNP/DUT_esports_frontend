import { apiClient } from '@/lib/api-client';
import type { SafeUser } from '@/types';
import type { LoginPayload, StudentLoginPayload, StudentRegisterPayload } from '../types';

/**
 * API auth — tương đương services/auth.service.ts (mới).
 * Khác biệt: dùng apiClient tập trung, không tự ghi localStorage ở đây
 * (việc lưu session do auth-store + hooks đảm nhiệm).
 */
export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient<SafeUser>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  register: (payload: { email: string; password: string; full_name: string }) =>
    apiClient<SafeUser>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  studentLogin: (payload: StudentLoginPayload) =>
    apiClient<SafeUser>('/auth/student/login', { method: 'POST', body: JSON.stringify(payload) }),

  studentRegister: (payload: StudentRegisterPayload) =>
    apiClient<SafeUser>('/auth/student/register', { method: 'POST', body: JSON.stringify(payload) }),

  me: () => apiClient<SafeUser>('/auth/me'),
};
