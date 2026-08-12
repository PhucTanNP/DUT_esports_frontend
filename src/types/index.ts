/**
 * Domain types dùng chung toàn bộ frontend.
 * Phản ánh đúng cấu trúc dữ liệu trả về từ backend.
 */

export type UserRole = 'admin' | 'ctv' | 'user';

export type TournamentStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export type ParticipationType = 'individual' | 'team';

export interface SafeUser {
  id: string;
  email: string | null;
  username?: string | null;
  full_name: string;
  student_id: string | null;
  phone: string | null;
  faculty: string | null;
  class_name: string | null;
  course: string | null;
  role: UserRole;
  is_active: boolean;
  is_banned?: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'file' | 'select';
  required: boolean;
  options?: string;
  description?: string;
}

/** form_schema lưu JSONB — có thể là array đã parse, hoặc chuỗi JSON thô. */
export type FormSchema = FormField[] | string | null;

export interface Tournament {
  id: string;
  code: string;
  name: string;
  game_name: string;
  game_logo_url: string | null;
  banner_url: string;
  participation_type: ParticipationType;
  max_participants: number;
  min_team_size: number | null;
  max_team_size: number | null;
  prize_pool: number;
  registration_open_at: string;
  registration_close_at: string;
  start_at: string;
  end_at: string;
  description: string | null;
  use_external_link: boolean;
  external_registration_url: string | null;
  form_schema: FormSchema;
  created_by: string | null;
  approved_by: string | null;
  status: TournamentStatus;
  created_at: string;
  approved_at: string | null;
  updated_at: string;
  created_by_name?: string;
}

export interface Registration {
  id: string;
  tournament_id: string;
  submitted_data: Record<string, unknown> | string;
  status: RegistrationStatus;
  registered_at: string;
  updated_at: string;
  tournament_name?: string;
  game_name?: string;
  form_schema?: FormSchema;
  tournament_owner?: string;
}

export interface AdminStats {
  total_tournaments: number;
  pending_tournaments: number;
  total_registrations: number;
  approved_registrations: number;
  pending_registrations: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Hình dạng phản hồi chuẩn của API.
 * Các field là optional vì mỗi endpoint trả cấu trúc khác nhau.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  redirectTo?: string;
  user?: SafeUser;
  tournament?: Partial<Tournament>;
  pagination?: Pagination;
  error?: string;
  server_time?: string;
}
