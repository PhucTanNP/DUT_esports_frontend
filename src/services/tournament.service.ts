import type { ApiResponse, FormField, Registration, Tournament } from '../types';
import { apiRequest, getAuthHeader } from './http';

export interface TournamentPayload {
  name?: string;
  game_name?: string;
  game_logo_url?: string;
  banner_url?: string;
  participation_type?: 'individual' | 'team';
  max_participants?: number;
  min_team_size?: number | null;
  max_team_size?: number | null;
  prize_pool?: number;
  registration_open_at?: string;
  registration_close_at?: string;
  start_at?: string;
  end_at?: string;
  description?: string;
  use_external_link?: boolean;
  external_registration_url?: string;
  form_schema?: FormField[];
  status?: string;
}

export const tournamentAPI = {
  async getAll(search = '', status = 'all'): Promise<ApiResponse<Tournament[]>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status !== 'all') params.append('status', status);
    return apiRequest<Tournament[]>(`/tournaments?${params}`);
  },

  async getById(id: string | undefined): Promise<ApiResponse<Tournament>> {
    return apiRequest<Tournament>(`/tournaments/${id}`);
  },

  async create(tournament: TournamentPayload): Promise<ApiResponse<Tournament>> {
    return apiRequest<Tournament>('/tournaments', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(tournament),
    });
  },

  async update(id: string, tournament: TournamentPayload): Promise<ApiResponse<Tournament>> {
    return apiRequest<Tournament>(`/tournaments/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(tournament),
    });
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/tournaments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
  },

  async getRegistrations(id: string): Promise<ApiResponse<Registration[]>> {
    return apiRequest<Registration[]>(`/tournaments/${id}/registrations`, { headers: getAuthHeader() });
  },

  async getPending(): Promise<ApiResponse<Tournament[]>> {
    return apiRequest<Tournament[]>('/tournaments/pending', { headers: getAuthHeader() });
  },

  async getMyPending(): Promise<ApiResponse<Tournament[]>> {
    return apiRequest<Tournament[]>('/tournaments/my-pending', { headers: getAuthHeader() });
  },

  /** Giải đấu của chính user (CTV dùng). */
  async getMine(): Promise<ApiResponse<Tournament[]>> {
    return apiRequest<Tournament[]>('/my-tournaments', { headers: getAuthHeader() });
  },

  async approveTournament(id: string, status: string): Promise<ApiResponse<Tournament>> {
    return apiRequest<Tournament>(`/tournaments/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
  },
};
