import { apiClient } from '@/lib/api-client';
import type { Registration, Tournament } from '@/types';
import type { TournamentPayload, TournamentQuery } from '../types';

/**
 * API tournaments — tương đương services/tournament.service.ts (mới).
 * Dùng apiClient tập trung; mọi hàm trả Promise<ApiResponse<T>>.
 */
export const tournamentApi = {
  getAll: (query: TournamentQuery = {}) => {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.status && query.status !== 'all') params.append('status', query.status);
    const qs = params.toString();
    return apiClient<Tournament[]>(`/tournaments${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string | undefined) => apiClient<Tournament>(`/tournaments/${id}`),

  create: (payload: TournamentPayload) =>
    apiClient<Tournament>('/tournaments', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: string, payload: TournamentPayload) =>
    apiClient<Tournament>(`/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  remove: (id: string) => apiClient<void>(`/tournaments/${id}`, { method: 'DELETE' }),

  approve: (id: string, status: Tournament['status']) =>
    apiClient<Tournament>(`/tournaments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getRegistrations: (id: string) => apiClient<Registration[]>(`/tournaments/${id}/registrations`),

  getPending: () => apiClient<Tournament[]>('/tournaments/pending'),

  getMyPending: () => apiClient<Tournament[]>('/tournaments/my-pending'),

  getMine: () => apiClient<Tournament[]>('/my-tournaments'),
};
