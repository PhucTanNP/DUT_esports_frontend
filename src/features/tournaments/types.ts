import type {
  FormField,
  ParticipationType,
  Registration,
  RegistrationStatus,
  Tournament,
  TournamentStatus,
} from '@/types';

/** Type riêng của feature tournaments — tái xuất từ domain types chung. */
export type {
  FormField,
  ParticipationType,
  Registration,
  RegistrationStatus,
  Tournament,
  TournamentStatus,
};

export interface TournamentPayload {
  name?: string;
  game_name?: string;
  game_logo_url?: string;
  banner_url?: string;
  participation_type?: ParticipationType;
  max_participants?: number;
  min_team_size?: number | null;
  max_team_size?: number | null;
  prize_pool?: number;
  registration_open_at?: string;
  registration_close_at?: string;
  start_at?: string;
  end_at?: string;
  description?: string | null;
  use_external_link?: boolean;
  external_registration_url?: string | null;
  form_schema?: FormField[];
  status?: TournamentStatus;
}

export interface TournamentQuery {
  search?: string;
  status?: TournamentStatus | 'all';
}
