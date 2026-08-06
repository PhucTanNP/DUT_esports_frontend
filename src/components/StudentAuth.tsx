'use client';

import { useState } from 'react';
import { authAPI } from '../services/auth.service';
import type { SafeUser } from '../types';
import '../styles/StudentAuth.css';

const STUDENT_FACULTY_BY_PREFIX: Record<string, string> = {
  '101': 'Khoa Cơ Khí',
  '102': 'Khoa Công Nghệ Thông Tin',
  '103': 'Khoa Cơ Khí Giao Thông',
  '104': 'Khoa Công Nghệ Nhiệt - Điện Lạnh',
  '105': 'Khoa Điện',
  '106': 'Khoa Điện Tử - Viễn Thông',
  '107': 'Khoa Hóa',
  '109': 'Khoa Xây Dựng Cầu Đường',
  '110': 'Khoa Xây Dựng Dân Dụng & Công Nghiệp',
  '111': 'Khoa Xây Dựng Công Trình Thủy',
  '117': 'Khoa Môi Trường',
  '118': 'Khoa Quản Lý Dự Án',
  '121': 'Khoa Kiến Trúc',
  '123': 'Khoa Khoa Học Công Nghệ Tiên Tiến',
};

type RegisterType = 'student' | 'free';

interface StudentAuthProps {
  /** Gọi khi đăng nhập/đăng ký thành công */
  onSuccess?: (user: SafeUser) => void;
  /** Đóng modal/trang */
  onClose?: () => void;
}

export default function StudentAuth({ onSuccess, onClose }: StudentAuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerType, setRegisterType] = useState<RegisterType>('student');
  const [open, setOpen] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedStudentId = studentId.trim();
  const studentFaculty = STUDENT_FACULTY_BY_PREFIX[normalizedStudentId.slice(0, 3)];
  const isStudentRegister = mode === 'register' && registerType === 'student';

  /** Đóng modal — ưu tiên onClose từ cha, nếu không có thì tự đóng nội bộ. */
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setOpen(false);
    }
  };

  const resetForm = () => {
    setStudentId('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setClassName('');
    setError('');
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setRegisterType('student');
    resetForm();
  };

  const handleStudentIdChange = (value: string) => {
    setStudentId(value.replace(/\D/g, ''));
  };

  const getRegisterTitle = () => (registerType === 'student' ? 'Đăng Ký Sinh Viên DUT' : 'Đăng Ký Tài Khoản Tự Do');

  const getSubmitLabel = () => {
    if (loading) return '⏳ Đang xử lý...';
    if (mode === 'login') return '🚀 Đăng Nhập';
    return registerType === 'student' ? '✅ Đăng Ký Sinh Viên' : '✅ Đăng Ký Tự Do';
  };

  const getPasswordHint = () => (mode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu');

  // Nếu đã đóng nội bộ (không có onClose) thì không render gì
  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Vui lòng nhập họ và tên');
        return;
      }
      if (!password.trim()) {
        setError('Vui lòng nhập mật khẩu');
        return;
      }
      if (password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }
    }

    if (mode === 'login' && (!normalizedStudentId || !password)) {
      setError('Vui lòng nhập mã số sinh viên và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await authAPI.studentLogin(normalizedStudentId, password);
      } else if (isStudentRegister) {
        if (!normalizedStudentId) {
          setError('Vui lòng nhập mã số sinh viên');
          return;
        }
        if (!/^\d+$/.test(normalizedStudentId)) {
          setError('Mã số sinh viên phải là số');
          return;
        }
        if (normalizedStudentId.length < 3) {
          setError('Mã số sinh viên phải có ít nhất 3 số đầu để xác định khoa');
          return;
        }

        const facultyCode = normalizedStudentId.slice(0, 3);
        const faculty = STUDENT_FACULTY_BY_PREFIX[facultyCode];
        if (!faculty) {
          setError('3 số đầu của MSSV không hợp lệ, vui lòng kiểm tra lại');
          return;
        }
        if (!className.trim()) {
          setError('Vui lòng nhập lớp');
          return;
        }

        result = await authAPI.studentRegister({
          student_id: normalizedStudentId,
          password,
          full_name: fullName.trim(),
          faculty,
          class_name: className.trim(),
        });
      } else {
        if (!username.trim()) {
          setError('Vui lòng nhập tên đăng nhập');
          return;
        }

        result = await authAPI.freeRegister({
          username: username.trim(),
          password,
          full_name: fullName.trim(),
        });
      }

      if (result.success) {
        onSuccess?.(result.user as SafeUser);
      } else {
        setError(result.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sa-overlay" onClick={handleClose}>
      <div className="sa-card" onClick={(e) => e.stopPropagation()}>
        <div className="sa-header">
          <div className="sa-logo">🎓</div>
          <h2>{mode === 'login' ? 'Đăng Nhập Sinh Viên' : getRegisterTitle()}</h2>
          <p>CLB Thể thao điện tử DUT ESPORTS</p>
          <button className="sa-close" onClick={handleClose} aria-label="Đóng" type="button">
            ✕
          </button>
        </div>

        <div className="sa-tabs">
          <button
            className={`sa-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >
            🔑 Đăng Nhập
          </button>
          <button
            className={`sa-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >
            📝 Đăng Ký
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sa-form">
          {mode === 'login' ? (
            <div className="sa-field">
              <label>🎓 Mã Số Sinh Viên *</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => handleStudentIdChange(e.target.value)}
                placeholder="VD: 2210123456"
                required
                disabled={loading}
                inputMode="numeric"
                pattern="[0-9]*"
              />
              <small>Chỉ nhập số. Đây cũng là tên đăng nhập của sinh viên.</small>
            </div>
          ) : (
            <>
              <div className="sa-register-types">
                <button
                  type="button"
                  className={`sa-type ${registerType === 'student' ? 'active' : ''}`}
                  onClick={() => setRegisterType('student')}
                  disabled={loading}
                >
                  Sinh viên DUT
                </button>
                <button
                  type="button"
                  className={`sa-type ${registerType === 'free' ? 'active' : ''}`}
                  onClick={() => setRegisterType('free')}
                  disabled={loading}
                >
                  Tự do
                </button>
              </div>

              {isStudentRegister ? (
                <div className="sa-field">
                  <label>🎓 MSSV *</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => handleStudentIdChange(e.target.value)}
                    placeholder="VD: 2210123456"
                    required
                    disabled={loading}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <small>MSSV phải là số và 3 số đầu dùng để xác định khoa.</small>
                </div>
              ) : (
                <div className="sa-field">
                  <label>👤 Tên đăng nhập *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="VD: nguyenvana"
                    required
                    disabled={loading}
                    autoCapitalize="none"
                    autoComplete="username"
                  />
                  <small>Dùng tên đăng nhập này cho luồng tự do.</small>
                </div>
              )}

              <div className="sa-field">
                <label>👤 Họ và Tên *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  required
                  disabled={loading}
                />
              </div>

              {isStudentRegister ? (
                <div className="sa-row">
                  <div className="sa-field">
                    <label>🏫 Khoa</label>
                    <input
                      type="text"
                      value={studentFaculty || ''}
                      readOnly
                      disabled={loading}
                      placeholder="Tự động xác định theo MSSV"
                    />
                    <small>
                      {studentFaculty ? `Khớp theo 3 số đầu: ${normalizedStudentId.slice(0, 3)}` : 'Nhập đủ MSSV hợp lệ để hệ thống tự xác định khoa.'}
                    </small>
                  </div>
                  <div className="sa-field">
                    <label>📚 Lớp *</label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="VD: 22T1"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              ) : (
                <div className="sa-field">
                  <label>🪪 Luồng tự do</label>
                  <input type="text" value="Chỉ cần tên đăng nhập, họ tên và mật khẩu" readOnly disabled={loading} />
                  <small>Không cần MSSV và không cần chọn khoa.</small>
                </div>
              )}
            </>
          )}

          <div className="sa-field">
            <label>🔐 Mật Khẩu *</label>
            <div className="sa-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={getPasswordHint()}
                required
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

          {mode === 'register' && (
            <div className="sa-field">
              <label>🔐 Xác Nhận Mật Khẩu *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                required
                disabled={loading}
              />
            </div>
          )}

          {error && <div className="sa-error">⚠️ {error}</div>}

          <button type="submit" className="sa-submit" disabled={loading}>
            {getSubmitLabel()}
          </button>
        </form>

        <div className="sa-footer">
          <p>
            {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              className="sa-link"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              type="button"
            >
              {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
