'use client';

import { useState } from 'react';
import Link from 'next/link';
import logo from '../../images/logo.png';
import StudentAuth from '../StudentAuth';
import type { SafeUser } from '../../types';
import '../../styles/Header.css';

export default function Header() {
  const [showAuth, setShowAuth] = useState(false);
  const [student, setStudent] = useState<SafeUser | null>(() => {
    try {
      const raw = localStorage.getItem('student_user');
      return raw ? (JSON.parse(raw) as SafeUser) : null;
    } catch {
      return null;
    }
  });

  const handleAuthSuccess = (user: SafeUser) => {
    setStudent(user);
    setShowAuth(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('student_user');
    localStorage.removeItem('auth_token');
    setStudent(null);
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <Link href="/" aria-label="Trang chủ">
              <img src={logo.src} alt="E-Sports Đà Nẵng Logo" className="logo-img" />
            </Link>
          </div>

          <nav className="nav-menu">
            <a href="https://www.facebook.com/svDUTEsports" target="_blank" rel="noopener noreferrer" className="nav-link">FANPAGE</a>
            <a href="#" className="nav-link">GIỚI THIỆU</a>
            <a href="#" className="nav-link">ĐỐI TÁC</a>
            <a href="#" className="nav-link">GIẢI ĐẤU</a>
            <a href="#" className="nav-link">LIÊN HỆ</a>
          </nav>

          <div className="header-auth">
            {student ? (
              <div className="header-user">
                <span className="header-avatar">
                  {student.full_name?.charAt(0).toUpperCase() || 'S'}
                </span>
                <div className="header-user-info">
                  <span className="header-user-name">{student.full_name}</span>
                  <span className="header-user-mssv">{student.student_id || student.username || 'Tài khoản tự do'}</span>
                </div>
                <button className="header-logout" onClick={handleLogout} title="Đăng xuất">
                  🚪
                </button>
              </div>
            ) : (
              <button className="header-login-btn" onClick={() => setShowAuth(true)}>
                🎓 Đăng Nhập / Đăng Ký
              </button>
            )}
          </div>
        </div>
      </header>

      {showAuth && <StudentAuth onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}
    </>
  );
}
