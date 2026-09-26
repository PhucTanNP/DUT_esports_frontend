/**
 * Domain types dùng chung toàn bộ frontend.
 * Phản ánh đúng cấu trúc dữ liệu trả về từ backend và database schema chuẩn hóa (18 bảng).
 * Zero CCCD Invariant: Tuyệt đối không dùng thông tin hay hình ảnh CCCD/CMND.
 */

export type UserRole = 'admin' | 'ctv' | 'user';

export type ParticipantAccountType = 'internal' | 'external' | 'dut_student' | 'dut' | 'free';

export type ParticipantStatus = 'pending' | 'approved' | 'rejected';

export type TournamentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'draft'
  | 'ongoing'
  | 'registration_opened'
  | 'registration_closed';

export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ParticipationType = 'individual' | 'team';

export type OrganizerType = 'permanent' | 'seasonal';
export type OrganizerRole = 'lead_organizer' | 'co_organizer' | 'referee' | 'seasonal_staff' | 'support_staff';

export interface TournamentOrganizer {
  id: string;
  tournament_id: string;
  organizer_type: OrganizerType;
  user_id?: string | null;
  participant_id?: string | null;
  role: OrganizerRole;
  custom_title?: string | null;
  assigned_by?: string | null;
  assigned_at: string;

  // Joined fields
  user_name?: string | null;
  user_email?: string | null;
  participant_name?: string | null;
  participant_email?: string | null;
  student_id?: string | null;
  faculty_name?: string | null;
  assigned_by_name?: string | null;
}

export type TeamJoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface TeamJoinRequest {
  id: string;
  registration_id: string;
  participant_id: string;
  ingame_id: string;
  message?: string | null;
  status: TeamJoinRequestStatus;
  processed_by?: string | null;
  processed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Joined display info
  participant_name?: string;
  student_id?: string | null;
  email?: string | null;
  faculty_name?: string | null;
  class_name?: string | null;
  team_name?: string | null;
}

export interface SafeUser {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name: string;
  student_id?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  university_name?: string | null;
  faculty?: string | null;
  faculty_name?: string | null;
  class_name?: string | null;
  course?: string | null;
  role?: UserRole;
  account_type?: ParticipantAccountType;
  
  // KYC 2 ảnh Thẻ Sinh Viên
  student_card_url?: string | null;
  selfie_with_student_card_url?: string | null;
  
  // Trạng thái phê duyệt
  status?: ParticipantStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  
  is_active?: boolean;
  is_banned?: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type Participant = SafeUser;

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
  checkin_open_at?: string | null;
  checkin_close_at?: string | null;
  checkin_qr_secret?: string | null;
  certificate_template_url?: string | null;
  description: string | null;
  location?: string | null;
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

export interface RegistrationMemberDetail {
  participant_id: string;
  participantId?: string;
  full_name: string;
  fullName?: string;
  username?: string;
  student_id?: string | null;
  studentId?: string | null;
  university_name?: string | null;
  universityName?: string | null;
  class_name?: string | null;
  className?: string | null;
  faculty_name?: string | null;
  facultyName?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  account_type?: 'dut' | 'free' | 'internal' | 'external' | string;
  accountType?: string;
  is_captain: boolean;
  isCaptain?: boolean;
  ingame_id?: string | null;
  ingameId?: string | null;
  role_in_team?: string | null;
  roleInTeam?: string | null;
  joined_at?: string;
  joinedAt?: string;
  status?: string | null;
  participant_status?: string | null;
  student_card_url?: string | null;
  studentCardUrl?: string | null;
  selfie_with_student_card_url?: string | null;
  selfieWithStudentCardUrl?: string | null;
}

export interface Registration {
  id: string;
  tournament_id: string;
  captain_id?: string;
  team_name?: string | null;
  team_avatar_url?: string | null;
  ingame_id?: string | null;
  is_recruiting?: boolean;
  recruitment_notes?: string | null;
  submitted_data: Record<string, unknown> | string;
  status: RegistrationStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  registered_at: string;
  updated_at: string;
  tournament_name?: string;
  game_name?: string;
  participation_type?: ParticipationType;
  form_schema?: FormSchema;
  tournament_owner?: string;
  captain_name?: string;
  captain_student_id?: string;
  captain_username?: string;
  captain_university_name?: string;
  captain_class_name?: string;
  captain_faculty_name?: string;
  captain_email?: string;
  captain_phone?: string;
  captain_account_type?: string;
  captain_student_card_url?: string;
  captain_selfie_with_student_card_url?: string;
  members?: RegistrationMemberDetail[];
  is_captain?: boolean;
}

export interface RecruitingTeamInfo extends Registration {
  captain_name: string;
  captain_student_id?: string;
  current_member_count: number;
  min_team_size: number;
  max_team_size: number;
  members?: RegistrationMemberDetail[];
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

export interface TournamentParticipantMemberDTO {
  registrationId?: string;
  participantId: string;
  fullName: string;
  studentId: string | null;
  email: string | null;
  phoneNumber: string | null;
  universityName: string | null;
  facultyName: string | null;
  className: string | null;
  accountType: 'internal' | 'external';
  ingameId: string | null;
  roleInTeam: string | null;
  isCaptain: boolean;
  checkinStatus: 'not_checked_in' | 'approved' | 'pending_review' | 'rejected';
  checkinMethod: string | null;
  checkedInAt: string | null;
}

export interface TournamentTeamDTO {
  registrationId: string;
  teamName: string;
  teamAvatarUrl: string | null;
  captainId: string;
  captainName: string;
  captainStudentId: string | null;
  status: string;
  registeredAt: string;
  members: TournamentParticipantMemberDTO[];
  totalMembers: number;
  checkedInCount: number;
}

export interface TournamentParticipantListResponseDTO {
  tournamentId: string;
  tournamentName: string;
  tournamentCode: string;
  participationType: 'individual' | 'team';
  gameName: string;
  status: string;
  teams?: TournamentTeamDTO[];
  individualParticipants?: TournamentParticipantMemberDTO[];
}

/**
 * Hình dạng phản hồi chuẩn của API.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  redirectTo?: string;
  status?: ParticipantStatus;
  participant?: SafeUser;
  user?: SafeUser;
  tournament?: Partial<Tournament>;
  pagination?: Pagination;
  error?: string;
  server_time?: string;
}

