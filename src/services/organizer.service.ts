import { organizerApi } from '../features/tournaments/api/organizer-api';

export * from '../features/tournaments/api/organizer-api';

export const organizerAPI = {
  ...organizerApi,
  getByTournament: organizerApi.getOrganizersByTournament.bind(organizerApi),
  add: organizerApi.addOrganizer.bind(organizerApi),
  update: organizerApi.updateOrganizer.bind(organizerApi),
  remove: organizerApi.removeOrganizer.bind(organizerApi),
};
