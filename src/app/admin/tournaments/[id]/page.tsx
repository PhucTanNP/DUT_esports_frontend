'use client';

import { useParams } from 'next/navigation';
import TournamentDetailView from '../../../../components/admin/TournamentDetailView';

export default function AdminTournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';

  return <TournamentDetailView tournamentId={id} />;
}
