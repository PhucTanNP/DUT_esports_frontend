import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient dùng chung cho TanStack Query.
 * - staleTime: dữ liệu xem là "mới" trong 30s → giảm request lặp lại
 * - refetchOnWindowFocus: false → không tự gọi lại API khi chuyển tab
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** Dùng chung 1 instance trong toàn app (tránh tạo QueryClient mới mỗi render). */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
