'use client';

import React, { useRef, useState } from 'react';
import { participantAPI, UNIVERSITIES, type ParticipantRow } from '../services/participant.service';
import '../styles/StudentRegistrationForm.css';

interface StudentRejectedResubmitProps {
  user: ParticipantRow;
  onResubmitSuccess: (updatedUser: ParticipantRow) => void;
}

export default function StudentRejectedResubmit({ user, onResubmitSuccess }: StudentRejectedResubmitProps) {
  // Điền sẵn toàn bộ dữ liệu cũ của sinh viên
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phone_number || '');
  const [universityName, setUniversityName] = useState(user.university_name || UNIVERSITIES[0]);
  const [studentId, setStudentId] = useState(user.student_id || '');
  const [className, setClassName] = useState(user.class_name || '');
  const [facultyName, setFacultyName] = useState(user.faculty_name || user.faculty || '');

  // Ảnh cũ & preview ảnh mới
  const [studentCardUrl, setStudentCardUrl] = useState(user.student_card_url || '');
  const [studentCardPreview, setStudentCardPreview] = useState<string | null>(null);
  const [isUploadingCard, setIsUploadingCard] = useState(false);

  const [selfieUrl, setSelfieUrl] = useState(user.selfie_with_student_card_url || '');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);

  // Trạng thái submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // File input refs
  const cardInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Tải lên lại ảnh Thẻ sinh viên
  const handleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setStudentCardPreview(preview);
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
      setError('Lỗi khi tải ảnh: ' + (err as Error).message);
    } finally {
      setIsUploadingCard(false);
    }
  };

  // Tải lên lại ảnh Selfie cầm thẻ
  const handleSelfieFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setSelfiePreview(preview);
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
      setError('Lỗi khi tải ảnh: ' + (err as Error).message);
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) return setError('Vui lòng nhập Họ và tên');
    if (!studentId.trim()) return setError('Vui lòng nhập Mã sinh viên (MSSV)');
    if (!studentCardUrl) return setError('Vui lòng tải lên Ảnh thẻ sinh viên rõ nét');
    if (!selfieUrl) return setError('Vui lòng tải lên Ảnh chân dung cầm thẻ sinh viên');

    try {
      setLoading(true);
      const payload = {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || undefined,
        university_name: universityName.trim() || undefined,
        student_id: studentId.trim(),
        class_name: className.trim() || undefined,
        faculty_name: facultyName.trim() || undefined,
        student_card_url: studentCardUrl,
        selfie_with_student_card_url: selfieUrl,
      };

      const result = await participantAPI.resubmit(payload);

      if (result.success && result.data) {
        setSuccess('Cập nhật và nộp lại hồ sơ thành công! Trạng thái đã chuyển về Chờ duyệt (Pending).');
        if (typeof window !== 'undefined') {
          localStorage.setItem('student_user', JSON.stringify(result.data));
        }
        setTimeout(() => {
          onResubmitSuccess(result.data as ParticipantRow);
        }, 1200);
      } else {
        setError(result.message || 'Nộp lại hồ sơ thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="srf-resubmit-container">
      {/* 1. ALERT MÀU ĐỎ THÔNG BÁO TỪ CHỐI */}
      <div className="srf-rejected-banner">
        <div className="srf-rejected-header">
          <span style={{ fontSize: '24px' }}>🚨</span>
          <h3>Hồ sơ của bạn chưa hợp lệ</h3>
        </div>
        <div className="srf-rejected-reason">
          <strong>Lý do:</strong> {user.rejection_reason || 'Hình ảnh hoặc thông tin xác thực chưa chính xác hoặc bị mờ.'}
        </div>
        <p style={{ margin: 0, color: '#fca5a5', fontSize: '13px' }}>
          Vui lòng kiểm tra lại các trường bị sai bên dưới, cập nhật lại thông tin hoặc tải lại ảnh rõ nét và nhấn <strong>Nộp Lại Hồ Sơ</strong>.
        </p>
      </div>

      {/* 2. FORM CẬP NHẬT THÔNG TIN ĐƯỢC PREFILL DỮ LIỆU CŨ */}
      <form onSubmit={handleResubmit} className="srf-form">
        <div className="srf-row">
          <div className="srf-group">
            <label>
              Họ và Tên <span className="srf-required">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="srf-group">
            <label>Địa Chỉ Email (Không thể đổi)</label>
            <input type="email" value={email} readOnly disabled style={{ opacity: 0.7 }} />
          </div>
        </div>

        <div className="srf-row">
          <div className="srf-group">
            <label>Số Điện Thoại</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="srf-group">
            <label>Trường Đại Học</label>
            <select
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              disabled={loading}
            >
              {UNIVERSITIES.map((uni) => (
                <option key={uni} value={uni}>
                  {uni}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="srf-row">
          <div className="srf-group">
            <label>
              Mã Sinh Viên (MSSV) <span className="srf-required">*</span>
            </label>
            <input
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>

          <div className="srf-group">
            <label>Lớp Sinh Hoạt</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="srf-group">
          <label>Khoa</label>
          <input
            type="text"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Khu vực Upload Tải Lại Ảnh Xác Thực */}
        <div className="srf-upload-section">
          <div className="srf-section-label">
            <span>📷</span>
            <span>Tải Lại Ảnh Xác Thực Sinh Viên</span>
          </div>

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
            {/* Box 1: Thẻ SV */}
            <div
              className={`srf-upload-card ${studentCardPreview || studentCardUrl ? 'has-preview' : ''} ${
                isUploadingCard ? 'uploading' : ''
              }`}
              onClick={() => cardInputRef.current?.click()}
            >
              <div className="srf-upload-card-title">Ảnh Thẻ Sinh Viên</div>
              {studentCardPreview || studentCardUrl ? (
                <>
                  <div className="srf-preview-wrapper">
                    <img
                      src={studentCardPreview || studentCardUrl}
                      alt="Ảnh thẻ SV"
                      className="srf-preview-img"
                    />
                  </div>
                  <span className="srf-change-badge">
                    {isUploadingCard ? '⏳ Đang tải...' : '🔄 Nhấp để thay ảnh mới'}
                  </span>
                </>
              ) : (
                <div className="srf-upload-placeholder">
                  <span className="srf-upload-icon">🪪</span>
                  <span>Tải ảnh thẻ SV</span>
                </div>
              )}
            </div>

            {/* Box 2: Selfie cầm thẻ */}
            <div
              className={`srf-upload-card ${selfiePreview || selfieUrl ? 'has-preview' : ''} ${
                isUploadingSelfie ? 'uploading' : ''
              }`}
              onClick={() => selfieInputRef.current?.click()}
            >
              <div className="srf-upload-card-title">Ảnh Selfie Cầm Thẻ SV</div>
              {selfiePreview || selfieUrl ? (
                <>
                  <div className="srf-preview-wrapper">
                    <img
                      src={selfiePreview || selfieUrl}
                      alt="Ảnh selfie cầm thẻ"
                      className="srf-preview-img"
                    />
                  </div>
                  <span className="srf-change-badge">
                    {isUploadingSelfie ? '⏳ Đang tải...' : '🔄 Nhấp để thay ảnh mới'}
                  </span>
                </>
              ) : (
                <div className="srf-upload-placeholder">
                  <span className="srf-upload-icon">🤳</span>
                  <span>Tải ảnh selfie cầm thẻ</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className="srf-error-alert">⚠️ {error}</div>}
        {success && <div className="srf-success-alert">✓ {success}</div>}

        <button
          type="submit"
          className="srf-submit-btn"
          disabled={loading || isUploadingCard || isUploadingSelfie}
        >
          {loading ? '⏳ Đang Cập Nhật & Nộp Lại...' : '🚀 Nộp Lại Hồ Sơ (Resubmit)'}
        </button>
      </form>
    </div>
  );
}
