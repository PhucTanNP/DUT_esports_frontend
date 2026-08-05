import type { ApiResponse, Registration, RegistrationStatus, Tournament } from '../types';
import { apiRequest, getAuthHeader } from './http';

export const registrationAPI = {
  /** Tạo đăng ký mới (public). */
  async create(tournament_id: string, form_data: Record<string, unknown>): Promise<ApiResponse<Registration>> {
    return apiRequest<Registration>('/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournament_id, form_data }),
    });
  },

  async getAll(tournament_id: string | null = null, status = 'all'): Promise<ApiResponse<Registration[]>> {
    const params = new URLSearchParams();
    if (tournament_id) params.append('tournament_id', tournament_id);
    if (status !== 'all') params.append('status', status);
    return apiRequest<Registration[]>(`/registrations?${params}`, { headers: getAuthHeader() });
  },

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

  async updateStatus(id: string, status: RegistrationStatus): Promise<ApiResponse<Registration>> {
    return apiRequest<Registration>(`/registrations/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/registrations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },
};
