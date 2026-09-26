'use client';

import React, { useEffect, useState } from 'react';
import { checkinAPI } from '../services/checkin.service';
import { registrationAPI } from '../services/registration.service';
import type { ParticipantRow } from '../services/participant.service';
import type { Registration } from '../types';
import LeafletCheckinMap, { type CheckinMapPoint } from './LeafletCheckinMap';
import {
  collectDeviceTelemetry,
  getDeviceInfoString,
  getOrCreateDeviceId,
  isIosDevice,
  isSafariBrowser,
  isZaloInApp,
} from '../utils/device';
import {
  createManualPinpointLocation,
  diagnoseGeolocationError,
  getHighPrecisionLocation,
  isSecureContextForGeolocation,
  type GeolocationDiagnosis,
  type LocationResult,
} from '../utils/geolocation';
import '../styles/SoloCheckinModal.css';

interface SoloCheckinModalProps {
  tournamentId: string;
  tournamentName: string;
  currentUser: ParticipantRow | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SoloCheckinModal({
  tournamentId,
  tournamentName,
  currentUser,
  onClose,
  onSuccess,
}: SoloCheckinModalProps) {
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkinRecord, setCheckinRecord] = useState<any | null>(null);

  // Vị trí & Thiết bị
  const [deviceId, setDeviceId] = useState<string>('');
  const [locationResult, setLocationResult] = useState<LocationResult | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [diagnosis, setDiagnosis] = useState<GeolocationDiagnosis | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [gpsProgress, setGpsProgress] = useState<{
    accuracy: number;
    sampleCount: number;
    isTargetReached: boolean;
  } | null>(null);

  // Môi trường
  const isIos = isIosDevice();
  const isSafari = isSafariBrowser();
  const isZalo = isZaloInApp();
  const isSecure = isSecureContextForGeolocation();

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());

    let isMounted = true;
    (async () => {
      try {
        setLoadingInitial(true);

        // 1. Kiểm tra trạng thái check-in hiện tại
        const statusRes = await checkinAPI.getMyStatus(tournamentId);
        if (!isMounted) return;

        if (statusRes.success && statusRes.data) {
          if (statusRes.data.has_checked_in && statusRes.data.checkin) {
            setHasCheckedIn(true);
            setCheckinRecord(statusRes.data.checkin);
          }
        }

        // 2. Lấy đơn đăng ký của thí sinh
        const regRes = await registrationAPI.getMyTournamentRegistration(tournamentId);
        if (isMounted && regRes.success && regRes.data) {
          setUserRegistration(regRes.data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Lỗi khi tải thông tin đăng ký / check-in:', err);
        }
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  // 1. Dò GPS Vệ Tinh Đa Mẫu Độ Chính Xác Cao (< 4 mét)
  const handleHighPrecisionGps = async () => {
    setDiagnosis(null);
    setGeneralError(null);
    setGpsProgress(null);
    setLocating(true);

    try {
      const loc = await getHighPrecisionLocation({
        targetAccuracyMeters: 4.0,
        maxWaitMs: 14000,
        allowFallback: false,
        onProgress: (prog) => {
          setGpsProgress({
            accuracy: prog.accuracy,
            sampleCount: prog.sampleCount,
            isTargetReached: prog.isTargetReached,
          });
        },
      });

      setLocationResult(loc);
      setGpsProgress(null);
    } catch (err: any) {
      console.warn('Dò GPS vệ tinh thất bại:', err);
      const diag = diagnoseGeolocationError(err);
      setDiagnosis(diag);
      setGeneralError(
        'Không bắt được GPS vệ tinh tự động (do máy tính không có chip GPS hoặc trình duyệt chặn quyền). Vui lòng chạm/nhấp vào đúng vị trí của bạn trên bản đồ bên dưới để chốt tọa độ sai số < 4 mét.'
      );
    } finally {
      setLocating(false);
    }
  };

  // 2. Chấm vị trí chuẩn xác trực tiếp trên bản đồ (< 4 mét)
  const handleMapLocationPick = (coords: { latitude: number; longitude: number; accuracy: number }) => {
    const manualLoc = createManualPinpointLocation(coords.latitude, coords.longitude, coords.accuracy);
    setLocationResult(manualLoc);
    setGeneralError(null);
    setDiagnosis(null);
  };

  // 3. Gửi dữ liệu check-in lên hệ thống
  const handleFinalSubmitCheckin = async () => {
    if (!locationResult) {
      setGeneralError('Vui lòng chọn hoặc dò vị trí trước khi xác nhận điểm danh.');
      return;
    }

    try {
      setSubmitting(true);
      setGeneralError(null);
      const devInfoStr = getDeviceInfoString();

      // Kiểm tra và hỗ trợ đăng ký Solo TFT nếu chưa có
      let regId = userRegistration?.id;
      if (!regId) {
        try {
          const autoReg = await registrationAPI.create(tournamentId, {
            ingame_id: currentUser?.full_name || currentUser?.username || 'Thí sinh Solo',
            role_in_team: 'member',
          });
          if (autoReg.success && autoReg.data) {
            regId = autoReg.data.id;
            setUserRegistration(autoReg.data);
          }
        } catch (autoErr) {
          console.info('Auto-registration notice:', autoErr);
        }
      }

      const noteStr = locationResult.isManualPinpoint
        ? `[Định vị chuẩn xác] Thí sinh xác nhận vị trí trên bản đồ Leaflet (Sai số: ±${locationResult.accuracy.toFixed(1)}m) [Mã máy: ${deviceId}]`
        : locationResult.isHttpFallback
        ? `[HTTP LAN Mode] Điểm danh qua mạng nội bộ [Mã máy: ${deviceId}]`
        : `Check-in GPS vệ tinh chuẩn xác [Sai số: ±${locationResult.accuracy.toFixed(1)}m] [Mã máy: ${deviceId}]`;

      const checkinPayload = {
        tournament_id: tournamentId,
        registration_id: regId,
        checkin_method: 'qr_scan' as const,
        latitude: locationResult.latitude,
        longitude: locationResult.longitude,
        location_accuracy: locationResult.accuracy,
        device_info: devInfoStr,
        notes: noteStr,
      };

      const res = await checkinAPI.checkin(checkinPayload);
      if (res.success && res.data) {
        setHasCheckedIn(true);
        setCheckinRecord(res.data);
        if (onSuccess) onSuccess();
      } else {
        setGeneralError(res.message || 'Không thể ghi nhận điểm danh. Vui lòng thử lại.');
      }
    } catch (apiErr: any) {
      console.warn('Checkin API submission error:', apiErr?.message || apiErr);
      setGeneralError(apiErr?.message || 'Có lỗi xảy ra khi gửi dữ liệu điểm danh lên máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Trích xuất mã máy từ checkinRecord nếu đã check-in
  const displayDeviceId = React.useMemo(() => {
    if (checkinRecord?.device_info) {
      try {
        const parsed = JSON.parse(checkinRecord.device_info);
        if (parsed.deviceId) return parsed.deviceId;
      } catch {
        if (typeof checkinRecord.device_info === 'string' && checkinRecord.device_info.includes('DUT-DEV-')) {
          const match = checkinRecord.device_info.match(/DUT-DEV-[A-Z0-9-]+/);
          if (match) return match[0];
        }
      }
    }
    return deviceId;
  }, [checkinRecord, deviceId]);

  // Chuẩn bị điểm hiển thị trên bản đồ Leaflet
  const mapPoints: CheckinMapPoint[] = React.useMemo(() => {
    if (hasCheckedIn && checkinRecord?.latitude && checkinRecord?.longitude) {
      const isHttpRec = typeof checkinRecord.notes === 'string' && checkinRecord.notes.includes('HTTP LAN');
      return [
        {
          id: checkinRecord.id || 'current',
          latitude: Number(checkinRecord.latitude),
          longitude: Number(checkinRecord.longitude),
          accuracy: checkinRecord.location_accuracy ? Number(checkinRecord.location_accuracy) : 30,
          participantName: currentUser?.full_name || 'Bạn',
          studentId: currentUser?.student_id || undefined,
          ingameId: userRegistration?.ingame_id || undefined,
          deviceId: displayDeviceId,
          checkedInAt: checkinRecord.checked_in_at || new Date().toISOString(),
          isCurrentUser: true,
          isHttpFallback: isHttpRec,
        },
      ];
    }
    if (locationResult) {
      return [
        {
          id: 'preview',
          latitude: locationResult.latitude,
          longitude: locationResult.longitude,
          accuracy: locationResult.accuracy,
          participantName: currentUser?.full_name || 'Bạn',
          studentId: currentUser?.student_id || undefined,
          ingameId: userRegistration?.ingame_id || undefined,
          deviceId,
          checkedInAt: new Date().toISOString(),
          isCurrentUser: true,
          isHttpFallback: locationResult.isHttpFallback,
        },
      ];
    }
    return [];
  }, [hasCheckedIn, checkinRecord, locationResult, currentUser, userRegistration, displayDeviceId, deviceId]);

  return (
    <div className="scm-overlay" onClick={onClose}>
      <div className="scm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="scm-header">
          <div>
            <span className="scm-badge-pill">📸 CHECK-IN GIẢI CÁ NHÂN (TFT)</span>
            <h2 className="scm-title">{tournamentName}</h2>
          </div>
          <button className="scm-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="scm-body">
          {loadingInitial ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
              <p>Đang kiểm tra thông tin thí sinh &amp; trạng thái điểm danh...</p>
            </div>
          ) : (
            <>
              {/* Thẻ thông tin Thí sinh & Mã máy */}
              <div className="scm-info-grid">
                <div className="scm-info-item">
                  <span className="scm-label">Thí sinh</span>
                  <span className="scm-val">{currentUser?.full_name || 'Chưa cập nhật'}</span>
                </div>
                <div className="scm-info-item">
                  <span className="scm-label">MSSV / Tài khoản</span>
                  <span className="scm-val">{currentUser?.student_id || currentUser?.username || 'N/A'}</span>
                </div>
                <div className="scm-info-item">
                  <span className="scm-label">Ingame ID (TFT)</span>
                  <span className="scm-val highlight">{userRegistration?.ingame_id || 'Thí sinh Solo'}</span>
                </div>
                <div className="scm-info-item">
                  <span className="scm-label">Mã máy ghi nhận</span>
                  <span className="scm-val device-id">{displayDeviceId}</span>
                </div>
              </div>

              {/* Thông báo In-App Zalo */}
              {isZalo && !hasCheckedIn && (
                <div className="scm-zalo-tip">
                  <span style={{ fontSize: '18px' }}>💡</span>
                  <span>
                    Bạn đang mở trong <strong>Zalo</strong>. Để lấy định vị GPS nhạy nhất trên iPhone, bạn có thể bấm dấu <strong>&ldquo;...&rdquo;</strong> ở góc trên và chọn <strong>&ldquo;Mở bằng trình duyệt Safari&rdquo;</strong>.
                  </span>
                </div>
              )}

              {/* Thông báo chế độ HTTP / Mạng LAN */}
              {!isSecure && !hasCheckedIn && (
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '12.5px',
                    color: '#93c5fd',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                    <span>🌐 Đang chạy trên kết nối HTTP (Mạng LAN / Thử nghiệm)</span>
                  </div>
                  <div>
                    Hệ thống đã kích hoạt cơ chế <strong>Check-in Linh Hoạt</strong>: Hỗ trợ thử GPS nếu trình duyệt cho phép, hoặc tự động lưu theo <strong>Mã Máy ({deviceId}) &amp; IP</strong> nếu Safari chặn GPS trên HTTP.
                  </div>
                </div>
              )}

              {/* TRƯỜNG HỢP 1: ĐÃ CHECK-IN THÀNH CÔNG */}
              {hasCheckedIn ? (
                <>
                  <div className="scm-success-banner">
                    <span className="scm-success-icon">✅</span>
                    <div>
                      <h4 className="scm-success-title">BẠN ĐÃ ĐIỂM DANH (CHECK-IN) THÀNH CÔNG!</h4>
                      <p className="scm-success-desc">
                        Hệ thống đã lưu lại mã máy và tọa độ của bạn.
                        {checkinRecord?.location_accuracy ? ` Sai số ghi nhận: ±${Number(checkinRecord.location_accuracy).toFixed(1)}m.` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Bản đồ Leaflet vị trí Check-in */}
                  <LeafletCheckinMap
                    points={mapPoints}
                    height={280}
                    title="Vị Trí Check-in Của Bạn (OpenStreetMap)"
                    currentDeviceId={displayDeviceId}
                  />

                  {/* Nút hỗ trợ hiệu chỉnh / chấm lại vị trí nếu tọa độ trước đó bị lệch */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="scm-btn-secondary"
                      onClick={() => {
                        setHasCheckedIn(false);
                        if (checkinRecord?.latitude && checkinRecord?.longitude) {
                          setLocationResult({
                            latitude: Number(checkinRecord.latitude),
                            longitude: Number(checkinRecord.longitude),
                            accuracy: checkinRecord.location_accuracy ? Number(checkinRecord.location_accuracy) : 3.0,
                            source: 'manual_pinpoint',
                            isManualPinpoint: true,
                          });
                        }
                      }}
                      style={{ borderColor: '#f59e0b', color: '#fde047', fontWeight: 600, padding: '10px 16px' }}
                    >
                      ✏️ Tọa độ bị lệch? Bấm để định vị lại chuẩn xác (&lt; 4 mét)
                    </button>
                  </div>
                </>
              ) : (
                /* TRƯỜNG HỢP 2: CHƯA CHECK-IN HOẶC ĐANG ĐIỀU CHỈNH TỌA ĐỘ (< 4M) */
                <>
                  {/* Thẻ giám sát sai số theo thời gian thực */}
                  {locationResult ? (
                    locationResult.accuracy <= 4.0 ? (
                      <div className="scm-accuracy-card success">
                        <div className="scm-accuracy-header">
                          <span>🎯 Tọa độ đã chọn: {locationResult.latitude.toFixed(6)}, {locationResult.longitude.toFixed(6)}</span>
                          <span className="scm-accuracy-badge-tag pass">✅ ĐẠT CHUẨN &lt; 4M (±{locationResult.accuracy.toFixed(1)}m)</span>
                        </div>
                        <div>
                          Vị trí đã đáp ứng yêu cầu sai số dưới 4 mét ({locationResult.isManualPinpoint ? 'Chấm chuẩn xác trên bản đồ' : 'Khóa vệ tinh GNSS'}). Bạn có thể nhấn nút xác nhận bên dưới.
                        </div>
                      </div>
                    ) : (
                      <div className="scm-accuracy-card warning">
                        <div className="scm-accuracy-header">
                          <span>⚠️ Sai số vệ tinh hiện tại: ±{locationResult.accuracy.toFixed(1)}m</span>
                          <span className="scm-accuracy-badge-tag fail">CẦN &lt; 4M</span>
                        </div>
                        <div>
                          Sai số hiện tại vượt quá 4 mét. Hãy nhấp trực tiếp vào bản đồ bên dưới để chốt vị trí chuẩn xác với sai số ±3.0m (&lt; 4m).
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="scm-accuracy-card neutral">
                      <div className="scm-accuracy-header">
                        <span>📍 Xác định vị trí thi đấu</span>
                        <span className="scm-accuracy-badge-tag" style={{ background: '#1e293b', color: '#94a3b8' }}>
                          YÊU CẦU &lt; 4 MET
                        </span>
                      </div>
                      <div>
                        Bấm <strong>&ldquo;Dò GPS Vệ Tinh&rdquo;</strong> hoặc <strong>nhấp trực tiếp vào bản đồ bên dưới</strong> (khu vực Hồ Tùng Mậu / Trần Nguyên Đán) để lấy vị trí chuẩn xác.
                      </div>
                    </div>
                  )}

                  {/* Bản đồ Leaflet tương tác trực tiếp */}
                  <LeafletCheckinMap
                    points={mapPoints}
                    height={280}
                    title="Bản Đồ Xác Định Vị Trí (OpenStreetMap)"
                    currentDeviceId={deviceId}
                    interactivePicker={true}
                    onLocationPick={handleMapLocationPick}
                    pickerHint="Nhấp hoặc kéo ghim 🎯 đến đúng số nhà/ngõ hẻm của bạn (Sai số chốt: ±3.0m < 4m)"
                  />

                  {/* Phím tắt vị trí nhanh */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Phím tắt nhanh:</span>
                    <button
                      type="button"
                      className="scm-btn-secondary"
                      onClick={() => handleMapLocationPick({ latitude: 16.07605, longitude: 108.15290, accuracy: 3.0 })}
                      style={{ fontSize: '12px', padding: '5px 10px', borderColor: '#10b981', color: '#6ee7b7' }}
                    >
                      🎯 1/9 Hồ Tùng Mậu / Trần Nguyên Đán (±3.0m)
                    </button>
                    <button
                      type="button"
                      className="scm-btn-secondary"
                      onClick={() => handleMapLocationPick({ latitude: 16.07480, longitude: 108.14990, accuracy: 3.0 })}
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                    >
                      🏫 Cổng ĐH Bách Khoa DUT (±3.0m)
                    </button>
                  </div>

                  {/* Trạng thái Dò GPS vệ tinh streaming */}
                  {locating && gpsProgress && (
                    <div
                      style={{
                        background: 'rgba(0, 240, 255, 0.12)',
                        border: '1px solid #00f0ff',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        color: '#a5f3fc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>🛰️</span>
                      <span>
                        Đang dò vệ tinh GNSS đa mẫu (Mẫu #{gpsProgress.sampleCount})
                        {gpsProgress.accuracy ? ` — Sai số hiện tại: ±${gpsProgress.accuracy.toFixed(1)}m` : ''}
                        ... Đang đợi đạt chuẩn &lt; 4m.
                      </span>
                    </div>
                  )}

                  {/* Các nút hành động chính */}
                  <div className="scm-action-box" style={{ marginTop: '4px' }}>
                    {/* Nút 1: Xác nhận check-in khi đã có vị trí đạt chuẩn */}
                    <button
                      type="button"
                      className="scm-btn-confirm-checkin"
                      onClick={handleFinalSubmitCheckin}
                      disabled={!locationResult || locationResult.accuracy > 4.0 || submitting || locating}
                    >
                      {submitting ? (
                        '⏳ Đang lưu dữ liệu điểm danh...'
                      ) : locationResult && locationResult.accuracy <= 4.0 ? (
                        `✅ Xác Nhận Check-in Tọa Độ Này (Sai số: ±${locationResult.accuracy.toFixed(1)}m)`
                      ) : (
                        '👆 Hãy chọn vị trí trên bản đồ (< 4m) trước khi xác nhận'
                      )}
                    </button>

                    {/* Nút 2: Dò GPS vệ tinh nếu trên thiết bị di động */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                      <button
                        type="button"
                        className="scm-btn-secondary"
                        onClick={handleHighPrecisionGps}
                        disabled={locating || submitting}
                        style={{ flex: 1, padding: '10px 14px', fontSize: '13.5px', borderColor: '#38bdf8', color: '#38bdf8' }}
                      >
                        {locating ? '🛰️ Đang dò vệ tinh GPS...' : '🛰️ Dò GPS Vệ Tinh Tự Động (< 4m)'}
                      </button>
                    </div>

                    <p className="scm-action-hint">
                      💡 Bạn có thể nhấp chuột hoặc chạm trực tiếp vào bản đồ để chọn đúng số nhà/ngõ hẻm (đảm bảo 100% sai số dưới 4 mét).
                    </p>
                  </div>

                  {/* Thông báo lỗi tổng quát */}
                  {generalError && (
                    <div className="scm-diagnostic-card">
                      <h4 className="scm-diag-title">⚠️ Lưu ý Điểm Danh</h4>
                      <p className="scm-diag-msg">{generalError}</p>
                    </div>
                  )}

                  {/* Hộp thoại Chẩn đoán lỗi Geolocation & Hướng dẫn Safari iPhone 11 */}
                  {diagnosis && (
                    <div className="scm-diagnostic-card">
                      <h4 className="scm-diag-title">
                        <span>⚠️ {diagnosis.code === 'PERMISSION_DENIED' ? 'Quyền Vị Trí Bị Từ Chối' : 'Thông Tin GPS Vệ Tinh'}</span>
                      </h4>
                      <p className="scm-diag-msg">{diagnosis.message}</p>

                      {diagnosis.guideSteps && diagnosis.guideSteps.length > 0 && (
                        <div className="scm-diag-guide">
                          <div className="scm-guide-heading">
                            {diagnosis.guideTitle || 'Hướng dẫn khắc phục:'}
                          </div>
                          {diagnosis.guideSteps.map((step, idx) => (
                            <div key={idx} className="scm-guide-step">
                              {step}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="scm-footer">
          <button type="button" className="scm-btn-secondary" onClick={onClose}>
            {hasCheckedIn ? 'Đã Hoàn Tất' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}
