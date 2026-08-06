'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@/types';
import { useUiStore } from '@/stores/ui-store';
import { adminApi, extractPagination } from '../api/admin-api';
import { adminKeys } from './use-stats';
import type { CreateUserPayload, UpdateUserPayload } from '../types';

interface UserQuery {
  search?: string;
  role?: UserRole | 'all';
  page?: number;
  limit?: number;
}

/** Danh sách user (có search, filter role, pagination). */
export function useUsers(query: UserQuery = {}) {
  return useQuery({
    queryKey: adminKeys.userList(query),
    queryFn: async () => {
      const res = await adminApi.getUsers(query);
      return { rows: res.data ?? [], pagination: extractPagination(res) };
    },
  });
}

function useUserMutations() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: adminKeys.users });

  const handleError = (err: unknown) => {
    pushToast('error', err instanceof Error ? err.message : 'Có lỗi xảy ra');
  };

  return { invalidate, handleError };
}

/** Tạo user mới. */
export function useCreateUser() {
  const { invalidate, handleError } = useUserMutations();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => adminApi.createUser(payload),
    onSuccess: invalidate,
    onError: handleError,
  });
}

/** Cập nhật user. */
export function useUpdateUser() {
  const { invalidate, handleError } = useUserMutations();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      adminApi.updateUser(id, payload),
    onSuccess: invalidate,
    onError: handleError,
  });
}

/** Bật/tắt user. */
export function useToggleUserStatus() {
  const { invalidate, handleError } = useUserMutations();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateUserStatus(id, is_active),
    onSuccess: invalidate,
    onError: handleError,
  });
}

/** Xoá user. */
export function useDeleteUser() {
  const { invalidate, handleError } = useUserMutations();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: invalidate,
    onError: handleError,
  });
}
