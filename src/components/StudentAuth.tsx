import { useState } from 'react';
import { authAPI } from '../services/auth.service';
import type { SafeUser } from '../types';
import '../styles/StudentAuth.css';

interface StudentAuthProps {
  /** Gọi khi đăng nhập/đăng ký thành công */
  onSuccess?: (user: SafeUser) => void;
  /** Đóng modal/trang */
  onClose?: () => void;
}

export default function StudentAuth({ onSuccess, onClose }: StudentAuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [open, setOpen] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [faculty, setFaculty] = useState('');
  const [className, setClassName] = useState('');
  const [course, setCourse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setFaculty('');
    setClassName('');
    setCourse('');
    setError('');
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    resetForm();
  };

  // Nếu đã đóng nội bộ (không có onClose) thì không render gì
  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate chung
    if (!studentId.trim() || !password) {
      setError('Vui lòng nhập mã số sinh viên và mật khẩu');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setError('Vui lòng nhập họ và tên');
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

    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await authAPI.studentLogin(studentId.trim().toUpperCase(), password);
      } else {
        result = await authAPI.studentRegister({
          student_id: studentId.trim().toUpperCase(),
          password,
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          faculty: faculty.trim() || undefined,
          class_name: className.trim() || undefined,
          course: course.trim() || undefined,
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
        {/* Header */}
        <div className="sa-header">
          <div className="sa-logo">🎓</div>
          <h2>{mode === 'login' ? 'Đăng Nhập Sinh Viên' : 'Đăng Ký Sinh Viên'}</h2>
          <p>CLB Thể thao điện tử DUT ESPORTS</p>
          <button className="sa-close" onClick={handleClose} aria-label="Đóng" type="button">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="sa-tabs">
          <button
            className={`sa-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            🔑 Đăng Nhập
          </button>
          <button
            className={`sa-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            📝 Đăng Ký
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="sa-form">
          <div className="sa-field">
            <label>🎓 Mã Số Sinh Viên *</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="VD: 22T1020234"
              required
              disabled={loading}
              autoCapitalize="characters"
            />
            <small>Tự động chuyển in hoa. Ví dụ: 22T1020234</small>
          </div>

          {mode === 'register' && (
            <>
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

              <div className="sa-row">
                <div className="sa-field">
                  <label>🏫 Khoa/Viện</label>
                  <input
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="VD: Công nghệ Thông tin"
                    disabled={loading}
                  />
                </div>
                <div className="sa-field">
                  <label>📚 Lớp</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="VD: 22T1"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="sa-row">
                <div className="sa-field">
                  <label>📅 Khóa</label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="VD: K22"
                    disabled={loading}
                  />
                </div>
                <div className="sa-field">
                  <label>📱 Số Điện Thoại</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0905123456"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="sa-field">
                <label>📧 Email (tùy chọn)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: sinhvien@dut.udn.vn"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="sa-field">
            <label>🔐 Mật Khẩu *</label>
            <div className="sa-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu'}
                required
                disabled={loading}
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
            {loading
              ? '⏳ Đang xử lý...'
              : mode === 'login'
                ? '🚀 Đăng Nhập'
                : '✅ Đăng Ký'}
          </button>
        </form>

        {/* Footer */}
        <div className="sa-footer">
          <p>
            {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              className="sa-link"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
