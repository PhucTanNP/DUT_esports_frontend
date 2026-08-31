'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, getRedirectUrl } from '../services/auth.service';
import { participantAPI } from '../services/participant.service';
import StudentRegistrationForm from './StudentRegistrationForm';
import type { SafeUser } from '../types';
import '../styles/StudentAuth.css';

interface StudentAuthProps {
  /** Gọi khi đăng nhập/đăng ký thành công */
  onSuccess?: (user: SafeUser) => void;
  /** Đóng modal/trang */
  onClose?: () => void;
}

export default function StudentAuth({ onSuccess, onClose }: StudentAuthProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [open, setOpen] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setOpen(false);
    }
  };

  if (!open) return null;

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanId = loginId.trim();
    if (!cleanId || !password) {
      setError('Vui lòng nhập Email hoặc Mã sinh viên và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      // 1. Thử đăng nhập qua API Sinh viên / Participant
      let result = await participantAPI.login(cleanId, password);

      // 2. Nếu thất bại, thử login qua authAPI (Admin/CTV fallback)
      if (!result.success) {
        const adminRes = await authAPI.login(cleanId, password);
        if (adminRes.success) {
          result = adminRes as any;
        }
      }

      if (result.success) {
        const user = (result.data || (result as any).user || (result as any).participant) as SafeUser;
        const role = user?.role?.toLowerCase();
        const isAdminOrCtv = role === 'admin' || role === 'ctv';

        if (typeof window !== 'undefined') {
          if (result.token) {
            if (isAdminOrCtv) {
              sessionStorage.setItem('auth_token', result.token);
              localStorage.removeItem('auth_token');
            } else {
              localStorage.setItem('auth_token', result.token);
              sessionStorage.removeItem('auth_token');
            }
          }
          if (user) {
            if (isAdminOrCtv) {
              sessionStorage.setItem('admin_user', JSON.stringify(user));
              sessionStorage.setItem('student_user', JSON.stringify(user));
              localStorage.removeItem('admin_user');
              localStorage.removeItem('student_user');
            } else {
              localStorage.setItem('student_user', JSON.stringify(user));
              sessionStorage.removeItem('admin_user');
            }
          }
        }

        // 1. Nếu là Admin hoặc CTV -> Điều hướng ngay vào Dashboard Quản trị (/admin)
        if (isAdminOrCtv) {
          window.location.href = '/admin';
          return;
        }

        // 2. Logic Router / Guard theo 3 trạng thái cho Sinh viên:
        if (user?.status === 'pending') {
          window.location.href = '/pending-approval';
          return;
        }

        if (user?.status === 'rejected') {
          window.location.href = '/rejected-info';
          return;
        }

        // Với tài khoản sinh viên đã được duyệt (approved): điều hướng về trang chủ chính
        window.location.href = '/';
      } else {
        setError(result.message || 'Thông tin đăng nhập hoặc mật khẩu không chính xác');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSuccess = (registeredUser: SafeUser, registeredIdentifier?: string) => {
    // Đăng ký xong: chuyển về tab Đăng Nhập, điền sẵn tài khoản & hiển thị thông báo thành công
    setMode('login');
    if (registeredIdentifier) {
      setLoginId(registeredIdentifier);
    } else if (registeredUser.student_id || registeredUser.email || registeredUser.username) {
      setLoginId(registeredUser.student_id || registeredUser.email || registeredUser.username || '');
    }
    setPassword('');
    setError('');
    setSuccessMsg('🎉 Đăng ký tài khoản thành công! Vui lòng nhập mật khẩu để đăng nhập.');
  };

  return (
    <div className="sa-overlay" onClick={handleClose}>
      <div
        className="sa-card"
        style={mode === 'register' ? { maxWidth: '740px' } : { maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sa-header">
          <div className="sa-logo">🏆</div>
          <h2>{mode === 'login' ? 'Đăng Nhập Sinh Viên' : 'Đăng Ký Tài Khoản Sinh Viên'}</h2>
          <p>Giải Đấu Thể Thao Điện Tử Sinh Viên Đà Nẵng</p>
          <button className="sa-close" onClick={handleClose} aria-label="Đóng" type="button">
            ✕
          </button>
        </div>

        <div className="sa-tabs">
          <button
            className={`sa-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
            type="button"
          >
            🔑 Đăng Nhập
          </button>
          <button
            className={`sa-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
              setSuccessMsg('');
            }}
            type="button"
          >
            📝 Đăng Ký
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="sa-form">
            {successMsg && <div className="sa-success">{successMsg}</div>}

            <div className="sa-field">
              {/* 2. FORM ĐĂNG NHẬP: Label 'Nhập Email hoặc Mã sinh viên' */}
              <label>👤 Nhập Email hoặc Mã sinh viên *</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  setError('');
                }}
                placeholder="VD: 102230123 hoặc sinhvien@dut.udn.vn"
                required
                disabled={loading}
                autoCapitalize="none"
                autoComplete="username"
              />
              <small>Hệ thống tự động nhận diện Email sinh viên hoặc Mã số sinh viên (MSSV).</small>
            </div>

            <div className="sa-field">
              <label>🔐 Mật Khẩu *</label>
              <div className="sa-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Nhập mật khẩu của bạn"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="sa-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Hiện/ẩn mật khẩu"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <div className="sa-error">⚠️ {error}</div>}

            <button type="submit" className="sa-submit" disabled={loading}>
              {loading ? '⏳ Đang xác thực...' : '🚀 Đăng Nhập'}
            </button>

            <div className="sa-footer">
              <p>
                Chưa có tài khoản sinh viên?{' '}
                <button
                  className="sa-link"
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setSuccessMsg('');
                  }}
                  type="button"
                >
                  Đăng ký ngay
                </button>
              </p>
            </div>
          </form>
        ) : (
          <div style={{ marginTop: '6px' }}>
            <StudentRegistrationForm
              onSuccess={handleRegisterSuccess}
              onCancel={() => {
                setMode('login');
                setError('');
                setSuccessMsg('');
              }}
            />
            <div className="sa-footer" style={{ marginTop: '16px' }}>
              <p>
                Đã có tài khoản?{' '}
                <button
                  className="sa-link"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  type="button"
                >
                  Quay lại Đăng nhập
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
