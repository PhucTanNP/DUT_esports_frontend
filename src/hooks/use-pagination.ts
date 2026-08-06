'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * Pagination state dùng chung cho mọi bảng (users, ctvs, tournaments...).
 *
 * const { page, limit, setPage, setLimit, pageCount } = usePagination(10);
 */
export function usePagination(defaultLimit = 10) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);

  const reset = useCallback(() => setPage(1), []);

  return useMemo(
    () => ({
      page,
      limit,
      setPage,
      setLimit,
      reset,
    }),
    [page, limit, reset],
  );
}

/** Tính số trang dựa vào total (dùng chung cho nhiều bảng). */
export function getPageCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}
