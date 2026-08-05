import type { FormField } from '../types';

/**
 * Parse form_schema từ DB — có thể là array đã parse hoặc chuỗi JSON thô.
 * Luôn trả về array an toàn.
 */
export function parseFormSchema(raw: unknown): FormField[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as FormField[];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as FormField[];
    } catch {
      return [];
    }
  }
  return [];
}

/** Parse submitted_data (jsonb) thành object an toàn. */
export function parseSubmittedData(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}
