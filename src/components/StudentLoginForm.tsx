'use client';

import React, { useState } from 'react';
import { participantAPI } from '../services/participant.service';
import type { SafeUser } from '../types';
import '../styles/StudentRegistrationForm.css';

interface StudentLoginFormProps {
  onSuccess?: (user: SafeUser) => void;
  onSwitchToRegister?: () => void;
}

export default function StudentLoginForm({ onSuccess, onSwitchToRegister }: StudentLoginFormProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = loginId.trim();
    if (!cleanId || !password) {
      setError('Vui lòng nhập Email/MSSV và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      const result = await participantAPI.login(cleanId, password);

      if (result.success && (result.data || (result as any).user || (result as any).participant)) {
        const user = (result.data || (result as any).user || (result as any).participant) as SafeUser;
        if (typeof window !== 'undefined') {
          if (result.token) {
            localStorage.setItem('auth_token', result.token);
          }
          localStorage.setItem('student_user', JSON.stringify(user));
        }

        // Logic Router / Guard theo 3 trạng thái
        if (user.status === 'pending') {
          window.location.href = '/pending-approval';
          return;
        }
        if (user.status === 'rejected') {
          window.location.href = '/rejected-info';
          return;
        }

        if (onSuccess) {
          onSuccess(user);
        } else {
          window.location.href = '/';
        }
      } else {
        setError(result.message || 'Email/MSSV hoặc mật khẩu không chính xác');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="srf-container" style={{ maxWidth: '440px', margin: '0 auto' }}>
      <div className="srf-header">
        <h2 className="srf-title">Đăng Nhập Sinh Viên</h2>
        <p className="srf-subtitle">Hệ thống giải đấu Thể thao Điện tử Sinh viên</p>
      </div>

      <form onSubmit={handleLogin} className="srf-form">
        {/* Label theo yêu cầu: 'Nhập Email hoặc Mã sinh viên' */}
        <div className="srf-group">
          <label>
            Nhập Email hoặc Mã sinh viên <span className="srf-required">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="VD: 102230123 hoặc sinhvien@dut.udn.vn"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            disabled={loading}
            autoCapitalize="none"
            autoComplete="username"
          />
        </div>

        <div className="srf-group">
          <label>
            Mật Khẩu <span className="srf-required">*</span>
          </label>
          <div className="srf-password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="srf-eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Ẩn hiện mật khẩu"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {error && <div className="srf-error-alert">⚠️ {error}</div>}

        <button type="submit" className="srf-submit-btn" disabled={loading}>
          {loading ? '⏳ Đang Xác Thực...' : '🚀 Đăng Nhập'}
        </button>

        {onSwitchToRegister && (
          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', color: '#94a3b8' }}>
            Chưa có tài khoản?{' '}
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ff6b00',
                fontWeight: 'bold',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={onSwitchToRegister}
            >
              Đăng ký sinh viên ngay
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
