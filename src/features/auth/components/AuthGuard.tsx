'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Spinner } from '@/components/ui';
import { useMe } from '../hooks/use-auth';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Role được phép truy cập. Mặc định: admin + ctv. */
  allowedRoles?: string[];
  /** Đường dẫn chuyển hướng khi chưa đăng nhập. */
  redirectTo?: string;
}

/**
 * Bảo vệ route phía client.
 * - Chưa có token → chuyển hướng về redirectTo
 * - Có token nhưng chưa có user → chờ useMe() nạp xong
 * - Sai role → chuyển hướng (mặc định về trang chủ)
 *
 * Lưu ý: để bảo mật thật sự, kết hợp với middleware phía server (xem docs Phần 9).
 */
export function AuthGuard({ children, allowedRoles = ['admin', 'ctv'], redirectTo = '/' }: AuthGuardProps) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useMe();

  useEffect(() => {
    if (!token) {
      router.replace(redirectTo);
      return;
    }
    if (!isLoading && data && !data.success) {
      useAuthStore.getState().clearSession();
      router.replace(redirectTo);
      return;
    }
  }, [token, isLoading, data, router, redirectTo]);

  if (!token || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const currentUser = user ?? data?.user ?? null;
  if (currentUser && (!currentUser.role || !allowedRoles.includes(currentUser.role))) {
    return null; // useEffect sẽ redirect
  }

  return <>{children}</>;
}
