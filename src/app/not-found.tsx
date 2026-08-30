import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
      <h1>404</h1>
      <p>Trang không tồn tại</p>
      <Link href="/" style={{ color: '#FF6B00' }}>← Về trang chủ</Link>
    </div>
  );
}
