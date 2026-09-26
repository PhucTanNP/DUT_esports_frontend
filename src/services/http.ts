import type { ApiResponse } from '../types';

/**
 * Base URL của API backend:
 * - Ưu tiên NEXT_PUBLIC_API_BASE nếu được cấu hình.
 * - Khi chạy ở trình duyệt client, tự động nhận diện hostname hiện tại (hỗ trợ kiểm thử qua IP LAN như 192.168.x.x trên iPhone/Android).
 * - Mặc định: http://localhost:5000/api.
 */
export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

export const API_BASE: string = getApiBase();

// ===========================
// TOKEN MANAGEMENT
// ===========================
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string, sessionOnly: boolean = false): void => {
  if (typeof window === 'undefined') return;
  if (sessionOnly) {
    sessionStorage.setItem('auth_token', token);
    localStorage.removeItem('auth_token');
  } else {
    localStorage.setItem('auth_token', token);
    sessionStorage.removeItem('auth_token');
  }
};

export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
};

export const getAuthHeader = (): Record<string, string> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && token !== 'null' && token !== 'undefined') {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Gắn token xác thực vào URL của tài liệu bảo vệ (documents/) để thẻ <img> hiển thị được.
 */
export function getAuthenticatedImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.includes('/api/documents/')) {
    const token = getAuthToken();
    if (token && !url.includes('token=')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

/**
 * Request wrapper — tự gắn API_BASE, tự set Content-Type JSON,
 * tự parse response. Mọi service đều đi qua đây.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers);
  const { body } = options;

  if (!headers.has('Content-Type') && body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const baseUrl = getApiBase();

  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const json = await response.json().catch(() => ({}));
    const isOk = response.ok;

    return {
      success: typeof json.success === 'boolean' ? json.success : isOk,
      ...json,
      status: response.status,
    } as unknown as ApiResponse<T> & { status?: number };
  } catch (err: any) {
    console.warn(`API request error [${path}]:`, err?.message || err);
    return {
      success: false,
      message:
        err?.message === 'Failed to fetch' || err?.message === 'Load failed'
          ? 'Không thể kết nối đến máy chủ backend (Network Error). Vui lòng đảm bảo backend đang chạy và thiết bị cùng mạng Wi-Fi.'
          : err?.message || 'Lỗi kết nối mạng khi gửi yêu cầu.',
      status: 0,
    } as unknown as ApiResponse<T> & { status?: number };
  }
}
