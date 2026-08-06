'use client';

import { QueryProvider } from './query-provider';

/**
 * AppProviders — nơi gom tất cả provider.
 * Khi thêm provider mới (ThemeProvider, ToastProvider, AuthProvider...)
 * chỉ cần thêm vào đây, layout.tsx không phải đổi.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
