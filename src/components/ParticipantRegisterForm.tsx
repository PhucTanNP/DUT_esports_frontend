'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getDutFaculties, DUT_FACULTIES, authAPI } from '../services/auth.service';
import { participantAPI, type ParticipantRow } from '../services/participant.service';
import type { SafeUser } from '../types';
import '../styles/ParticipantRegisterForm.css';

interface ParticipantRegisterFormProps {
  onSuccess?: (user: SafeUser, registeredIdentifier?: string) => void;
  onCancel?: () => void;
}

export default function ParticipantRegisterForm({ onSuccess, onCancel }: ParticipantRegisterFormProps) {
  const [accountType, setAccountType] = useState<'dut_student' | 'external'>('dut_student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [cccdFrontUrl, setCccdFrontUrl] = useState('');
  const [cccdBackUrl, setCccdBackUrl] = useState('');

  // Sinh viên DUT fields
  const [studentId, setStudentId] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [className, setClassName] = useState('');
  const [studentCardUrl, setStudentCardUrl] = useState('');
  const [selfieWithStudentCardUrl, setSelfieWithStudentCardUrl] = useState('');

  // External fields
  const [username, setUsername] = useState('');

  // State quản lý UI
  const [faculties, setFaculties] = useState<string[]>([...DUT_FACULTIES]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Hidden File input refs
  const cccdFrontRef = useRef<HTMLInputElement>(null);
  const cccdBackRef = useRef<HTMLInputElement>(null);
  const studentCardRef = useRef<HTMLInputElement>(null);
  const selfieCardRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDutFaculties().then(setFaculties);
  }, []);

  const handleFileUpload = async (file: File, fieldName: string) => {
    try {
      setUploadingField(fieldName);
      setError(null);
      const res = await participantAPI.uploadDocument(file);
      if (res.success && res.url) {
        if (fieldName === 'cccd_front') setCccdFrontUrl(res.url);
        if (fieldName === 'cccd_back') setCccdBackUrl(res.url);
        if (fieldName === 'student_card') setStudentCardUrl(res.url);
        if (fieldName === 'selfie_card') setSelfieWithStudentCardUrl(res.url);
      } else {
        setError(res.message || 'Tải ảnh lên thất bại');
      }
    } catch (err) {
      setError('Lỗi khi tải ảnh: ' + (err as Error).message);
    } finally {
      setUploadingField(null);
    }
  };

  const validateForm = (): boolean => {
    setError(null);

    if (!fullName.trim()) {
      setError('Vui lòng nhập Họ và Tên');
      return false;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Vui lòng nhập địa chỉ Email hợp lệ');
      return false;
    }
    if (!password || password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return false;
    }
    if (!cccdNumber.trim() || !/^\d{9,12}$/.test(cccdNumber.trim())) {
      setError('Số CCCD/CMND phải là dãy 9 đến 12 chữ số');
      return false;
    }
    if (!cccdFrontUrl) {
      setError('Vui lòng tải lên ảnh Mặt Trước CCCD');
      return false;
    }
    if (!cccdBackUrl) {
      setError('Vui lòng tải lên ảnh Mặt Sau CCCD');
      return false;
    }

    if (accountType === 'dut_student') {
      const cleanSid = studentId.trim();
      if (!cleanSid || !/^\d{8,15}$/.test(cleanSid)) {
        setError('Mã số sinh viên (MSSV) không hợp lệ (phải là 8-15 chữ số)');
        return false;
      }
      if (!facultyName) {
        setError('Vui lòng chọn Khoa sinh viên đang học');
        return false;
      }
      if (!className.trim()) {
        setError('Vui lòng nhập Lớp sinh viên');
        return false;
      }
      if (!studentCardUrl) {
        setError('Vui lòng tải lên ảnh Thẻ Sinh Viên');
        return false;
      }
      if (!selfieWithStudentCardUrl) {
        setError('Vui lòng tải lên ảnh Chụp Selfie Cầm Thẻ Sinh Viên');
        return false;
      }
    } else {
      const cleanUser = username.trim().toLowerCase();
      if (!cleanUser || !/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
        setError('Tên đăng nhập (Username) không hợp lệ (3-32 ký tự, chỉ gồm chữ, số, _, -, .)');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const payload = {
        account_type: accountType,
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        cccd_number: cccdNumber.trim(),
        cccd_front_url: cccdFrontUrl,
        cccd_back_url: cccdBackUrl,
        ...(accountType === 'dut_student'
          ? {
              student_id: studentId.trim(),
              faculty_name: facultyName,
              class_name: className.trim(),
              student_card_url: studentCardUrl,
              selfie_with_student_card_url: selfieWithStudentCardUrl,
            }
          : {
              username: username.trim().toLowerCase(),
            }),
      };

      const res = await participantAPI.register(payload);
      if (res.success) {
        authAPI.logout();
        setSuccess('Đăng ký tài khoản giải đấu thành công! Vui lòng đăng nhập để tiếp tục.');
        const user = (res.data || (res as any).user || (res as any).participant) as SafeUser;
        const identifier = (accountType === 'dut_student' ? studentId.trim() : username.trim()) || email.trim();
        setTimeout(() => {
          if (user) onSuccess?.(user, identifier);
        }, 1200);
      } else {
        setError(res.message || 'Đăng ký thất bại, vui lòng kiểm tra lại thông tin');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prf-container">
      <div className="prf-header">
        <div className="prf-badge">🏆 DUT Esports Portal</div>
        <h2>Đăng Ký Tài Khoản Giải Đấu</h2>
        <p>Chọn loại tài khoản và cung cấp giấy tờ xác thực để tham gia thi đấu</p>
      </div>

      {/* Tabs chọn loại tài khoản */}
      <div className="prf-type-selector">
        <button
          type="button"
          className={`prf-type-btn ${accountType === 'dut_student' ? 'active' : ''}`}
          onClick={() => setAccountType('dut_student')}
          disabled={loading}
        >
          <span className="prf-type-icon">🎓</span>
          <span>Sinh Viên DUT</span>
        </button>
        <button
          type="button"
          className={`prf-type-btn ${accountType === 'external' ? 'active' : ''}`}
          onClick={() => setAccountType('external')}
          disabled={loading}
        >
          <span className="prf-type-icon">🌐</span>
          <span>Game Thủ Tự Do</span>
        </button>
      </div>

      <form className="prf-form" onSubmit={handleSubmit}>
        {/* THÔNG TIN CHUNG */}
        <div className="prf-section-title">
          <span>👤 Thông Tin Cá Nhân</span>
        </div>

        <div className="prf-row">
          <div className="prf-group">
            <label>Họ và Tên *</label>
            <input
              type="text"
              placeholder="VD: Nguyễn Văn An"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="prf-group">
            <label>Email Liên Hệ *</label>
            <input
              type="email"
              placeholder={accountType === 'dut_student' ? 'VD: 102230000@sv1.dut.udn.vn' : 'VD: email@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <span className="prf-hint">Dùng để nhận thông báo duyệt hồ sơ và giải đấu</span>
          </div>
        </div>

        <div className="prf-row">
          <div className="prf-group">
            <label>Mật Khẩu *</label>
            <input
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="prf-group">
            <label>Xác Nhận Mật Khẩu *</label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* THÔNG TIN ĐẶC THÙ THEO LOẠI TÀI KHOẢN */}
        {accountType === 'dut_student' ? (
          <>
            <div className="prf-section-title">
              <span>🎓 Thông Tin Sinh Viên DUT</span>
            </div>

            <div className="prf-row">
              <div className="prf-group">
                <label>Mã Số Sinh Viên (MSSV) *</label>
                <input
                  type="text"
                  placeholder="VD: 102230123"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
                  required
                  disabled={loading}
                  maxLength={15}
                />
              </div>
              <div className="prf-group">
                <label>Lớp Sinh Hoạt *</label>
                <input
                  type="text"
                  placeholder="VD: 23TCLC_DT1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="prf-group">
              <label>Khoa *</label>
              <select
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">-- Chọn Khoa tại Đại học Bách khoa --</option>
                {faculties.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="prf-section-title">
              <span>🌐 Thông Tin Tài Khoản Tự Do</span>
            </div>
            <div className="prf-group">
              <label>Tên Đăng Nhập (Username) *</label>
              <input
                type="text"
                placeholder="VD: shadow_ninja99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoCapitalize="none"
              />
              <span className="prf-hint">Dùng để đăng nhập và hiển thị tên người chơi</span>
            </div>
          </>
        )}

        {/* XÁC THỰC GIẤY TỜ TUỲ THÂN (CCCD) */}
        <div className="prf-section-title">
          <span>🪪 Giấy Tờ Xác Thực CCCD/CMND</span>
        </div>

        <div className="prf-group">
          <label>Số Căn Cước Công Dân (CCCD / CMND) *</label>
          <input
            type="text"
            placeholder="VD: 048203001234 (9-12 số)"
            value={cccdNumber}
            onChange={(e) => setCccdNumber(e.target.value.replace(/\D/g, ''))}
            required
            disabled={loading}
            maxLength={12}
          />
        </div>

        <div className="prf-upload-grid">
          {/* CCCD Mặt Trước */}
          <div
            className={`prf-upload-box ${cccdFrontUrl ? 'has-image' : ''}`}
            onClick={() => cccdFrontRef.current?.click()}
          >
            <div className="prf-upload-label">Ảnh Mặt Trước CCCD *</div>
            {cccdFrontUrl ? (
              <img src={cccdFrontUrl} alt="CCCD Mặt trước" className="prf-preview-img" />
            ) : (
              <div className="prf-upload-placeholder">
                <span className="prf-upload-icon">📷</span>
                <span>{uploadingField === 'cccd_front' ? '⏳ Đang tải ảnh...' : 'Nhấn để tải ảnh mặt trước'}</span>
                <span className="prf-upload-btn-mini">Chọn ảnh</span>
              </div>
            )}
            <input
              type="file"
              ref={cccdFrontRef}
              className="prf-file-input"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'cccd_front')}
            />
          </div>

          {/* CCCD Mặt Sau */}
          <div
            className={`prf-upload-box ${cccdBackUrl ? 'has-image' : ''}`}
            onClick={() => cccdBackRef.current?.click()}
          >
            <div className="prf-upload-label">Ảnh Mặt Sau CCCD *</div>
            {cccdBackUrl ? (
              <img src={cccdBackUrl} alt="CCCD Mặt sau" className="prf-preview-img" />
            ) : (
              <div className="prf-upload-placeholder">
                <span className="prf-upload-icon">📷</span>
                <span>{uploadingField === 'cccd_back' ? '⏳ Đang tải ảnh...' : 'Nhấn để tải ảnh mặt sau'}</span>
                <span className="prf-upload-btn-mini">Chọn ảnh</span>
              </div>
            )}
            <input
              type="file"
              ref={cccdBackRef}
              className="prf-file-input"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'cccd_back')}
            />
          </div>
        </div>

        {/* XÁC THỰC THẺ SINH VIÊN (Chỉ hiện khi là dut_student) */}
        {accountType === 'dut_student' && (
          <>
            <div className="prf-section-title">
              <span>🎴 Xác Thực Thẻ Sinh Viên DUT</span>
            </div>

            <div className="prf-upload-grid">
              {/* Thẻ sinh viên */}
              <div
                className={`prf-upload-box ${studentCardUrl ? 'has-image' : ''}`}
                onClick={() => studentCardRef.current?.click()}
              >
                <div className="prf-upload-label">Ảnh Thẻ Sinh Viên *</div>
                {studentCardUrl ? (
                  <img src={studentCardUrl} alt="Thẻ sinh viên" className="prf-preview-img" />
                ) : (
                  <div className="prf-upload-placeholder">
                    <span className="prf-upload-icon">🪪</span>
                    <span>{uploadingField === 'student_card' ? '⏳ Đang tải ảnh...' : 'Nhấn để tải ảnh Thẻ SV'}</span>
                    <span className="prf-upload-btn-mini">Chọn ảnh</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={studentCardRef}
                  className="prf-file-input"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'student_card')}
                />
              </div>

              {/* Selfie cầm thẻ */}
              <div
                className={`prf-upload-box ${selfieWithStudentCardUrl ? 'has-image' : ''}`}
                onClick={() => selfieCardRef.current?.click()}
              >
                <div className="prf-upload-label">Ảnh Selfie Cầm Thẻ SV *</div>
                {selfieWithStudentCardUrl ? (
                  <img src={selfieWithStudentCardUrl} alt="Selfie cầm thẻ" className="prf-preview-img" />
                ) : (
                  <div className="prf-upload-placeholder">
                    <span className="prf-upload-icon">🤳</span>
                    <span>{uploadingField === 'selfie_card' ? '⏳ Đang tải ảnh...' : 'Ảnh chân dung cầm thẻ'}</span>
                    <span className="prf-upload-btn-mini">Chọn ảnh</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={selfieCardRef}
                  className="prf-file-input"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'selfie_card')}
                />
              </div>
            </div>
          </>
        )}

        {/* Thông báo lỗi / thành công */}
        {error && <div className="prf-error-banner">⚠️ {error}</div>}
        {success && <div className="prf-success-banner">✓ {success}</div>}

        {/* Nút gửi */}
        <button type="submit" className="prf-submit-btn" disabled={loading || Boolean(uploadingField)}>
          {loading ? (
            <>
              <span className="prf-spinner"></span>
              <span>Đang gửi hồ sơ...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Đăng Ký & Gửi Hồ Sơ Xét Duyệt</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
