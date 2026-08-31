'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import logo from '../../images/logo.png';
import StudentAuth from '../StudentAuth';
import { authAPI } from '../../services/auth.service';
import type { SafeUser } from '../../types';
import '../../styles/Header.css';

interface HeaderProps {
  user?: SafeUser | null;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
}

export default function Header({ user: propUser, onLoginClick, onLogoutClick }: HeaderProps = {}) {
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [student, setStudent] = useState<SafeUser | null>(propUser || null);

  useEffect(() => {
    if (propUser !== undefined) {
      setStudent(propUser);
      return;
    }
    try {
      const adminRaw = typeof window !== 'undefined' ? window.sessionStorage.getItem('admin_user') : null;
      const studentRaw = typeof window !== 'undefined' ? (window.localStorage.getItem('student_user') || window.sessionStorage.getItem('student_user')) : null;
      const raw = adminRaw || studentRaw;
      setStudent(raw ? (JSON.parse(raw) as SafeUser) : null);
    } catch {
      setStudent(null);
    }
  }, [propUser]);

  const handleAuthSuccess = (user: SafeUser) => {
    setStudent(user);
    const role = user.role?.toLowerCase();
    if (typeof window !== 'undefined') {
      if (role === 'admin' || role === 'ctv') {
        window.sessionStorage.setItem('admin_user', JSON.stringify(user));
        window.sessionStorage.setItem('student_user', JSON.stringify(user));
        window.localStorage.removeItem('admin_user');
        window.localStorage.removeItem('student_user');
        window.location.href = '/admin';
        return;
      } else {
        window.localStorage.setItem('student_user', JSON.stringify(user));
        window.sessionStorage.removeItem('admin_user');
      }
    }
    setShowAuth(false);
  };

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
      return;
    }
    authAPI.logout();
    setStudent(null);
    setMenuOpen(false);
    setProfileOpen(false);
    setStatusMessage('');
  };

  const handleMenuAction = (action: 'profile' | 'tournaments' | 'password') => {
    if (action === 'profile') {
      window.location.href = '/profile';
    } else {
      setProfileOpen(false);
      setStatusMessage(action === 'tournaments'
        ? 'Tính năng “Các giải đấu đã đăng ký” sẽ được cập nhật trong thời gian tới.'
        : 'Tính năng đổi mật khẩu sẽ được cập nhật trong thời gian tới.');
    }
  };


  const profileItems = student
    ? [
        {
          label: student.student_id ? 'MSSV' : 'ID',
          value: student.student_id || student.id,
        },
        {
          label: 'Họ tên',
          value: student.full_name,
        },
        ...(student.student_id
          ? [
              {
                label: 'Lớp',
                value: student.class_name || 'Đang cập nhật',
              },
              {
                label: 'Khoa',
                value: student.faculty || 'Đang cập nhật',
              },
            ]
          : []),
      ]
    : [];

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
              <div
                className="header-user"
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => {
                  setMenuOpen(false);
                  setStatusMessage('');
                }}
              >
                <button className="header-user-trigger" type="button" onClick={() => setMenuOpen((prev) => !prev)}>
                  <span className="header-avatar">
                    {student.full_name?.charAt(0).toUpperCase() || 'S'}
                  </span>
                  <div className="header-user-info">
                    <span className="header-user-greeting">Xin chào, {student.full_name}</span>
                    <span className="header-user-mssv">{student.student_id || student.username || 'Tài khoản tự do'}</span>
                  </div>
                </button>

                {menuOpen && (
                  <div className="header-user-menu">
                    {(student.role === 'admin' || student.role === 'ctv') && (
                      <a href="/admin" className="header-user-option" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        ⚡ Dashboard Admin
                      </a>
                    )}
                    <button className="header-user-option" type="button" onClick={() => handleMenuAction('profile')}>
                      👤 Thông tin cá nhân
                    </button>
                    <button className="header-user-option" type="button" onClick={() => handleMenuAction('tournaments')}>
                      🏆 Các giải đấu đã đăng ký
                    </button>
                    <button className="header-user-option" type="button" onClick={() => handleMenuAction('password')}>
                      🔐 Đổi mật khẩu
                    </button>
                    <button className="header-user-option header-user-option-danger" type="button" onClick={handleLogout}>
                      🚪 Đăng xuất
                    </button>

                    {statusMessage ? <div className="header-user-status">{statusMessage}</div> : null}
                  </div>
                )}
              </div>
            ) : (
              <button className="header-login-btn" onClick={() => setShowAuth(true)}>
                🎓 Đăng Nhập / Đăng Ký
              </button>
            )}
          </div>
        </div>
      </header>

      {profileOpen && student ? (
        <div className="header-profile-overlay" onClick={() => setProfileOpen(false)}>
          <div className="header-profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="header-profile-header">
              <h3>Thông tin cá nhân</h3>
              <button className="header-profile-close" type="button" onClick={() => setProfileOpen(false)}>
                ✕
              </button>
            </div>
            <div className="header-profile-body">
              {profileItems.map((item) => (
                <div className="header-profile-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showAuth && <StudentAuth onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}
    </>
  );
}
