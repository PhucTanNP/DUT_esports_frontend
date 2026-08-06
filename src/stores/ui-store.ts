import { create } from 'zustand';

/**
 * UI store — state giao diện dùng chung (không cần persist).
 */

interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UiState {
  sidebarOpen: boolean;
  toasts: ToastItem[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  pushToast: (type: ToastItem['type'], message: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: true,

  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  pushToast: (type, message) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    // Tự xoá sau 4 giây
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
