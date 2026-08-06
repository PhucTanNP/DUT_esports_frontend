'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui-store';
import { registrationApi } from '../api/registration-api';
import { tournamentApi } from '../api/tournament-api';
import type { TournamentPayload, TournamentQuery } from '../types';

/** Query keys tập trung cho toàn bộ feature tournaments. */
export const tournamentKeys = {
  all: ['tournaments'] as const,
  lists: () => [...tournamentKeys.all, 'list'] as const,
  list: (query: TournamentQuery) => [...tournamentKeys.lists(), query] as const,
  details: () => [...tournamentKeys.all, 'detail'] as const,
  detail: (id: string | undefined) => [...tournamentKeys.details(), id] as const,
  registrations: (id: string) => [...tournamentKeys.all, 'registrations', id] as const,
};

/** Danh sách giải đấu (có search + status). */
export function useTournaments(query: TournamentQuery = {}) {
  return useQuery({
    queryKey: tournamentKeys.list(query),
    queryFn: () => tournamentApi.getAll(query),
  });
}

/** Chi tiết 1 giải đấu. */
export function useTournament(id: string | undefined) {
  return useQuery({
    queryKey: tournamentKeys.detail(id),
    queryFn: () => tournamentApi.getById(id),
    enabled: Boolean(id),
  });
}

/** Đăng ký tham gia giải đấu. */
export function useCreateRegistration() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  return useMutation({
    mutationFn: (payload: { tournament_id: string; form_data: Record<string, unknown> }) =>
      registrationApi.create(payload.tournament_id, payload.form_data),
    onSuccess: (_data, variables) => {
      pushToast('success', 'Đăng ký thành công');
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.registrations(variables.tournament_id) });
    },
    onError: (err) => {
      pushToast('error', err instanceof Error ? err.message : 'Đăng ký thất bại');
    },
  });
}

/** Tạo mới giải đấu. */
export function useCreateTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TournamentPayload) => tournamentApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
    },
  });
}

/** Cập nhật giải đấu (bao gồm duyệt/reject qua status). */
export function useUpdateTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TournamentPayload }) =>
      tournamentApi.update(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(variables.id) });
    },
  });
}

/** Xoá giải đấu. */
export function useDeleteTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tournamentApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
    },
  });
}
