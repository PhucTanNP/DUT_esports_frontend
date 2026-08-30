'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui-store';
import { adminApi, extractPagination } from '../api/admin-api';
import { adminKeys } from './use-stats';

interface CtvQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/** Danh sách CTV (có search, filter status, pagination). */
export function useCtvs(query: CtvQuery = {}) {
  return useQuery({
    queryKey: adminKeys.ctvList(query),
    queryFn: async () => {
      const res = await adminApi.getCtvs(query);
      return { rows: res.data ?? [], pagination: extractPagination(res) };
    },
  });
}

/** Tạo CTV mới. */
export function useCreateCtv() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  return useMutation({
    mutationFn: (payload: { email: string; password: string; full_name: string }) =>
      adminApi.createCtv(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ctvs });
    },
    onError: (err) => {
      pushToast('error', err instanceof Error ? err.message : 'Tạo CTV thất bại');
    },
  });
}

/** Cập nhật CTV. */
export function useUpdateCtv() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { email: string; full_name: string; password?: string; is_active?: boolean };
    }) => adminApi.updateCtv(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ctvs });
    },
    onError: (err) => {
      pushToast('error', err instanceof Error ? err.message : 'Cập nhật CTV thất bại');
    },
  });
}

/** Bật/tắt CTV. */
export function useToggleCtvStatus() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateCtvStatus(id, is_active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ctvs });
    },
    onError: (err) => {
      pushToast('error', err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại');
    },
  });
}

/** Xoá CTV. */
export function useDeleteCtv() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteCtv(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ctvs });
    },
    onError: (err) => {
      pushToast('error', err instanceof Error ? err.message : 'Xoá CTV thất bại');
    },
  });
}
