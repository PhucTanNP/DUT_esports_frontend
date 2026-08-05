'use client';

import { useRouter } from 'next/navigation';
import '../styles/TournamentCard.css';

/** Dữ liệu hiển thị trên card — đã được HomePage chuẩn hóa. */
export interface TournamentCardData {
  id: string;
  name: string;
  category: string;
  dates: string;
  prizePool: string;
  game: string;
  gameLogo: string | null;
  image: string;
}

interface TournamentCardProps {
  tournament: TournamentCardData;
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/tournament/${tournament.id}`);
  };

  const handleRegister = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    router.push(`/tournament/${tournament.id}`);
  };

  const hasLogo =
    tournament.gameLogo !== null &&
    (tournament.gameLogo.startsWith('http') || tournament.gameLogo.startsWith('/'));

  return (
    <div className="tournament-card" onClick={handleCardClick}>
      <div className="card-image-wrapper">
        <img src={tournament.image} alt={tournament.name} className="card-image" />
      </div>

      <div className="card-content">
        <h3 className="card-title">{tournament.name}</h3>

        <div className="card-meta">
          <div className="meta-item">
            <span className="meta-icon">🎮</span>
            <span className="meta-text">{tournament.category}</span>
          </div>

          <div className="meta-item">
            <span className="meta-icon">📅</span>
            <span className="meta-text">{tournament.dates}</span>
          </div>

          <div className="meta-item">
            <span className="meta-icon">💰</span>
            <span className="meta-text">{tournament.prizePool}</span>
          </div>
        </div>

        <div className="card-game-logo">
          {hasLogo && (
            <img
              src={tournament.gameLogo as string}
              alt={tournament.game}
              className="game-logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'inline';
              }}
            />
          )}
          <span className="game-logo-fallback" style={{ display: hasLogo ? 'none' : 'inline' }}>🎮</span>
          <span className="game-name">{tournament.game}</span>
        </div>

        <button className="register-btn" onClick={handleRegister}>ĐĂNG KÝ NGAY</button>
      </div>
    </div>
  );
}
