'use client';

import { useEffect, useState } from 'react';
import logo from '../../images/logo.png';
import StudentAuth from '../StudentAuth';
import type { SafeUser } from '../../types';
import '../../styles/Header.css';

export default function Header() {
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [student, setStudent] = useState<SafeUser | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('student_user');
      setStudent(raw ? (JSON.parse(raw) as SafeUser) : null);
    } catch {
      setStudent(null);
    }
  }, []);

  const handleAuthSuccess = (user: SafeUser) => {
    setStudent(user);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('student_user', JSON.stringify(user));
    }
    setShowAuth(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('student_user');
    localStorage.removeItem('auth_token');
    setStudent(null);
    setMenuOpen(false);
    setProfileOpen(false);
    setStatusMessage('');
  };

  const handleMenuAction = (action: 'profile' | 'tournaments' | 'password') => {
    if (action === 'profile') {
      setProfileOpen(true);
      setStatusMessage('');
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
            <a href="/" aria-label="Trang chủ">
              <img src={logo.src} alt="E-Sports Đà Nẵng Logo" className="logo-img" />
            </a>
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
