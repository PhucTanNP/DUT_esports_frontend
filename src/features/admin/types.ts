import type { AdminStats, Pagination, SafeUser, UserRole } from '@/types';

/** Type riêng của feature admin — tái xuất từ domain types chung. */
export type { AdminStats, Pagination, SafeUser, UserRole };

export interface UserRow extends SafeUser {
  created_at?: string;
  updated_at?: string;
}

export interface CtvRow extends SafeUser {
  created_at?: string;
  updated_at?: string;
}

export interface UserListResult {
  data: UserRow[];
  pagination: Pagination;
}

export interface CtvListResult {
  data: CtvRow[];
  pagination: Pagination;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  email: string;
  full_name: string;
  password?: string;
  role: UserRole;
  is_active: boolean;
}
