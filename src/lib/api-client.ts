import type { ApiResponse } from '@/types';

/**
 * API client dùng chung — thay thế services/http.ts
 * - Tự gắn NEXT_PUBLIC_API_BASE
 * - Tự gắn Authorization header qua token getter (hỗ trợ cả localStorage lẫn Zustand store)
 * - Ném ApiError khi response lỗi (HTTP != 2xx hoặc success === false)
 *
 * Cách dùng:
 *   const res = await apiClient<Tournament[]>('/tournaments');
 *   const res = await apiClient<Tournament>('/tournaments', { method: 'POST', body: JSON.stringify(data) });
 */

const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5000/api';

/** Token getter — được đăng ký 1 lần từ auth-store để tránh import vòng. */
let tokenGetter: () => string | null = () => null;
export const setTokenGetter = (getter: () => string | null): void => {
  tokenGetter = getter;
};

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  /** Không gắn Authorization header (dùng cho endpoint public). */
  public?: boolean;
  body?: BodyInit | null;
}

export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions = {},
): Promise<ApiResponse<T>> {
  const { public: isPublic, body, headers: rawHeaders, ...rest } = options;

  const headers = new Headers(rawHeaders);
  const token = isPublic ? null : tokenGetter();

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, { ...rest, headers, body, cache: 'no-store' });

  const json: ApiResponse<T> | null = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      json?.message || json?.error || `Request failed: ${response.status} ${response.statusText}`,
      response.status,
      json,
    );
  }

  if (json?.success === false) {
    throw new ApiError(json.message || json.error || 'Request failed', response.status, json);
  }

  if (json === null) {
    throw new ApiError('Invalid response from server', response.status, null);
  }

  return json;
}

/** Helper tiện — gọi GET và trả thẳng data (bỏ qua wrapper ApiResponse). */
export async function apiGet<T = unknown>(path: string, options?: ApiClientOptions): Promise<T> {
  const res = await apiClient<T>(path, options);
  return res.data as T;
}
