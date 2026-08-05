import type { ApiResponse } from '../types';

/** Base URL của API backend — override qua NEXT_PUBLIC_API_BASE. */
export const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5000/api';

// ===========================
// TOKEN MANAGEMENT
// ===========================
export const getAuthToken = (): string | null => localStorage.getItem('auth_token');
export const setAuthToken = (token: string): void => localStorage.setItem('auth_token', token);
export const removeAuthToken = (): void => localStorage.removeItem('auth_token');

export const getAuthHeader = (): Record<string, string> => ({
  Authorization: `Bearer ${getAuthToken()}`,
  'Content-Type': 'application/json',
});

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

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return (await response.json()) as ApiResponse<T>;
}
