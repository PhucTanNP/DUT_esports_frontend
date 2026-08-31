'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import ParticipantProfile from '../../components/ParticipantProfile';
import StudentAuth from '../../components/StudentAuth';
import { authAPI } from '../../services/auth.service';
import type { SafeUser } from '../../types';

export default function ProfilePage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('student_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        // ignore parse error
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d1e' }}>
      <Header
        user={user}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={handleLogout}
      />

      <main style={{ flex: 1, padding: '40px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#ffffff' }}>
            <h2>⏳ Đang tải thông tin...</h2>
          </div>
        ) : user ? (
          <ParticipantProfile
            initialUser={user as any}
            onLogout={handleLogout}
          />
        ) : (
          <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', color: '#ffffff', padding: '40px 20px' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>🔒 Yêu Cầu Đăng Nhập</h1>
            <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '16px' }}>
              Vui lòng đăng nhập tài khoản để xem thông tin hồ sơ, trạng thái kiểm duyệt và các giải đấu của bạn.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                background: 'linear-gradient(135deg, #ff6b00, #ff8c00)',
                color: '#ffffff',
                border: 'none',
                padding: '14px 36px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(255, 107, 0, 0.4)',
              }}
            >
              🚀 Đăng Nhập Ngay
            </button>
          </div>
        )}
      </main>

      {showAuthModal && (
        <StudentAuth
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setShowAuthModal(false);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      <Footer />
    </div>
  );
}
