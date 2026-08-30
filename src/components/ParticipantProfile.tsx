'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getDutFaculties, DUT_FACULTIES } from '../services/auth.service';
import { participantAPI, type ParticipantRow, UNIVERSITIES } from '../services/participant.service';
import StudentRejectedResubmit from './StudentRejectedResubmit';
import '../styles/ParticipantProfile.css';

interface ParticipantProfileProps {
  initialUser?: ParticipantRow | null;
  onLogout?: () => void;
}

export default function ParticipantProfile({ initialUser, onLogout }: ParticipantProfileProps) {
  const [profile, setProfile] = useState<ParticipantRow | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  // Switch Type Form State
  const [switchTargetType, setSwitchTargetType] = useState<'dut_student' | 'external'>('dut_student');
  const [switchStudentId, setSwitchStudentId] = useState('');
  const [switchFacultyName, setSwitchFacultyName] = useState('');
  const [switchClassName, setSwitchClassName] = useState('');
  const [switchCardUrl, setSwitchCardUrl] = useState('');
  const [switchSelfieUrl, setSwitchSelfieUrl] = useState('');
  const [switchUsername, setSwitchUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [faculties, setFaculties] = useState<string[]>([...DUT_FACULTIES]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // File refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await participantAPI.getMyProfile();
      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        setError(res.message || 'Không thể tải thông tin người dùng');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    getDutFaculties().then(setFaculties);
  }, []);

  const openSwitchModal = () => {
    if (!profile) return;
    const target = (profile.account_type === 'dut_student' || profile.account_type === 'dut') ? 'external' : 'dut_student';
    setSwitchTargetType(target);
    setSwitchStudentId(profile.student_id || '');
    setSwitchFacultyName(profile.faculty_name || '');
    setSwitchClassName(profile.class_name || '');
    setSwitchCardUrl(profile.student_card_url || '');
    setSwitchSelfieUrl(profile.selfie_with_student_card_url || '');
    setSwitchUsername(profile.username || '');
    setModalError(null);
    setShowSwitchModal(true);
  };

  const triggerUpload = (targetKey: string) => {
    setActiveUploadTarget(targetKey);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTarget) return;

    try {
      setUploadingField(activeUploadTarget);
      const res = await participantAPI.uploadDocument(file);
      if (res.success && res.url) {
        if (activeUploadTarget === 'switch_card') setSwitchCardUrl(res.url);
        if (activeUploadTarget === 'switch_selfie') setSwitchSelfieUrl(res.url);
      } else {
        setModalError(res.message || 'Tải ảnh lên thất bại');
      }
    } catch (err) {
      setModalError('Lỗi tải file: ' + (err as Error).message);
    } finally {
      setUploadingField(null);
      setActiveUploadTarget(null);
      e.target.value = '';
    }
  };

  const handleSwitchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    try {
      setIsSubmitting(true);
      const payload = {
        target_account_type: switchTargetType,
        ...(switchTargetType === 'dut_student'
          ? {
              student_id: switchStudentId.trim(),
              faculty_name: switchFacultyName,
              class_name: switchClassName.trim(),
              student_card_url: switchCardUrl,
              selfie_with_student_card_url: switchSelfieUrl,
            }
          : {
              username: switchUsername.trim().toLowerCase(),
            }),
      };

      const res = await participantAPI.switchAccountType(payload);
      if (res.success && res.data) {
        setProfile(res.data);
        setShowSwitchModal(false);
      } else {
        setModalError(res.message || 'Chuyển đổi loại tài khoản thất bại');
      }
    } catch (err) {
      setModalError('Lỗi: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pp-container">
        <div className="pp-card" style={{ textAlign: 'center', padding: '60px' }}>
          <h2>⏳ Đang tải thông tin hồ sơ...</h2>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="pp-container">
        <div className="pp-card" style={{ textAlign: 'center', padding: '60px' }}>
          <h2>⚠️ {error || 'Không tìm thấy hồ sơ người dùng'}</h2>
          <button className="pp-btn-switch" style={{ marginTop: '20px' }} onClick={loadProfile}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const isDut = profile.account_type === 'dut_student' || profile.account_type === 'dut';
  const isRejected = profile.status === 'rejected';
  const isPending = profile.status === 'pending';
  const isApproved = profile.status === 'approved';

  return (
    <div className="pp-container">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />

      {/* ========================================================
          3. XỬ LÝ TRẠNG THÁI BỊ TỪ CHỐI (REJECTED STATE)
          Hiện Alert màu đỏ: 'Hồ sơ của bạn chưa hợp lệ. Lý do: [rejection_reason]'
          Bên dưới Alert, render form cập nhật thông tin prefilled để Resubmit.
         ======================================================== */}
      {isRejected && (
        <div style={{ marginBottom: '30px' }}>
          <StudentRejectedResubmit
            user={profile}
            onResubmitSuccess={(updated) => {
              setProfile(updated);
            }}
          />
        </div>
      )}

      {/* BANNER KHI PENDING */}
      {isPending && (
        <div className="pp-banner-pending">
          <span className="pp-banner-pending-icon">⏳</span>
          <div>
            <h3>Hồ Sơ Đang Trong Hàng Đợi Kiểm Duyệt</h3>
            <p>Ban tổ chức đang kiểm tra thông tin và giấy tờ của bạn. Bạn sẽ nhận được email thông báo ngay khi hồ sơ được duyệt.</p>
          </div>
        </div>
      )}

      {/* BANNER KHI APPROVED */}
      {isApproved && (
        <div className="pp-banner-approved">
          <span className="pp-banner-approved-icon">✅</span>
          <div>
            <h3>Tài Khoản Đã Được Phê Duyệt Chính Thức</h3>
            <p>Hồ sơ đã được xác thực hợp lệ! Bạn có thể đăng ký tham gia tất cả các giải đấu thể thao điện tử đang mở.</p>
          </div>
        </div>
      )}

      {/* THẺ PROFILE CHÍNH */}
      <div className="pp-card">
        <div className="pp-profile-header">
          <div className="pp-user-meta">
            <div className="pp-avatar">{profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}</div>
            <div className="pp-user-titles">
              <h1>{profile.full_name}</h1>
              <div className="pp-badges">
                <span className="pp-badge pp-badge-type">
                  {isDut ? '🎓 Sinh Viên' : '🌐 Game Thủ Tự Do'}
                </span>
                {isApproved && <span className="pp-badge pp-badge-approved">✓ Đã Duyệt</span>}
                {isPending && <span className="pp-badge pp-badge-pending">⏳ Chờ Duyệt</span>}
                {isRejected && <span className="pp-badge pp-badge-rejected">✕ Chưa Hợp Lệ</span>}
              </div>
            </div>
          </div>

          <div className="pp-header-actions">
            <button className="pp-btn-switch" onClick={openSwitchModal}>
              <span>🔄</span>
              <span>Đổi Loại Tài Khoản</span>
            </button>
            {onLogout && (
              <button className="pp-btn-switch" style={{ color: '#f87171' }} onClick={onLogout}>
                <span>🚪</span>
                <span>Đăng Xuất</span>
              </button>
            )}
          </div>
        </div>

        {/* THÔNG TIN CHI TIẾT */}
        <div className="pp-info-grid">
          <div className="pp-info-item">
            <label>Địa Chỉ Email</label>
            <span>{profile.email || 'Chưa cập nhật'}</span>
          </div>

          <div className="pp-info-item">
            <label>Số Điện Thoại</label>
            <span>{profile.phone_number || 'Chưa cập nhật'}</span>
          </div>

          <div className="pp-info-item">
            <label>Trường Đại Học</label>
            <span>{profile.university_name || 'Đại học Bách Khoa - ĐHĐN'}</span>
          </div>

          <div className="pp-info-item">
            <label>{isDut ? 'Mã Số Sinh Viên (MSSV)' : 'Tên Đăng Nhập (Username)'}</label>
            <span>{isDut ? (profile.student_id || profile.username || 'Chưa có') : (profile.username || 'Chưa có')}</span>
          </div>

          {isDut ? (
            <>
              <div className="pp-info-item">
                <label>Khoa</label>
                <span>{profile.faculty_name || profile.faculty || 'Chưa cập nhật'}</span>
              </div>
              <div className="pp-info-item">
                <label>Lớp Sinh Hoạt</label>
                <span>{profile.class_name || 'Chưa cập nhật'}</span>
              </div>
            </>
          ) : (
            <div className="pp-info-item">
              <label>Đối Tượng Tham Gia</label>
              <span>Vận động viên / Game thủ tự do ngoài trường</span>
            </div>
          )}
        </div>

        {/* BỘ SƯU TẬP ẢNH XÁC THỰC */}
        <div className="pp-docs-section">
          <h3>
            <span>📷</span>
            <span>Ảnh Xác Thực Đã Tải Lên</span>
          </h3>

          <div className="pp-docs-grid">
            {profile.student_card_url && (
              <div className="pp-doc-card">
                <span>Ảnh Thẻ Sinh Viên</span>
                <img
                  src={profile.student_card_url}
                  alt="Thẻ sinh viên"
                  className="pp-doc-img"
                  onClick={() => setZoomImage({ url: profile.student_card_url!, title: 'Ảnh Thẻ Sinh Viên' })}
                />
              </div>
            )}

            {profile.selfie_with_student_card_url && (
              <div className="pp-doc-card">
                <span>Ảnh Chân Dung Cầm Thẻ SV</span>
                <img
                  src={profile.selfie_with_student_card_url}
                  alt="Ảnh chân dung cầm thẻ"
                  className="pp-doc-img"
                  onClick={() => setZoomImage({ url: profile.selfie_with_student_card_url!, title: 'Ảnh Chân Dung Cầm Thẻ SV' })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL CHUYỂN ĐỔI LOẠI TÀI KHOẢN (SWITCH TYPE) ================= */}
      {showSwitchModal && (
        <div className="pp-modal-overlay" onClick={() => setShowSwitchModal(false)}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pp-modal-header">
              <h2>🔄 Chuyển Đổi Loại Tài Khoản</h2>
              <button className="pp-modal-close" onClick={() => setShowSwitchModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSwitchSubmit}>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '20px' }}>
                Chuyển từ tài khoản <strong>{isDut ? 'Sinh viên' : 'Game thủ tự do'}</strong> sang{' '}
                <strong style={{ color: '#00c6ff' }}>{switchTargetType === 'dut_student' ? 'Sinh viên' : 'Game thủ tự do'}</strong>.
                Hồ sơ sẽ được reset về trạng thái <strong>Chờ duyệt (Pending)</strong> để Ban Tổ Chức thẩm định lại.
              </p>

              <div className="prf-form">
                {switchTargetType === 'dut_student' ? (
                  <>
                    <div className="prf-row">
                      <div className="prf-group">
                        <label>Mã Số Sinh Viên (MSSV) *</label>
                        <input
                          type="text"
                          value={switchStudentId}
                          onChange={(e) => setSwitchStudentId(e.target.value.replace(/\D/g, ''))}
                          required
                          placeholder="VD: 102230123"
                        />
                      </div>
                      <div className="prf-group">
                        <label>Lớp Sinh Hoạt *</label>
                        <input
                          type="text"
                          value={switchClassName}
                          onChange={(e) => setSwitchClassName(e.target.value)}
                          required
                          placeholder="VD: 23T1"
                        />
                      </div>
                    </div>

                    <div className="prf-group">
                      <label>Khoa *</label>
                      <select
                        value={switchFacultyName}
                        onChange={(e) => setSwitchFacultyName(e.target.value)}
                        required
                      >
                        <option value="">-- Chọn Khoa --</option>
                        {faculties.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div className="prf-upload-grid">
                      <div className={`prf-upload-box ${switchCardUrl ? 'has-image' : ''}`} onClick={() => triggerUpload('switch_card')}>
                        <div className="prf-upload-label">Ảnh Thẻ Sinh Viên *</div>
                        {switchCardUrl ? (
                          <img src={switchCardUrl} alt="Thẻ SV" className="prf-preview-img" />
                        ) : (
                          <div className="prf-upload-placeholder">
                            <span>📷</span>
                            <span>Tải ảnh thẻ SV</span>
                          </div>
                        )}
                      </div>

                      <div className={`prf-upload-box ${switchSelfieUrl ? 'has-image' : ''}`} onClick={() => triggerUpload('switch_selfie')}>
                        <div className="prf-upload-label">Ảnh Selfie Cầm Thẻ *</div>
                        {switchSelfieUrl ? (
                          <img src={switchSelfieUrl} alt="Selfie cầm thẻ" className="prf-preview-img" />
                        ) : (
                          <div className="prf-upload-placeholder">
                            <span>🤳</span>
                            <span>Tải ảnh selfie cầm thẻ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="prf-group">
                    <label>Tên Đăng Nhập (Username) *</label>
                    <input
                      type="text"
                      value={switchUsername}
                      onChange={(e) => setSwitchUsername(e.target.value)}
                      required
                      placeholder="VD: gamer_dut"
                    />
                  </div>
                )}

                {modalError && <div className="prf-error-banner">⚠️ {modalError}</div>}

                <div className="pp-modal-actions">
                  <button type="button" className="pp-btn-cancel" onClick={() => setShowSwitchModal(false)} disabled={isSubmitting}>
                    Hủy
                  </button>
                  <button type="submit" className="pp-btn-save" disabled={isSubmitting}>
                    {isSubmitting ? '⏳ Đang xử lý...' : 'Xác Nhận Chuyển Đổi'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Zoom */}
      {zoomImage && (
        <div className="pp-modal-overlay" onClick={() => setZoomImage(null)}>
          <div style={{ maxWidth: '800px', width: '90%', textAlign: 'center' }}>
            <img
              src={zoomImage.url}
              alt={zoomImage.title}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px', border: '2px solid #ff6b00' }}
            />
            <p style={{ marginTop: '12px', color: '#ffffff', fontWeight: 'bold' }}>{zoomImage.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
