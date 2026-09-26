'use client';

import React, { Suspense } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import StudentAuth from '../../components/StudentAuth';

function LoginContent() {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
      }}
    >
      <StudentAuth
        onClose={() => {
          window.location.href = '/';
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="app" suppressHydrationWarning>
      <Header />
      <Suspense
        fallback={
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <p>Đang tải trang đăng nhập...</p>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
      <Footer />
    </div>
  );
}
