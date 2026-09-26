'use client';

import React, { useEffect, useRef, useState } from 'react';
import { checkinAPI } from '../services/checkin.service';
import { participantAPI } from '../services/participant.service';
import type { Registration } from '../types';
import '../styles/CheckinScannerModal.css';

interface CheckinScannerModalProps {
  registration: Registration;
  tournamentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckinScannerModal({
  registration,
  tournamentName,
  onClose,
  onSuccess,
}: CheckinScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSafariGuide, setShowSafariGuide] = useState(false);

  // Ảnh minh chứng chụp trực tiếp từ điện thoại (SRS 3.2 AD-13, 4.5)
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);

  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Khởi tạo Camera thiết bị [SRS 3.1 SV-10, 4.5]
  const startCamera = async () => {
    try {
      setCameraError(null);

      // Kiểm tra Secure Context (Safari & Chrome chặn WebRTC getUserMedia trên HTTP LAN IP)
      if (
        typeof window !== 'undefined' &&
        !window.isSecureContext &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        throw new Error(
          'Safari/Chrome chặn mở Camera WebRTC trên kết nối HTTP. Bạn hãy bấm "📸 Chụp ảnh bằng Camera điện thoại" bên dưới để điểm danh ngay mà không cần HTTPS.',
        );
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Trình duyệt chưa cho phép truy cập Camera. Bạn có thể mở cài đặt Safari để cấp quyền hoặc chụp ảnh bên dưới.',
        );
      }

      // Ưu tiên camera sau (environment) cho di động, fallback camera mặc định
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraActive(true);
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Không thể mở camera thiết bị.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Quyền Camera bị từ chối trên thiết bị. Nhấn vào biểu tượng "aA" trên thanh URL Safari -> Cài đặt trang web -> Máy ảnh: Cho phép.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Không tìm thấy máy ảnh (Camera) trên thiết bị của bạn.';
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  // 2. Dừng Camera giải phóng tài nguyên
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // 3. Xử lý chụp ảnh / tải ảnh minh chứng qua Native Camera
  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview nhanh trên client
    const preview = URL.createObjectURL(file);
    setProofPreview(preview);
    setErrorMessage(null);

    try {
      setIsUploadingProof(true);
      const res = await participantAPI.uploadDocument(file);
      if (res.success && res.url) {
        setProofUrl(res.url);
      } else {
        setErrorMessage(res.message || 'Tải ảnh minh chứng thất bại, vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMessage('Lỗi khi tải ảnh: ' + (err.message || 'Thất bại'));
    } finally {
      setIsUploadingProof(false);
    }
  };

  // 4. Lấy tọa độ GPS thiết bị [SRS 4.5]
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  useEffect(() => {
    startCamera();
    fetchLocation();

    return () => {
      stopCamera();
    };
  }, []);

  // 5. Gửi Check-in lên hệ thống
  const handleConfirmCheckin = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const method = proofUrl ? 'proof_submission' : 'qr_scan';
      const res = await checkinAPI.checkin({
        tournament_id: registration.tournament_id,
        registration_id: registration.id,
        checkin_method: method,
        proof_url: proofUrl || null,
        latitude: gpsLocation?.latitude || null,
        longitude: gpsLocation?.longitude || null,
        location_accuracy: gpsLocation?.accuracy || null,
        device_info: navigator.userAgent,
        notes: qrCodeData
          ? `Mã QR: ${qrCodeData}`
          : proofUrl
          ? 'Điểm danh qua ảnh chụp minh chứng Camera'
          : 'Quét QR qua Camera thiết bị',
      });

      if (res.success) {
        setSubmitSuccess(true);
        stopCamera();
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Không thể thực hiện Check-in');
      }
    } catch (err: any) {
      setErrorMessage('Lỗi kết nối: ' + (err.message || 'Không thể gửi dữ liệu'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="csm-overlay" onClick={onClose}>
      <div className="csm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="csm-header">
          <div className="csm-header-left">
            <span className="csm-pill">📸 CHECK-IN NGÀY THI ĐẤU</span>
            <h2 className="csm-title">{tournamentName}</h2>
          </div>
          <button className="csm-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Hidden input for Native Camera capture */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleProofFileChange}
        />

        {/* Body */}
        <div className="csm-body">
          {submitSuccess ? (
            <div className="csm-success-state">
              <span className="csm-success-icon">🎉</span>
              <h3>ĐIỂM DANH (CHECK-IN) THÀNH CÔNG!</h3>
              <p>Bạn đã hoàn tất thủ tục điểm danh. Trạng thái đã được cập nhật thành: <strong>ĐÃ CHECK-IN</strong>.</p>
            </div>
          ) : (
            <>
              {/* Camera Scanner Viewfinder */}
              <div className="csm-camera-container">
                <video ref={videoRef} className="csm-video" autoPlay playsInline muted />

                {/* Cyberpunk Scan Overlay (only show if camera is running) */}
                {cameraActive && !proofPreview && (
                  <div className="csm-scanner-overlay">
                    <div className="csm-corner top-left" />
                    <div className="csm-corner top-right" />
                    <div className="csm-corner bottom-left" />
                    <div className="csm-corner bottom-right" />
                    <div className="csm-laser-line" />
                    <div className="csm-scan-guide">
                      Hướng camera về phía Mã QR của Ban Tổ Chức tại bàn điểm danh
                    </div>
                  </div>
                )}

                {/* Proof preview overlay if user took a photo */}
                {proofPreview && (
                  <div className="csm-proof-preview-container">
                    <img src={proofPreview} alt="Ảnh chụp minh chứng" className="csm-proof-preview-img" />
                    <span className="csm-proof-badge">
                      {isUploadingProof ? '⏳ Đang tải ảnh lên...' : '✅ Đã ghi nhận ảnh minh chứng'}
                    </span>
                    <button
                      type="button"
                      className="csm-btn-retake"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📷 Chụp lại ảnh khác
                    </button>
                  </div>
                )}

                {/* Camera fallback if camera cannot open */}
                {cameraError && !proofPreview && (
                  <div className="csm-camera-fallback">
                    <span className="csm-camera-warn-icon">📷</span>
                    <p>{cameraError}</p>

                    <div className="csm-fallback-actions">
                      <button
                        type="button"
                        className="csm-btn-snap"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        📸 Chụp ảnh bằng Camera điện thoại
                      </button>
                      <button type="button" className="csm-btn-retry" onClick={startCamera}>
                        ↻ Thử lại
                      </button>
                    </div>

                    <button
                      type="button"
                      className="csm-btn-guide-toggle"
                      onClick={() => setShowSafariGuide(!showSafariGuide)}
                    >
                      {showSafariGuide ? '▲ Đóng hướng dẫn Safari' : '💡 Cách mở quyền Camera trên Safari iPhone'}
                    </button>

                    {showSafariGuide && (
                      <div className="csm-safari-guide-box">
                        <strong>Mở quyền Camera trên Safari (iPhone):</strong>
                        <ol>
                          <li>Bấm vào biểu tượng <strong>aA</strong> bên trái thanh địa chỉ Safari.</li>
                          <li>Chọn <strong>Cài đặt trang web (Website Settings)</strong>.</li>
                          <li>Tại mục <strong>Máy ảnh (Camera)</strong>, chọn <strong>Cho phép (Allow)</strong>.</li>
                          <li>Tải lại trang để áp dụng.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status info bar */}
              <div className="csm-info-bar">
                <div className="csm-info-item">
                  <span className="csm-info-icon">👤</span>
                  <div>
                    <span className="csm-label">VĐV / Ingame ID</span>
                    <strong className="csm-val">{registration.ingame_id || 'Thí sinh'}</strong>
                  </div>
                </div>

                <div className="csm-info-item">
                  <span className="csm-info-icon">📍</span>
                  <div>
                    <span className="csm-label">Tọa độ GPS</span>
                    <strong className="csm-val">
                      {gpsLoading
                        ? 'Đang dò vị trí...'
                        : gpsLocation
                        ? `${gpsLocation.latitude.toFixed(4)}, ${gpsLocation.longitude.toFixed(4)}`
                        : 'GPS chưa bật'}
                    </strong>
                  </div>
                </div>

                <div className="csm-info-item">
                  <span className="csm-info-icon">📷</span>
                  <div>
                    <span className="csm-label">Trạng thái Camera</span>
                    <strong className={`csm-val ${cameraActive || proofPreview ? 'online' : 'offline'}`}>
                      {cameraActive ? '🟢 Sẵn sàng' : proofPreview ? '📸 Đã chụp' : '🔴 Chưa mở'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="csm-alert-error">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Optional: Manual QR code input fallback */}
              <div className="csm-code-row">
                <input
                  type="text"
                  className="csm-input"
                  placeholder="Hoặc nhập mã số Check-in do BTC cung cấp (nếu có)..."
                  value={qrCodeData}
                  onChange={(e) => setQrCodeData(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitSuccess && (
          <div className="csm-footer">
            <button type="button" className="csm-btn-cancel" onClick={onClose} disabled={submitting}>
              Đóng
            </button>
            <button
              type="button"
              className="csm-btn-submit"
              onClick={handleConfirmCheckin}
              disabled={submitting || isUploadingProof}
            >
              {submitting
                ? '⏳ Đang xác thực...'
                : isUploadingProof
                ? '⏳ Đang tải ảnh minh chứng...'
                : '⚡ Xác Nhận Điểm Danh (Check-in)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
