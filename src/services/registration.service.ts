import type {
  ApiResponse,
  RecruitingTeamInfo,
  Registration,
  RegistrationStatus,
  TeamJoinRequest,
  Tournament,
} from '../types';
import { API_BASE, apiRequest, getAuthHeader, getAuthToken } from './http';

export interface CreateRegistrationPayload {
  tournament_id: string;
  ingame_id: string;
  role_in_team?: string;
  team_name?: string;
  team_avatar_url?: string;
  members?: Array<{
    participant_id: string;
    ingame_id: string;
    role_in_team?: string;
  }>;
  is_recruiting?: boolean;
  recruitment_notes?: string;
  form_data?: Record<string, unknown>;
  submitted_data?: Record<string, unknown>;
}

export const registrationAPI = {
  /**
   * [SRS 3.1 SV-05] Tạo đăng ký mới (Cá nhân hoặc Đội).
   * Hỗ trợ payload đầy đủ (ingame_id, members, recruiting) hoặc (tournament_id, form_data) legacy.
   */
  async create(
    tournament_idOrPayload: string | CreateRegistrationPayload,
    formDataLegacy?: Record<string, unknown>,
  ): Promise<ApiResponse<Registration>> {
    let payload: CreateRegistrationPayload;
    if (typeof tournament_idOrPayload === 'string') {
      payload = {
        tournament_id: tournament_idOrPayload,
        ingame_id: (formDataLegacy?.ingame_id as string) || (formDataLegacy?.riot_id as string) || 'Player',
        form_data: formDataLegacy,
      };
    } else {
      payload = tournament_idOrPayload;
    }

    return apiRequest<Registration>('/registrations', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * [SRS 3.1 SV-07] Hủy đơn đăng ký trước hạn đóng đăng ký.
   */
  async cancel(id: string): Promise<ApiResponse<Registration>> {
    return apiRequest<Registration>(`/registrations/${id}/cancel`, {
      method: 'PUT',
      headers: getAuthHeader(),
    });
  },

  /**
   * [SRS 3.1 SV-06, SRS 4.3] Lấy danh sách các đội đang tuyển quân trong giải (Chợ tuyển quân).
   */
  async getRecruitingTeams(tournamentId: string): Promise<ApiResponse<RecruitingTeamInfo[]>> {
    return apiRequest<RecruitingTeamInfo[]>(`/tournaments/${tournamentId}/recruiting-teams`);
  },

  /**
   * [SRS 3.1 SV-06] Gửi đơn xin gia nhập đội đang tuyển quân.
   */
  async createJoinRequest(
    registrationId: string,
    data: { ingame_id: string; message?: string },
  ): Promise<ApiResponse<TeamJoinRequest>> {
    return apiRequest<TeamJoinRequest>(`/registrations/${registrationId}/join-requests`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
  },

  /**
   * [SRS 3.1 SV-06] Đội trưởng lấy danh sách yêu cầu gia nhập gửi tới đội mình.
   */
  async getJoinRequests(registrationId: string): Promise<ApiResponse<TeamJoinRequest[]>> {
    return apiRequest<TeamJoinRequest[]>(`/registrations/${registrationId}/join-requests`, {
      headers: getAuthHeader(),
    });
  },

  /**
   * [SRS 3.1 SV-06, SRS 4.3] Đội trưởng Duyệt (accept) hoặc Từ chối (reject) yêu cầu gia nhập.
   */
  async processJoinRequest(
    registrationId: string,
    requestId: string,
    action: 'accepted' | 'rejected',
    reason?: string,
  ): Promise<ApiResponse<TeamJoinRequest>> {
    return apiRequest<TeamJoinRequest>(`/registrations/${registrationId}/join-requests/${requestId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ action, reason }),
    });
  },

  /**
   * Đội trưởng bật/tắt cờ tuyển quân và sửa ghi chú tuyển vị trí.
   */
  async updateRecruiting(
    registrationId: string,
    is_recruiting: boolean,
    recruitment_notes?: string,
  ): Promise<ApiResponse<Registration>> {
    return apiRequest<Registration>(`/registrations/${registrationId}/recruiting`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ is_recruiting, recruitment_notes }),
    });
  },

  /**
   * Lấy đơn đăng ký của sinh viên hiện tại trong giải đấu.
   */
  async getMyTournamentRegistration(tournamentId: string): Promise<ApiResponse<Registration | null>> {
    return apiRequest<Registration | null>(`/tournaments/${tournamentId}/my-registration`, {
      headers: getAuthHeader(),
    });
  },

  /**
   * Lấy các yêu cầu gia nhập mà sinh viên hiện tại đã gửi đi.
   */
  async getMyJoinRequests(): Promise<ApiResponse<TeamJoinRequest[]>> {
    return apiRequest<TeamJoinRequest[]>('/registrations/my-join-requests', {
      headers: getAuthHeader(),
    });
  },

  /**
   * [SRS 3.1 SV-04, SV-05]
   * Lấy danh sách toàn bộ các giải đấu mà sinh viên hiện tại đã đăng ký.
   */
  async getMyParticipations(): Promise<ApiResponse<Registration[]>> {
    return apiRequest<Registration[]>('/registrations/my-participations', {
      headers: getAuthHeader(),
    });
  },

  /**
   * [SRS 3.1 SV-04] Cập nhật thông tin đăng ký (Ingame ID, Tên đội, form động)
   */
  async updateInfo(
    id: string,
    data: {
      ingame_id?: string;
      team_name?: string | null;
      team_avatar_url?: string | null;
      submitted_data?: Record<string, unknown>;
    },
  ): Promise<ApiResponse<Registration>> {
    return apiRequest<Registration>(`/registrations/${id}/info`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
  },

  /** Admin — lấy tất cả đăng ký. */
  async getAll(tournament_id: string | null = null, status = 'all'): Promise<ApiResponse<Registration[]>> {
    const params = new URLSearchParams();
    if (tournament_id) params.append('tournament_id', tournament_id);
    if (status !== 'all') params.append('status', status);
    return apiRequest<Registration[]>(`/registrations?${params}`, { headers: getAuthHeader() });
  },

  /** Lấy đăng ký của các giải do user phụ trách. */
  async getMyRegistrations(
    tournament_id: string | null = null,
    status = 'all',
  ): Promise<ApiResponse<Registration[]>> {
    const params = new URLSearchParams();
    if (tournament_id) params.append('tournament_id', tournament_id);
    if (status !== 'all') params.append('status', status);
    return apiRequest<Registration[]>(`/my-registrations?${params}`, { headers: getAuthHeader() });
  },

  async getMyTournaments(): Promise<ApiResponse<Tournament[]>> {
    return apiRequest<Tournament[]>('/my-tournaments', { headers: getAuthHeader() });
  },

  async updateStatus(
    id: string,
    status: RegistrationStatus,
    rejection_reason?: string,
  ): Promise<ApiResponse<Registration>> {
    return apiRequest<Registration>(`/registrations/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ status, rejection_reason }),
    });
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/registrations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  /**
   * [TASK_FE_904] Admin/CTV lấy danh sách thành viên/đội tham gia giải đấu và trạng thái điểm danh.
   */
  async getTournamentParticipants(
    tournamentId: string,
  ): Promise<ApiResponse<import('../types').TournamentParticipantListResponseDTO>> {
    return apiRequest<import('../types').TournamentParticipantListResponseDTO>(
      `/registrations/tournament/${tournamentId}/participants-management`,
      { headers: getAuthHeader() },
    );
  },

  /**
   * [TASK_FE_904] Admin/CTV xác nhận tham gia ngày thi đấu cho 1 thành viên.
   */
  async confirmParticipation(
    tournamentId: string,
    registrationId: string,
    participantId: string,
    action: 'confirm' | 'cancel',
    notes?: string,
  ): Promise<ApiResponse<unknown>> {
    return apiRequest<unknown>(`/registrations/tournament/${tournamentId}/confirm-participation`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ tournamentId, registrationId, participantId, action, notes }),
    });
  },

  /**
   * [TASK_FE_904] Tải file Excel báo cáo danh sách thành viên/đội tham gia.
   */
  async downloadParticipantsExcel(tournamentId: string, tournamentCode?: string): Promise<void> {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/registrations/tournament/${tournamentId}/export-participants-excel`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) {
      throw new Error('Không thể tải file Excel báo cáo');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_Sach_Tham_Gia_${tournamentCode || tournamentId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
