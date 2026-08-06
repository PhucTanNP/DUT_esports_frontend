import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SafeUser } from '@/types';
import { setTokenGetter } from '@/lib/api-client';

/**
 * Auth store (client-side) — Zustand + persist (localStorage).
 * Thay thế việc đọc/ghi localStorage thủ công rải rác trong component.
 *
 * Lưu ý: persist mặc định lưu theo key 'auth-store' trong localStorage.
 */

interface AuthState {
  user: SafeUser | null;
  token: string | null;
  isAuthenticated: () => boolean;
  setSession: (user: SafeUser | null, token: string) => void;
  setUser: (user: SafeUser | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      isAuthenticated: () => Boolean(get().token),

      setSession: (user, token) => {
        set({ user, token });
      },

      setUser: (user) => set({ user }),

      clearSession: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);

// Đăng ký token getter cho api-client — tránh import vòng giữa store và client.
setTokenGetter(() => useAuthStore.getState().token);
