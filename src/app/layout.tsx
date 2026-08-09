import type { Metadata } from 'next';
import '../styles/tokens.css';
import '../styles/global.css';
import '../App.css';

export const metadata: Metadata = {
  title: 'DUT Esports — Nền tảng giải đấu',
  description:
    'Nền tảng tổ chức & theo dõi giải đấu Esports của CLB Thể thao điện tử DUT ESPORTS, Đại học Bách khoa Đà Nẵng.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
