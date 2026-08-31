'use client';

import React, { useEffect, useRef, useState } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { authAPI } from '../../services/auth.service';
import { participantAPI, UNIVERSITIES, type ParticipantRow } from '../../services/participant.service';
import type { SafeUser } from '../../types';
import '../../styles/StatusPages.css';

export default function UpdateRegistrationPage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form states - pre-filled with existing data
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [universityName, setUniversityName] = useState<string>(UNIVERSITIES[0]);
  const [studentId, setStudentId] = useState('');
  const [className, setClassName] = useState('');
  const [facultyName, setFacultyName] = useState('');

  // Photos
  const [studentCardUrl, setStudentCardUrl] = useState('');
  const [studentCardPreview, setStudentCardPreview] = useState<string | null>(null);
  const [isUploadingCard, setIsUploadingCard] = useState(false);

  const [selfieUrl, setSelfieUrl] = useState('');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);

  // Action status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cardInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem('student_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SafeUser;
        setUser(parsed);
        setFullName(parsed.full_name || '');
        setEmail(parsed.email || '');
        setPhoneNumber(parsed.phone || '');
        setUniversityName(parsed.faculty || parsed.faculty_name || UNIVERSITIES[0]);
        setStudentId(parsed.student_id || parsed.username || '');
        setClassName(parsed.class_name || '');
        setFacultyName(parsed.faculty_name || parsed.faculty || '');
        setStudentCardUrl(parsed.student_card_url || '');
        setSelfieUrl(parsed.selfie_with_student_card_url || '');
      } catch {
        // ignore
      }
    }
    setLoadingInitial(false);
  }, []);

  // Upload thẻ sinh viên
  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setError('Lỗi khi tải ảnh thẻ: ' + (err as Error).message);
    } finally {
      setIsUploadingCard(false);
    }
  };

  // Upload selfie cầm thẻ
  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setError(res.message || 'Tải ảnh selfie cầm thẻ thất bại');
      }
    } catch (err) {
      setError('Lỗi khi tải ảnh selfie: ' + (err as Error).message);
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  // Submit Re-submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) return setError('Vui lòng nhập Họ và tên');
    if (!studentId.trim()) return setError('Vui lòng nhập Mã sinh viên (MSSV)');
    if (!studentCardUrl) return setError('Vui lòng tải lên Ảnh thẻ sinh viên rõ nét');
    if (!selfieUrl) return setError('Vui lòng tải lên Ảnh chân dung cầm thẻ sinh viên');

    try {
      setSubmitting(true);
      const payload = {
        identifier: user?.id || user?.student_id || user?.username || user?.email || studentId.trim(),
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

      if (result.success && (result.data || (result as any).participant || (result as any).user)) {
        const updatedUser = (result.data || (result as any).participant || (result as any).user) as SafeUser;
        // Đảm bảo status đã chuyển về pending
        updatedUser.status = 'pending';
        updatedUser.rejection_reason = null;
        updatedUser.rejected_at = null;

        localStorage.setItem('student_user', JSON.stringify(updatedUser));
        if (result.token) {
          localStorage.setItem('auth_token', result.token);
        }

        setSuccess('🎉 Hồ sơ của bạn đã được cập nhật và nộp lại thành công! Đang chuyển hướng về trang Chờ duyệt...');

        // Điều hướng user về lại trang /pending-approval
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1200);
      } else {
        setError(result.message || 'Không thể cập nhật hồ sơ. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    window.location.href = '/';
  };

  if (loadingInitial) {
    return (
      <div className="status-page-wrapper">
        <Header user={user} onLogoutClick={handleLogout} />
        <main className="status-container">
          <div style={{ textAlign: 'center', color: '#ffffff' }}>
            <h2>⏳ Đang tải dữ liệu hồ sơ...</h2>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="status-page-wrapper">
      <Header user={user} onLogoutClick={handleLogout} />

      <main className="status-container">
        <div className="status-card status-card-rejected wide">
          {/* Header */}
          <div className="update-reg-header">
            <div className="status-badge status-badge-rejected" style={{ marginBottom: '12px' }}>
              <span className="status-badge-dot" />
              Cập Nhật & Nộp Lại Hồ Sơ
            </div>
            <h1>Chỉnh Sửa Hồ Sơ Đăng Ký Sinh Viên</h1>
            <p>
              Vui lòng rà soát lại các thông tin bị sai sót, cập nhật lại hình ảnh minh chứng và nộp lại để Ban Tổ Chức duyệt lại.
            </p>
          </div>

          {/* Lý do từ chối trước đó */}
          {user?.rejection_reason && (
            <div className="status-reason-box" style={{ marginBottom: '24px' }}>
              <div className="status-reason-header">
                <span>⚠️</span>
                <span>Lý do hồ sơ trước bị từ chối:</span>
              </div>
              <div className="status-reason-text">{user.rejection_reason}</div>
            </div>
          )}

          {/* Form điền sẵn (pre-fill) thông tin */}
          <form onSubmit={handleSubmit} className="update-reg-form">
            <div className="update-reg-grid">
              <div className="update-reg-field">
                <label>
                  Họ và Tên <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="update-reg-input"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="update-reg-field">
                <label>Email Đăng Ký (Không đổi)</label>
                <input
                  type="email"
                  className="update-reg-input"
                  value={email}
                  disabled
                  readOnly
                  title="Email tài khoản không thể chỉnh sửa"
                />
              </div>

              <div className="update-reg-field">
                <label>
                  Mã Sinh Viên (MSSV) <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="update-reg-input"
                  placeholder="102230123"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="update-reg-field">
                <label>Số Điện Thoại</label>
                <input
                  type="tel"
                  className="update-reg-input"
                  placeholder="0905123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="update-reg-field">
                <label>Trường Đại Học</label>
                <select
                  className="update-reg-select"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  disabled={submitting}
                >
                  {UNIVERSITIES.map((uni) => (
                    <option key={uni} value={uni}>
                      {uni}
                    </option>
                  ))}
                </select>
              </div>

              <div className="update-reg-field">
                <label>Lớp Sinh Hoạt</label>
                <input
                  type="text"
                  className="update-reg-input"
                  placeholder="20TCLC_DT1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="update-reg-field full-width">
                <label>Khoa Quản Lý</label>
                <input
                  type="text"
                  className="update-reg-input"
                  placeholder="Khoa Công nghệ Thông tin"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Upload Khu Vực Ảnh Thẻ & Chân Dung Cầm Thẻ */}
            <div className="update-upload-section">
              <div className="update-upload-title">
                <span>📷</span>
                <span>Tải Lại Ảnh Xác Thực Minh Chứng (Thẻ SV / Selfie)</span>
              </div>
              <div className="update-upload-subtitle">
                Yêu cầu ảnh chụp rõ nét, không bị lóa sáng, nhìn rõ họ tên, MSSV và khuôn mặt.
              </div>

              <input
                type="file"
                ref={cardInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleCardUpload}
              />
              <input
                type="file"
                ref={selfieInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleSelfieUpload}
              />

              <div className="update-upload-grid">
                {/* Upload Thẻ SV */}
                <div
                  className={`update-upload-box ${studentCardPreview || studentCardUrl ? 'has-preview' : ''}`}
                  onClick={() => cardInputRef.current?.click()}
                >
                  {studentCardPreview || studentCardUrl ? (
                    <>
                      <img
                        src={studentCardPreview || studentCardUrl}
                        alt="Ảnh thẻ SV"
                        className="update-upload-preview"
                      />
                      <span className="update-upload-badge">
                        {isUploadingCard ? '⏳ Đang tải ảnh lên...' : '🔄 Nhấp để đổi ảnh thẻ SV'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '36px', marginBottom: '8px' }}>🪪</span>
                      <strong style={{ color: '#ffffff', fontSize: '14px' }}>Tải Ảnh Thẻ Sinh Viên *</strong>
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                        PNG, JPG, JPEG (tối đa 10MB)
                      </span>
                    </>
                  )}
                </div>

                {/* Upload Selfie Cầm Thẻ */}
                <div
                  className={`update-upload-box ${selfiePreview || selfieUrl ? 'has-preview' : ''}`}
                  onClick={() => selfieInputRef.current?.click()}
                >
                  {selfiePreview || selfieUrl ? (
                    <>
                      <img
                        src={selfiePreview || selfieUrl}
                        alt="Ảnh selfie cầm thẻ"
                        className="update-upload-preview"
                      />
                      <span className="update-upload-badge">
                        {isUploadingSelfie ? '⏳ Đang tải ảnh lên...' : '🔄 Nhấp để đổi ảnh selfie'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '36px', marginBottom: '8px' }}>🤳</span>
                      <strong style={{ color: '#ffffff', fontSize: '14px' }}>Tải Ảnh Selfie Cầm Thẻ SV *</strong>
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                        Ảnh chụp khuôn mặt cầm thẻ rõ nét
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="update-alert update-alert-error">⚠️ {error}</div>}
            {success && <div className="update-alert update-alert-success">{success}</div>}

            <div className="status-actions">
              <button
                type="submit"
                className="status-btn status-btn-primary"
                disabled={submitting || isUploadingCard || isUploadingSelfie}
              >
                {submitting ? '⏳ Đang Cập Nhật & Nộp Lại...' : '🚀 Cập Nhật & Nộp Lại Hồ Sơ (Re-submit)'}
              </button>

              <button
                type="button"
                className="status-btn status-btn-secondary"
                onClick={() => {
                  window.location.href = '/rejected-info';
                }}
              >
                ← Quay lại trang thông tin từ chối
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
