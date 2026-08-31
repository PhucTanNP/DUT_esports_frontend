'use client';

import React, { useState, useRef } from 'react';
import { participantAPI, UNIVERSITIES, type RegisterParticipantPayload } from '../services/participant.service';
import { DUT_FACULTIES } from '../services/auth.service';
import type { SafeUser } from '../types';
import '../styles/ParticipantRegisterForm.css';

interface ParticipantRegisterFormProps {
  onSuccess?: (user: SafeUser, identifier?: string) => void;
  onCancel?: () => void;
}

export default function ParticipantRegisterForm({ onSuccess, onCancel }: ParticipantRegisterFormProps) {
  const [accountType, setAccountType] = useState<'internal' | 'external' | 'dut_student'>('dut_student');

  // Thông tin cơ bản
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sinh viên DUT
  const [studentId, setStudentId] = useState('');
  const [universityName, setUniversityName] = useState<string>(UNIVERSITIES[0]);
  const [facultyName, setFacultyName] = useState<string>(DUT_FACULTIES[0]);
  const [className, setClassName] = useState('');

  // 2 Ảnh thẻ sinh viên KYC (Zero CCCD Invariant)
  const [studentCardUrl, setStudentCardUrl] = useState('');
  const [selfieWithStudentCardUrl, setSelfieWithStudentCardUrl] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const studentCardRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  // Tải ảnh tài liệu
  const handleFileUpload = async (file: File, fieldName: 'student_card' | 'selfie') => {
    try {
      setUploadingField(fieldName);
      setError(null);
      const res = await participantAPI.uploadDocument(file);
      if (res.success && res.url) {
        if (fieldName === 'student_card') setStudentCardUrl(res.url);
        if (fieldName === 'selfie') setSelfieWithStudentCardUrl(res.url);
      } else {
        setError(res.message || 'Tải ảnh lên thất bại');
      }
    } catch (err) {
      setError('Lỗi tải ảnh: ' + (err as Error).message);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate
    if (!fullName.trim()) return setError('Vui lòng nhập Họ và Tên');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Email không hợp lệ');
    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) return setError('Số điện thoại không hợp lệ');
    if (!password || password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự');
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận không khớp');

    if (!studentId.trim()) return setError('Mã số sinh viên (MSSV) là bắt buộc');
    if (!className.trim()) return setError('Vui lòng nhập Lớp sinh hoạt');
    if (!studentCardUrl) return setError('Vui lòng tải lên Ảnh thẻ sinh viên (Mặt trước)');
    if (!selfieWithStudentCardUrl) return setError('Vui lòng tải lên Ảnh chụp chân dung cầm thẻ sinh viên');

    try {
      setLoading(true);

      const payload: RegisterParticipantPayload = {
        account_type: accountType,
        email: email.trim().toLowerCase(),
        phone_number: phoneNumber.trim(),
        password,
        full_name: fullName.trim(),
        student_id: studentId.trim(),
        university_name: universityName,
        faculty_name: facultyName,
        class_name: className.trim(),
        student_card_url: studentCardUrl,
        selfie_with_student_card_url: selfieWithStudentCardUrl,
      };

      const res = await participantAPI.register(payload);
      if (res.success && (res.data || res.participant)) {
        const user = (res.data || res.participant) as SafeUser;
        if (res.token && typeof window !== 'undefined') {
          localStorage.setItem('auth_token', res.token);
          localStorage.setItem('student_user', JSON.stringify(user));
        }
        setSuccess('Đăng ký tài khoản sinh viên thành công! Đang chuyển hướng đến trang Chờ duyệt...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1000);
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
    <form className="prf-form" onSubmit={handleSubmit}>
      <div className="prf-header">
        <h3>📝 Đăng Ký Tài Khoản Sinh Viên Tham Gia Giải Đấu</h3>
        <p>Xác minh danh tính sinh viên thông qua Thẻ sinh viên (Không dùng CCCD)</p>
      </div>

      {error && <div className="prf-alert prf-alert-error">⚠️ {error}</div>}
      {success && <div className="prf-alert prf-alert-success">✓ {success}</div>}

      {/* THÔNG TIN CÁ NHÂN */}
      <div className="prf-section">
        <div className="prf-section-title">👤 Thông Tin Cá Nhân</div>

        <div className="prf-grid-2">
          <div className="prf-group">
            <label>Họ và Tên *</label>
            <input
              type="text"
              required
              placeholder="VD: Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="prf-group">
            <label>Số Điện Thoại *</label>
            <input
              type="tel"
              required
              placeholder="VD: 0905123456"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>
        </div>

        <div className="prf-group">
          <label>Email Liên Hệ *</label>
          <input
            type="email"
            required
            placeholder="VD: sinhvien@dut.udn.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="prf-grid-2">
          <div className="prf-group">
            <label>Mật Khẩu *</label>
            <div className="prf-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="prf-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Ẩn hiện mật khẩu"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="prf-group">
            <label>Xác Nhận Mật Khẩu *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* THÔNG TIN HỌC TẬP */}
      <div className="prf-section">
        <div className="prf-section-title">🎓 Thông Tin Học Tập</div>

        <div className="prf-group">
          <label>Trường Đại Học *</label>
          <select
            value={universityName}
            onChange={(e) => setUniversityName(e.target.value)}
            disabled={loading}
          >
            {UNIVERSITIES.map((uni) => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>
        </div>

        <div className="prf-grid-2">
          <div className="prf-group">
            <label>Mã Sinh Viên (MSSV) *</label>
            <input
              type="text"
              required
              placeholder="VD: 102230123"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>

          <div className="prf-group">
            <label>Lớp Sinh Hoạt *</label>
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

        <div className="prf-group">
          <label>Khoa / Viện Đào Tạo *</label>
          <select
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
            disabled={loading}
          >
            {DUT_FACULTIES.map((fac) => (
              <option key={fac} value={fac}>{fac}</option>
            ))}
          </select>
        </div>
      </div>

      {/* XÁC THỰC THẺ SINH VIÊN (2 ẢNH) */}
      <div className="prf-section">
        <div className="prf-section-title">📷 Ảnh Thẻ Sinh Viên Xác Thực (2 Ảnh)</div>
        <p className="prf-upload-hint">
          Hệ thống chỉ yêu cầu 2 ảnh thẻ sinh viên để bảo vệ quyền riêng tư (Không dùng CCCD).
        </p>

        <div className="prf-grid-2">
          {/* Thẻ SV Mặt Trước */}
          <div
            className={`prf-upload-box ${studentCardUrl ? 'has-image' : ''}`}
            onClick={() => studentCardRef.current?.click()}
          >
            <div className="prf-upload-label">🪪 Ảnh Mặt Trước Thẻ SV *</div>
            {studentCardUrl ? (
              <img src={studentCardUrl} alt="Thẻ SV Mặt trước" className="prf-preview-img" />
            ) : (
              <div className="prf-upload-placeholder">
                <span className="prf-upload-icon">📷</span>
                <span>{uploadingField === 'student_card' ? '⏳ Đang tải ảnh...' : 'Nhấn để tải ảnh thẻ SV'}</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={studentCardRef}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'student_card')}
            />
          </div>

          {/* Selfie Cầm Thẻ SV */}
          <div
            className={`prf-upload-box ${selfieWithStudentCardUrl ? 'has-image' : ''}`}
            onClick={() => selfieRef.current?.click()}
          >
            <div className="prf-upload-label">🤳 Ảnh Chân Dung Cầm Thẻ SV *</div>
            {selfieWithStudentCardUrl ? (
              <img src={selfieWithStudentCardUrl} alt="Selfie cầm thẻ SV" className="prf-preview-img" />
            ) : (
              <div className="prf-upload-placeholder">
                <span className="prf-upload-icon">🤳</span>
                <span>{uploadingField === 'selfie' ? '⏳ Đang tải ảnh...' : 'Nhấn để tải ảnh selfie cầm thẻ'}</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={selfieRef}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'selfie')}
            />
          </div>
        </div>
      </div>

      <div className="prf-actions">
        {onCancel && (
          <button type="button" className="prf-btn-cancel" onClick={onCancel} disabled={loading}>
            Hủy Bỏ
          </button>
        )}
        <button type="submit" className="prf-btn-submit" disabled={loading}>
          {loading ? '⏳ Đang Xử Lý...' : '🚀 Hoàn Tất Đăng Ký'}
        </button>
      </div>
    </form>
  );
}
