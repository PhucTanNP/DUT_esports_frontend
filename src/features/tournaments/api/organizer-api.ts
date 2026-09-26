import { apiRequest, getAuthHeader } from '../../../services/http';
import type {
  ApiResponse,
  OrganizerRole,
  OrganizerType,
  SafeUser,
  TournamentOrganizer,
} from '../../../types';

export interface AddOrganizerPayload {
  organizer_type: OrganizerType;
  user_id?: string | null;
  participant_id?: string | null;
  role: OrganizerRole;
  custom_title?: string;
}

export interface UpdateOrganizerPayload {
  role?: OrganizerRole;
  custom_title?: string;
}

export interface UserOrganizerRoleResponse {
  isAuthorized: boolean;
  isLeadOrAdmin: boolean;
  role?: OrganizerRole | 'admin' | 'creator';
}

/**
 * [SRS 4.2, AD-05, SV-13] API Client — Phân Quyền Ban Tổ Chức Giải Đấu
 */
export const organizerApi = {
  /** Lấy danh sách BTC của giải đấu kèm thông tin join từ users hoặc participants. */
  async getOrganizersByTournament(
    tournamentId: string,
  ): Promise<ApiResponse<TournamentOrganizer[]>> {
    return apiRequest<TournamentOrganizer[]>(`/tournaments/${tournamentId}/organizers`);
  },

  /** Gán CTV thường trực hoặc Sinh viên KYC approved vào BTC giải. */
  async addOrganizer(
    tournamentId: string,
    data: AddOrganizerPayload,
  ): Promise<ApiResponse<TournamentOrganizer>> {
    return apiRequest<TournamentOrganizer>(`/tournaments/${tournamentId}/organizers`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
  },

  /** Cập nhật vai trò / chức danh thành viên BTC. */
  async updateOrganizer(
    tournamentId: string,
    organizerId: string,
    data: UpdateOrganizerPayload,
  ): Promise<ApiResponse<TournamentOrganizer>> {
    return apiRequest<TournamentOrganizer>(`/tournaments/${tournamentId}/organizers/${organizerId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
  },

  /** Xóa quyền BTC của một thành viên. */
  async removeOrganizer(
    tournamentId: string,
    organizerId: string,
  ): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/tournaments/${tournamentId}/organizers/${organizerId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  /** Kiểm tra vai trò quyền hạn điều hành của user với giải đấu. */
  async checkUserOrganizerRole(
    tournamentId: string,
  ): Promise<ApiResponse<UserOrganizerRoleResponse>> {
    return apiRequest<UserOrganizerRoleResponse>(`/tournaments/${tournamentId}/my-role`, {
      headers: getAuthHeader(),
    });
  },

  /** Tìm kiếm ứng viên CTV thường trực từ users. */
  async getCandidateUsers(search?: string): Promise<ApiResponse<SafeUser[]>> {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    return apiRequest<SafeUser[]>(`/organizers/candidates/users?${params}`, {
      headers: getAuthHeader(),
    });
  },

  /** Tìm kiếm ứng viên Sinh viên KYC approved từ participants. */
  async getCandidateParticipants(search?: string): Promise<ApiResponse<SafeUser[]>> {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    return apiRequest<SafeUser[]>(`/organizers/candidates/participants?${params}`, {
      headers: getAuthHeader(),
    });
  },
};

// Aliases
export const tournamentOrganizerApi = organizerApi;
