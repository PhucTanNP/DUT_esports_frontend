import type { ApiResponse } from '../types';
import { apiRequest, getAuthHeader } from './http';

export interface CheckinPayload {
  tournament_id: string;
  registration_id?: string;
  checkin_method?: 'qr_scan' | 'proof_submission' | 'ai_ocr' | 'manual_admin';
  proof_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  device_info?: string | null;
  notes?: string | null;
}

export interface CheckinResult {
  id: string;
  tournament_id: string;
  registration_id: string;
  participant_id: string;
  checkin_method: string;
  status: 'approved' | 'pending_review' | 'rejected';
  latitude: number | null;
  longitude: number | null;
  location_accuracy?: number | null;
  device_info?: string | null;
  checked_in_at: string;
  full_name?: string;
  student_id?: string;
  faculty_name?: string;
  ingame_id?: string;
  team_name?: string;
}

export const checkinAPI = {
  /**
   * [SRS 3.1 SV-10, 4.5] Thí sinh thực hiện Check-in ngày thi đấu qua Camera QR & GPS.
   */
  async checkin(payload: CheckinPayload): Promise<ApiResponse<CheckinResult>> {
    return apiRequest<CheckinResult>('/checkins', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lấy trạng thái check-in của thí sinh hiện tại trong giải đấu.
   */
  async getMyStatus(tournament_id: string): Promise<ApiResponse<{ has_checked_in: boolean; checkin: CheckinResult | null }>> {
    return apiRequest<{ has_checked_in: boolean; checkin: CheckinResult | null }>(
      `/checkins/my-status?tournament_id=${encodeURIComponent(tournament_id)}`,
      {
        headers: getAuthHeader(),
      },
    );
  },

  /**
   * [AD-09, SRS 4.5] Danh sách toàn bộ thí sinh đã check-in trong giải đấu (cho Admin / Trọng tài & Bản đồ Leaflet).
   */
  async listByTournament(tournament_id: string): Promise<ApiResponse<CheckinResult[]>> {
    return apiRequest<CheckinResult[]>(
      `/checkins?tournament_id=${encodeURIComponent(tournament_id)}`,
      {
        headers: getAuthHeader(),
      },
    );
  },
};
