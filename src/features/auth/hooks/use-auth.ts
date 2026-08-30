'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '../api/auth-api';
import type { LoginPayload, StudentLoginPayload, StudentRegisterPayload } from '../types';

/** Query keys tập trung — giúp invalidation đúng chỗ. */
export const authKeys = {
  me: ['auth', 'me'] as const,
};

/** Lấy thông tin user hiện tại (chỉ chạy khi có token). */
export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled: Boolean(token),
    retry: false,
  });
}

function useSessionSetters() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  return { setSession, clearSession };
}

/** Đăng nhập admin/CTV. */
export function useLogin() {
  const queryClient = useQueryClient();
  const { setSession, clearSession } = useSessionSetters();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (res) => {
      if (res.token) {
        setSession(res.user ?? null, res.token);
        queryClient.setQueryData(authKeys.me, res);
      } else {
        clearSession();
      }
    },
  });
}

/** Đăng nhập sinh viên (MSSV). */
export function useStudentLogin() {
  const queryClient = useQueryClient();
  const { setSession } = useSessionSetters();

  return useMutation({
    mutationFn: (payload: StudentLoginPayload) => authApi.studentLogin(payload),
    onSuccess: (res) => {
      if (res.token) {
        setSession(res.user ?? null, res.token);
        queryClient.setQueryData(authKeys.me, res);
      }
    },
  });
}

/** Đăng ký sinh viên. */
export function useStudentRegister() {
  const { setSession } = useSessionSetters();

  return useMutation({
    mutationFn: (payload: StudentRegisterPayload) => authApi.studentRegister(payload),
    onSuccess: (res) => {
      if (res.token) setSession(res.user ?? null, res.token);
    },
  });
}

/** Đăng xuất — xoá session + clear query cache liên quan auth. */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);

  return () => {
    clearSession();
    queryClient.removeQueries({ queryKey: authKeys.me });
  };
}
