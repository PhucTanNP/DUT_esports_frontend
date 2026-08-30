import type { SafeUser, UserRole } from '@/types';

/** Type riêng của feature auth — dựa trên domain types chung. */
export type { SafeUser, UserRole };

export interface LoginPayload {
  email: string;
  password: string;
}

export interface StudentLoginPayload {
  student_id: string;
  password: string;
}

export interface StudentRegisterPayload {
  student_id: string;
  password: string;
  full_name: string;
  email?: string;
  phone?: string;
  faculty?: string;
  class_name?: string;
  course?: string;
}

export interface AuthSession {
  user: SafeUser | null;
  token: string | null;
}
