export const getApiOrigin = (): string => {
  if (process.env.NEXT_PUBLIC_API_ORIGIN) {
    return process.env.NEXT_PUBLIC_API_ORIGIN;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
};

export const API_ORIGIN: string = getApiOrigin();
export const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE ?? `${API_ORIGIN}/api`;

export interface GameInfo {
  name: string;
  code: string;
  logo: string;
}

/** Danh sách game có sẵn khi tạo giải đấu. */
export const AVAILABLE_GAMES: GameInfo[] = [
  { name: 'Liên Quân Mobile', code: 'AOV', logo: `${API_ORIGIN}/api/logos/LQ.png` },
  { name: 'League of Legend', code: 'LOL', logo: `${API_ORIGIN}/api/logos/LOL.png` },
  { name: 'Valorant', code: 'VAL', logo: `${API_ORIGIN}/api/logos/Valorant.png` },
  { name: 'TFT', code: 'TFT', logo: `${API_ORIGIN}/api/logos/TFT.jpg` },
];

/** Lấy logo theo tên game — trả chuỗi rỗng nếu không có. */
export const getLogoUrl = (gameName: string): string =>
  AVAILABLE_GAMES.find((g) => g.name === gameName)?.logo ?? '';
