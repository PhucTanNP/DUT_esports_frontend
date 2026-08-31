'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ParticipantRow } from '../../services/participant.service';

interface ParticipantKYCModalProps {
  participant: ParticipantRow | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isSaving: boolean;
}

export default function ParticipantKYCModal({
  participant,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isSaving,
}: ParticipantKYCModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Image manipulation state (zoom & rotation)
  const [cardZoom, setCardZoom] = useState(1);
  const [cardRotate, setCardRotate] = useState(0);
  const [selfieZoom, setSelfieZoom] = useState(1);
  const [selfieRotate, setSelfieRotate] = useState(0);

  // Reset controls when opened
  useEffect(() => {
    if (isOpen && participant) {
      setRejectionReason(
        participant.rejection_reason || 'Ảnh thẻ sinh viên hoặc ảnh selfie không rõ nét / không chính chủ, vui lòng chụp lại rõ ràng.',
      );
      setIsRejecting(false);
      setCardZoom(1);
      setCardRotate(0);
      setSelfieZoom(1);
      setSelfieRotate(0);
      setZoomImage(null);
    }
  }, [isOpen, participant]);

  const isPending = participant?.status === 'pending';

  const handleApproveAction = useCallback(() => {
    if (!participant || isSaving || !isPending) return;
    onApprove(participant.id);
  }, [participant, isSaving, isPending, onApprove]);

  const handleStartReject = useCallback(() => {
    if (!participant || isSaving || !isPending) return;
    setIsRejecting(true);
  }, [participant, isSaving, isPending]);

  const handleConfirmReject = useCallback(() => {
    if (!participant || isSaving || !isPending) return;
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối cụ thể.');
      return;
    }
    onReject(participant.id, rejectionReason.trim());
  }, [participant, isSaving, isPending, rejectionReason, onReject]);

  // Keyboard Shortcuts (A: Approve, R: Reject, Esc: Close)
  useEffect(() => {
    if (!isOpen || !participant) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if typing in textarea or input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (zoomImage) {
          setZoomImage(null);
        } else if (isRejecting) {
          setIsRejecting(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'a' || e.key === 'A') && isPending && !isRejecting) {
        e.preventDefault();
        handleApproveAction();
      } else if ((e.key === 'r' || e.key === 'R') && isPending && !isRejecting) {
        e.preventDefault();
        handleStartReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, participant, isPending, isRejecting, zoomImage, handleApproveAction, handleStartReject, onClose]);

  if (!isOpen || !participant) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal kyc-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="kyc-header-info">
            <div className="kyc-header-title">
              <h3>🔍 Xét Duyệt KYC Sinh Viên: <span className="highlight-name">{participant.full_name}</span></h3>
              <span className={`status-badge status-${participant.status}`}>
                {participant.status === 'approved' && '✅ Đã Duyệt'}
                {participant.status === 'pending' && '⏳ Chờ Duyệt (Pending)'}
                {participant.status === 'rejected' && '❌ Đã Từ Chối'}
              </span>
            </div>
            <p className="kyc-header-sub">
              Đối chiếu thông tin cá nhân và 2 ảnh thẻ sinh viên để phê duyệt tài khoản hợp lệ.
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng modal">✕</button>
        </div>

        {/* Hotkey Indicator */}
        {isPending && !isRejecting && (
          <div className="hotkey-banner">
            <span>⚡ Phím tắt nhanh: <strong>[A]</strong> Phê duyệt | <strong>[R]</strong> Từ chối | <strong>[Esc]</strong> Đóng</span>
          </div>
        )}

        {/* Thông tin sinh viên */}
        <div className="kyc-info-grid">
          <div className="info-item">
            <span className="info-label">MÃ SỐ SINH VIÊN (MSSV):</span>
            <span className="info-value mssv-value">{participant.student_id || participant.username || 'Chưa cập nhật'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">HỌ VÀ TÊN:</span>
            <span className="info-value">{participant.full_name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">TRƯỜNG ĐẠI HỌC:</span>
            <span className="info-value uni-value">{participant.university_name || 'Đại học Bách Khoa - ĐHĐN (DUT)'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">KHOA & LỚP:</span>
            <span className="info-value">
              {participant.faculty_name || 'Chưa có khoa'} {participant.class_name ? `(${participant.class_name})` : ''}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">EMAIL:</span>
            <span className="info-value">{participant.email || 'Chưa có email'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">SỐ ĐIỆN THOẠI:</span>
            <span className="info-value">{participant.phone_number || participant.phone || 'Chưa có SĐT'}</span>
          </div>
        </div>

        {/* 2 Ảnh Thẻ Sinh Viên Xác Thực (Zero CCCD Invariant) */}
        <div className="kyc-images-section">
          <h4 className="section-title">
            📷 Ảnh Xác Thực Thẻ Sinh Viên
            <span className="section-note">(Chỉ sử dụng thẻ SV &amp; ảnh chân dung cầm thẻ SV — Không dùng CCCD)</span>
          </h4>

          <div className="kyc-images-grid">
            {/* Ảnh 1: Mặt trước Thẻ SV */}
            <div className="kyc-image-card">
              <div className="image-card-header">
                <span className="image-title">🪪 1. Mặt Trước Thẻ Sinh Viên</span>
                <div className="image-tools">
                  <button
                    type="button"
                    className="tool-btn"
                    title="Xoay ảnh 90°"
                    onClick={() => setCardRotate((r) => (r + 90) % 360)}
                  >
                    🔄
                  </button>
                  <button
                    type="button"
                    className="tool-btn"
                    title="Phóng to"
                    onClick={() => setCardZoom((z) => Math.min(2.5, z + 0.25))}
                  >
                    🔍+
                  </button>
                  <button
                    type="button"
                    className="tool-btn"
                    title="Thu nhỏ"
                    onClick={() => setCardZoom((z) => Math.max(0.75, z - 0.25))}
                  >
                    🔍-
                  </button>
                  <button
                    type="button"
                    className="tool-btn"
                    title="Đặt lại"
                    onClick={() => { setCardZoom(1); setCardRotate(0); }}
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className="image-viewport">
                {participant.student_card_url ? (
                  <img
                    src={participant.student_card_url}
                    alt="Mặt trước thẻ sinh viên"
                    className="kyc-img"
                    style={{
                      transform: `scale(${cardZoom}) rotate(${cardRotate}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                    onClick={() => setZoomImage(participant.student_card_url!)}
                  />
                ) : (
                  <div className="image-empty">
                    <span className="empty-icon">🪪</span>
                    <span>Chưa có ảnh mặt trước thẻ sinh viên</span>
                  </div>
                )}
              </div>
              <small className="image-hint">Nhấp vào ảnh để xem toàn màn hình</small>
            </div>

            {/* Ảnh 2: Selfie cầm Thẻ SV */}
            <div className="kyc-image-card">
              <div className="image-card-header">
                <span className="image-title">🤳 2. Ảnh Chân Dung Cầm Thẻ SV</span>
                <div className="image-tools">
                  <button
                    type="button"
                    className="tool-btn"
                    title="Xoay ảnh 90°"
                    onClick={() => setSelfieRotate((r) => (r + 90) % 360)}
                  >
                    🔄
                  </button>
                  <button
                    type="button"
                    className="tool-btn"
                    title="Phóng to"
                    onClick={() => setSelfieZoom((z) => Math.min(2.5, z + 0.25))}
                  >
                    🔍+
                  </button>
                  <button
                    type="button"
                    className="tool-btn"
                    title="Thu nhỏ"
                    onClick={() => setSelfieZoom((z) => Math.max(0.75, z - 0.25))}
                  >
                    🔍-
                  </button>
                  <button
                    type="button"
                    className="tool-btn"
                    title="Đặt lại"
                    onClick={() => { setSelfieZoom(1); setSelfieRotate(0); }}
                  >
                    ↺
                  </button>
                </div>
              </div>

              <div className="image-viewport">
                {participant.selfie_with_student_card_url ? (
                  <img
                    src={participant.selfie_with_student_card_url}
                    alt="Ảnh selfie cầm thẻ sinh viên"
                    className="kyc-img"
                    style={{
                      transform: `scale(${selfieZoom}) rotate(${selfieRotate}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                    onClick={() => setZoomImage(participant.selfie_with_student_card_url!)}
                  />
                ) : (
                  <div className="image-empty">
                    <span className="empty-icon">🤳</span>
                    <span>Chưa có ảnh chân dung cầm thẻ sinh viên</span>
                  </div>
                )}
              </div>
              <small className="image-hint">Nhấp vào ảnh để xem toàn màn hình</small>
            </div>
          </div>
        </div>

        {/* Lý do từ chối nếu trước đó bị từ chối */}
        {participant.status === 'rejected' && participant.rejection_reason && !isRejecting && (
          <div className="rejected-reason-banner">
            <strong>❌ Lý do từ chối trước đó:</strong>
            <p>{participant.rejection_reason}</p>
          </div>
        )}

        {/* Khung nhập lý do từ chối nếu bấm Từ Chối */}
        {isRejecting && (
          <div className="rejection-box">
            <label className="rejection-label">
              ⚠️ Lý do từ chối (Bắt buộc — hệ thống sẽ thông báo cho sinh viên):
            </label>
            <textarea
              className="rejection-textarea"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="VD: Ảnh thẻ sinh viên bị mờ, không nhìn rõ họ tên và MSSV. Vui lòng chụp lại rõ nét hơn."
              disabled={isSaving}
              autoFocus
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="modal-actions kyc-modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={isSaving}>
            Đóng [Esc]
          </button>

          {/* QUY TẮC: Nút ký duyệt / từ chối CHỈ HIỂN THỊ KHI ACCOUNT Ở DẠNG PENDING */}
          {isPending ? (
            <div className="kyc-action-buttons">
              {isRejecting ? (
                <>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setIsRejecting(false)}
                    disabled={isSaving}
                  >
                    Hủy thao tác
                  </button>
                  <button
                    type="button"
                    className="btn-delete-confirm"
                    style={{ background: '#ef4444' }}
                    onClick={handleConfirmReject}
                    disabled={isSaving}
                  >
                    {isSaving ? '⏳ Đang xử lý...' : '❌ Xác Nhận Từ Chối'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-reject"
                    onClick={handleStartReject}
                    disabled={isSaving}
                  >
                    ❌ Từ Chối [R]
                  </button>
                  <button
                    type="button"
                    className="btn-save btn-approve"
                    onClick={handleApproveAction}
                    disabled={isSaving}
                  >
                    {isSaving ? '⏳ Đang phê duyệt...' : '✅ Phê Duyệt Hồ Sơ [A]'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="kyc-processed-notice">
              {participant.status === 'approved' && (
                <span className="notice-text approved">
                  ✓ Tài khoản này đã được phê duyệt. Nút ký duyệt đã bị ẩn.
                </span>
              )}
              {participant.status === 'rejected' && (
                <span className="notice-text rejected">
                  ✕ Hồ sơ này đã bị từ chối. Chờ sinh viên nộp lại.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Phóng To Ảnh */}
      {zoomImage && (
        <div className="lightbox-overlay" onClick={() => setZoomImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={zoomImage} alt="Phóng to thẻ sinh viên" className="lightbox-img" />
            <button className="lightbox-close" onClick={() => setZoomImage(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
