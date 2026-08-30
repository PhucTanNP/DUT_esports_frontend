import { cookies } from 'next/headers';

/**
 * Auth helpers phía SERVER (middleware, layouts, server components).
 * Client-side dùng auth-store (Zustand) — token được đồng bộ ra cookie
 * để middleware có thể đọc được (xem Phần 9 trong docs).
 */

export const AUTH_COOKIE = 'auth_token';

/** Lấy token từ cookie (server). */
export async function getServerAuthToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value ?? null;
}

export function isAuthenticated(token: string | null): boolean {
  return Boolean(token && token.length > 0);
}

/** Có phải tài khoản admin/ctv hay không (role nằm trong cookie user). */
export const USER_COOKIE = 'user_info';
