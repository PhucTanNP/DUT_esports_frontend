'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin-api';

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  users: ['admin', 'users'] as const,
  userList: (query: object) => [...adminKeys.users, 'list', query] as const,
  ctvs: ['admin', 'ctvs'] as const,
  ctvList: (query: object) => [...adminKeys.ctvs, 'list', query] as const,
};

/** Thống kê admin (tổng quan). */
export function useStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: adminApi.getStats,
    // tự refresh mỗi 30s như AdminOverview cũ làm
    refetchInterval: 30_000,
  });
}
