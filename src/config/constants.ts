/** Cấu hình tập trung — dễ thay đổi khi deploy. */

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api';
export const API_ORIGIN: string = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:5000';

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
