'use client';

import React, { useRef, useState } from 'react';
import { authAPI } from '../services/auth.service';
import { participantAPI, UNIVERSITIES } from '../services/participant.service';
import type { SafeUser } from '../types';
import '../styles/StudentRegistrationForm.css';

interface StudentRegistrationFormProps {
  onSuccess?: (user: SafeUser, registeredIdentifier?: string) => void;
  onCancel?: () => void;
}

export default function StudentRegistrationForm({ onSuccess, onCancel }: StudentRegistrationFormProps) {
  // 1. Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [universityName, setUniversityName] = useState<string>(UNIVERSITIES[0]);
  const [studentId, setStudentId] = useState('');
  const [className, setClassName] = useState('');
  const [facultyName, setFacultyName] = useState('');

  // 2. Upload state & image preview
  const [studentCardUrl, setStudentCardUrl] = useState('');
  const [studentCardPreview, setStudentCardPreview] = useState<string | null>(null);
  const [isUploadingCard, setIsUploadingCard] = useState(false);

  const [selfieUrl, setSelfieUrl] = useState('');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);

  // 3. UI interaction state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // File input refs
  const cardInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Xử lý upload ảnh Thẻ sinh viên
  const handleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side preview ngay lập tức
    const previewUrl = URL.createObjectURL(file);
    setStudentCardPreview(previewUrl);
    setError(null);

    try {
      setIsUploadingCard(true);
      const res = await participantAPI.uploadDocument(file);
      if (res.success && res.url) {
        setStudentCardUrl(res.url);
      } else {
        setError(res.message || 'Tải ảnh thẻ sinh viên thất bại');
      }
    } catch (err) {
      setError('Lỗi khi tải ảnh thẻ: ' + (err as Error).message);
    } finally {
      setIsUploadingCard(false);
    }
  };

  // Xử lý upload ảnh Selfie cầm thẻ
  const handleSelfieFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side preview ngay lập tức
    const previewUrl = URL.createObjectURL(file);
    setSelfiePreview(previewUrl);
    setError(null);

    try {
      setIsUploadingSelfie(true);
      const res = await participantAPI.uploadDocument(file);
      if (res.success && res.url) {
        setSelfieUrl(res.url);
      } else {
        setError(res.message || 'Tải ảnh chân dung cầm thẻ thất bại');
      }
    } catch (err) {
      setError('Lỗi khi tải ảnh chân dung: ' + (err as Error).message);
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate Required client-side
    if (!fullName.trim()) return setError('Vui lòng nhập Họ và tên');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Email không hợp lệ');
    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) return setError('Số điện thoại không hợp lệ');
    if (!password || password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự');
    if (!universityName.trim()) return setError('Vui lòng chọn Trường Đại học');
    if (!studentId.trim() || !/^\d{8,15}$/.test(studentId.trim())) return setError('Mã sinh viên (MSSV) phải là dãy 8-15 chữ số');
    if (!className.trim()) return setError('Vui lòng nhập Lớp');
    if (!facultyName.trim()) return setError('Vui lòng nhập Khoa');

    if (!studentCardUrl) return setError('Vui lòng tải lên Ảnh thẻ sinh viên');
    if (!selfieUrl) return setError('Vui lòng tải lên Ảnh chụp chân dung cầm thẻ sinh viên');

    try {
      setLoading(true);
      const payload = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phoneNumber.trim(),
        password,
        university_name: universityName.trim(),
        student_id: studentId.trim(),
        class_name: className.trim(),
        faculty_name: facultyName.trim(),
        student_card_url: studentCardUrl,
        selfie_with_student_card_url: selfieUrl,
        account_type: 'dut_student' as const,
      };

      const result = await participantAPI.register(payload);

      if (result.success && result.data) {
        // Đăng xuất và xóa mọi session cũ để đảm bảo người dùng phải đăng nhập
        authAPI.logout();
        setSuccess('Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.');
        const registeredIdentifier = studentId.trim() || email.trim();
        setTimeout(() => {
          onSuccess?.(result.data as SafeUser, registeredIdentifier);
        }, 1200);
      } else {
        setError(result.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="srf-container">
      <div className="srf-header">
        <h2 className="srf-title">Đăng Ký Tài Khoản Sinh Viên</h2>
        <p className="srf-subtitle">Tham gia hệ thống giải đấu Thể thao Điện tử Sinh viên</p>
      </div>

      <form onSubmit={handleSubmit} className="srf-form">
        {/* Hàng 1: Họ tên & Email */}
        <div className="srf-row">
          <div className="srf-group">
            <label>
              Họ và Tên <span className="srf-required">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="srf-group">
            <label>
              Địa Chỉ Email <span className="srf-required">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="VD: sinhvien@dut.udn.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Hàng 2: Số điện thoại & Mật khẩu */}
        <div className="srf-row">
          <div className="srf-group">
            <label>
              Số Điện Thoại <span className="srf-required">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="VD: 0905123456"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))}
              disabled={loading}
              maxLength={12}
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
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="srf-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        </div>

        {/* Hàng 3: Trường Đại học (Dropdown với 11 trường) */}
        <div className="srf-group">
          <label>
            Trường Đại Học <span className="srf-required">*</span>
          </label>
          <select
            value={universityName}
            onChange={(e) => setUniversityName(e.target.value)}
            disabled={loading}
            required
          >
            {UNIVERSITIES.map((uni) => (
              <option key={uni} value={uni}>
                {uni}
              </option>
            ))}
          </select>
        </div>

        {/* Hàng 4: MSSV, Lớp, Khoa */}
        <div className="srf-row">
          <div className="srf-group">
            <label>
              Mã Sinh Viên (MSSV) <span className="srf-required">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: 102230123"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              maxLength={15}
            />
          </div>

          <div className="srf-group">
            <label>
              Lớp Sinh Hoạt <span className="srf-required">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: 23TCLC_DT1"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="srf-group">
          <label>
            Khoa <span className="srf-required">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="VD: Khoa Công nghệ Thông tin"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Khu vực Upload Ảnh (Preview trước khi upload) */}
        <div className="srf-upload-section">
          <div className="srf-section-label">
            <span>📷</span>
            <span>Ảnh Giấy Tờ Xác Thực Sinh Viên (Bắt buộc)</span>
          </div>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={cardInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleCardFileChange}
          />
          <input
            type="file"
            ref={selfieInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleSelfieFileChange}
          />

          <div className="srf-upload-grid">
            {/* Box 1: Ảnh thẻ sinh viên */}
            <div
              className={`srf-upload-card ${studentCardPreview || studentCardUrl ? 'has-preview' : ''} ${
                isUploadingCard ? 'uploading' : ''
              }`}
              onClick={() => cardInputRef.current?.click()}
            >
              <div className="srf-upload-card-title">
                Ảnh Thẻ Sinh Viên <span className="srf-required">*</span>
              </div>
              {studentCardPreview || studentCardUrl ? (
                <>
                  <div className="srf-preview-wrapper">
                    <img
                      src={studentCardPreview || studentCardUrl}
                      alt="Xem trước thẻ sinh viên"
                      className="srf-preview-img"
                    />
                  </div>
                  <span className="srf-change-badge">
                    {isUploadingCard ? '⏳ Đang tải...' : '✓ Nhấp để đổi ảnh'}
                  </span>
                </>
              ) : (
                <div className="srf-upload-placeholder">
                  <span className="srf-upload-icon">🪪</span>
                  <span>Tải lên ảnh Thẻ SV</span>
                  <span className="srf-upload-hint">Chụp rõ nét MSSV và Họ tên</span>
                </div>
              )}
            </div>

            {/* Box 2: Ảnh chụp chân dung cầm thẻ sinh viên */}
            <div
              className={`srf-upload-card ${selfiePreview || selfieUrl ? 'has-preview' : ''} ${
                isUploadingSelfie ? 'uploading' : ''
              }`}
              onClick={() => selfieInputRef.current?.click()}
            >
              <div className="srf-upload-card-title">
                Ảnh Chân Dung Cầm Thẻ SV <span className="srf-required">*</span>
              </div>
              {selfiePreview || selfieUrl ? (
                <>
                  <div className="srf-preview-wrapper">
                    <img
                      src={selfiePreview || selfieUrl}
                      alt="Xem trước selfie cầm thẻ"
                      className="srf-preview-img"
                    />
                  </div>
                  <span className="srf-change-badge">
                    {isUploadingSelfie ? '⏳ Đang tải...' : '✓ Nhấp để đổi ảnh'}
                  </span>
                </>
              ) : (
                <div className="srf-upload-placeholder">
                  <span className="srf-upload-icon">🤳</span>
                  <span>Tải ảnh chân dung cầm thẻ</span>
                  <span className="srf-upload-hint">Chụp rõ khuôn mặt & thẻ SV</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thông báo lỗi & thành công */}
        {error && <div className="srf-error-alert">⚠️ {error}</div>}
        {success && <div className="srf-success-alert">✓ {success}</div>}

        {/* Nút Submit */}
        <button
          type="submit"
          className="srf-submit-btn"
          disabled={loading || isUploadingCard || isUploadingSelfie}
        >
          {loading ? '⏳ Đang Xử Lý Đăng Ký...' : '🚀 Hoàn Tất Đăng Ký Sinh Viên'}
        </button>

        {onCancel && (
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '4px',
            }}
            onClick={onCancel}
          >
            Hủy và quay lại
          </button>
        )}
      </form>
    </div>
  );
}
