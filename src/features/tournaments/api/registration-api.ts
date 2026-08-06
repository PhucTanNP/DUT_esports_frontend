import { apiClient } from '@/lib/api-client';
import type { Registration, RegistrationStatus, Tournament } from '@/types';

/**
 * API đăng ký giải đấu — tương đương services/registration.service.ts (mới).
 */
export const registrationApi = {
  create: (tournament_id: string, form_data: Record<string, unknown>) =>
    apiClient<Registration>('/registrations', {
      method: 'POST',
      body: JSON.stringify({ tournament_id, form_data }),
    }),

  getAll: (tournament_id: string | null = null, status: RegistrationStatus | 'all' = 'all') => {
    const params = new URLSearchParams();
    if (tournament_id) params.append('tournament_id', tournament_id);
    if (status !== 'all') params.append('status', status);
    const qs = params.toString();
    return apiClient<Registration[]>(`/registrations${qs ? `?${qs}` : ''}`);
  },

  getMyRegistrations: (tournament_id: string | null = null, status: RegistrationStatus | 'all' = 'all') => {
    const params = new URLSearchParams();
    if (tournament_id) params.append('tournament_id', tournament_id);
    if (status !== 'all') params.append('status', status);
    const qs = params.toString();
    return apiClient<Registration[]>(`/my-registrations${qs ? `?${qs}` : ''}`);
  },

  getMyTournaments: () => apiClient<Tournament[]>('/my-tournaments'),

  updateStatus: (id: string, status: RegistrationStatus) =>
    apiClient<Registration>(`/registrations/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  remove: (id: string) => apiClient<void>(`/registrations/${id}`, { method: 'DELETE' }),
};
