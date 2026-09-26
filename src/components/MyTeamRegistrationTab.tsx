'use client';

import React, { useEffect, useState } from 'react';
import { registrationAPI } from '../services/registration.service';
import type { Registration, SafeUser, TeamJoinRequest, Tournament } from '../types';
import '../styles/MyTeamRegistrationTab.css';

interface Props {
  tournament: Tournament;
  currentUser: SafeUser | null;
  onRegisterClick?: () => void;
  onStatusChanged?: () => void;
}

export default function MyTeamRegistrationTab({
  tournament,
  currentUser,
  onRegisterClick,
  onStatusChanged,
}: Props) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Captain recruiting toggle state
  const [isTogglingRecruiting, setIsTogglingRecruiting] = useState(false);
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [recruitmentNotes, setRecruitmentNotes] = useState('');

  // Reject modal state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  const fetchMyRegistration = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await registrationAPI.getMyTournamentRegistration(tournament.id);
      if (res.success && res.data) {
        setRegistration(res.data);
        setRecruitmentNotes(res.data.recruitment_notes || '');

        // Nếu là captain của team, load join requests
        if (res.data.is_captain && res.data.participation_type === 'team') {
          const reqRes = await registrationAPI.getJoinRequests(res.data.id);
          if (reqRes.success && reqRes.data) {
            setJoinRequests(reqRes.data);
          }
        }
      } else {
        setRegistration(null);
      }
    } catch (err) {
      setError('Lỗi tải thông tin đăng ký: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRegistration();
  }, [tournament.id, currentUser?.id]);

  const handleToggleRecruiting = async () => {
    if (!registration) return;
    const nextState = !registration.is_recruiting;

    try {
      setIsTogglingRecruiting(true);
      const res = await registrationAPI.updateRecruiting(
        registration.id,
        nextState,
        registration.recruitment_notes || undefined,
      );
      if (res.success) {
        setRegistration((prev) => (prev ? { ...prev, is_recruiting: nextState } : prev));
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể cập nhật'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsTogglingRecruiting(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration) return;

    try {
      setIsTogglingRecruiting(true);
      const res = await registrationAPI.updateRecruiting(
        registration.id,
        registration.is_recruiting ?? false,
        recruitmentNotes.trim(),
      );
      if (res.success) {
        setRegistration((prev) => (prev ? { ...prev, recruitment_notes: recruitmentNotes.trim() } : prev));
        setShowEditNotesModal(false);
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể lưu ghi chú'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsTogglingRecruiting(false);
    }
  };

  const handleAcceptRequest = async (requestId: string, applicantName: string) => {
    if (!registration) return;
    if (!confirm(`Xác nhận duyệt "${applicantName}" vào đội của bạn?`)) return;

    try {
      setIsProcessingRequest(true);
      const res = await registrationAPI.processJoinRequest(registration.id, requestId, 'accepted');
      if (res.success) {
        alert('✅ Đã duyệt thành viên thành công!');
        fetchMyRegistration();
        onStatusChanged?.();
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể duyệt'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration || !rejectingRequestId) return;

    try {
      setIsProcessingRequest(true);
      const res = await registrationAPI.processJoinRequest(
        registration.id,
        rejectingRequestId,
        'rejected',
        rejectReason.trim() || undefined,
      );
      if (res.success) {
        setRejectingRequestId(null);
        setRejectReason('');
        fetchMyRegistration();
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể từ chối'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!registration) return;
    if (!confirm('⚠️ Bạn có chắc chắn muốn HỦY đơn đăng ký giải đấu này? Thao tác này không thể hoàn tác!')) {
      return;
    }

    try {
      const res = await registrationAPI.cancel(registration.id);
      if (res.success) {
        alert('✅ Đã hủy đơn đăng ký thành công!');
        fetchMyRegistration();
        onStatusChanged?.();
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể hủy đơn'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    }
  };

  if (!currentUser) {
    return (
      <div className="rm-empty-state">
        <div style={{ fontSize: '2.5rem' }}>🔒</div>
        <h4>Vui lòng đăng nhập để xem thông tin đội & đơn đăng ký</h4>
      </div>
    );
  }

  if (loading) {
    return <div className="rm-empty-state">⏳ Đang kiểm tra trạng thái đăng ký...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px' }}>⚠️ {error}</div>;
  }

  if (!registration) {
    const isOpen = new Date() < new Date(tournament.registration_close_at);
    return (
      <div className="rm-empty-state">
        <div style={{ fontSize: '2.5rem' }}>📋</div>
        <h4>Bạn chưa đăng ký tham gia giải đấu này</h4>
        <p>Đăng ký ngay bây giờ để tham gia thi đấu cùng các game thủ DUT!</p>
        {isOpen ? (
          <button
            className="to-btn-add"
            style={{ marginTop: '16px' }}
            onClick={onRegisterClick}
          >
            ✅ Đăng Ký Tham Gia Ngay
          </button>
        ) : (
          <div style={{ color: '#94a3b8', marginTop: '12px' }}>Đã hết hạn đăng ký giải đấu.</div>
        )}
      </div>
    );
  }

  const isCaptain = registration.is_captain ?? false;
  const isTeam = tournament.participation_type === 'team';
  const isCanCancel =
    new Date() < new Date(tournament.registration_close_at) &&
    registration.status !== 'cancelled' &&
    isCaptain;

  const STATUS_CONFIG = {
    pending: { label: '⏳ Chờ Ban Tổ Chức Phê Duyệt', class: 'pending' },
    approved: { label: '✅ Đã Phê Duyệt Tham Gia', class: 'approved' },
    rejected: { label: '❌ Bị Từ Chối Đăng Ký', class: 'rejected' },
    cancelled: { label: '🚫 Đã Hủy Đơn', class: 'cancelled' },
  }[registration.status] || { label: registration.status, class: 'pending' };

  return (
    <div className="my-reg-container">
      {/* Main Registration Card */}
      <div className="my-reg-card">
        <div className="my-reg-header">
          <div className="my-reg-title-block">
            <h3>
              <span>{isTeam ? '🛡️' : '👤'}</span> {isTeam ? registration.team_name || 'Đội Của Bạn' : 'Hồ Sơ Đăng Ký Thi Đấu'}
            </h3>
            <p>
              {isCaptain ? '👑 Bạn là Đội Trưởng của đơn đăng ký này' : '👤 Bạn là Thành Viên trong đội'} • Đăng ký lúc: {new Date(registration.registered_at).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className={`my-reg-badge ${STATUS_CONFIG.class}`}>{STATUS_CONFIG.label}</div>
        </div>

        {/* Rejection notice */}
        {registration.status === 'rejected' && registration.rejection_reason && (
          <div className="my-reg-rejection-banner">
            <strong>Lý do từ chối từ Ban Tổ Chức:</strong> {registration.rejection_reason}
          </div>
        )}

        {/* Overview Stats Grid */}
        <div className="my-reg-info-grid">
          <div className="my-reg-info-item">
            <span className="my-reg-info-label">Ingame ID (Đội Trưởng):</span>
            <span className="my-reg-info-value">{registration.ingame_id || 'Chưa cập nhật'}</span>
          </div>

          {isTeam && (
            <>
              <div className="my-reg-info-item">
                <span className="my-reg-info-label">Số Lượng Thành Viên:</span>
                <span className="my-reg-info-value">
                  {registration.members?.length || 1} / {tournament.max_team_size || 5} TV
                </span>
              </div>
              <div className="my-reg-info-item">
                <span className="my-reg-info-label">Chế Độ Tuyển Quân:</span>
                <span className="my-reg-info-value" style={{ color: registration.is_recruiting ? '#10b981' : '#94a3b8' }}>
                  {registration.is_recruiting ? '🟢 Đang Mở Tuyển' : '⚪ Đã Đóng Tuyển'}
                </span>
              </div>
            </>
          )}

          <div className="my-reg-info-item">
            <span className="my-reg-info-label">Hạn Chót Hủy Đơn:</span>
            <span className="my-reg-info-value" style={{ fontSize: '0.9rem' }}>
              {new Date(tournament.registration_close_at).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        {/* Captain Recruitment Controls */}
        {isCaptain && isTeam && registration.status !== 'cancelled' && (
          <div className="my-reg-captain-box">
            <div className="my-reg-captain-box-header">
              <h4>
                <span>📢</span> Cấu Hình Chợ Tuyển Quân (Đội Trưởng)
              </h4>
              <div className="my-reg-recruiting-toggle">
                <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
                  {registration.is_recruiting ? 'Mở tuyển quân' : 'Đóng tuyển quân'}
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={registration.is_recruiting ?? false}
                    onChange={handleToggleRecruiting}
                    disabled={isTogglingRecruiting}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                <strong>Vị trí đang tìm:</strong>{' '}
                {registration.recruitment_notes ? `"${registration.recruitment_notes}"` : 'Chưa có ghi chú cụ thể'}
              </div>
              <button
                className="to-btn-cancel"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={() => setShowEditNotesModal(true)}
              >
                ✏️ Đổi Ghi Chú Tuyển Quân
              </button>
            </div>
          </div>
        )}

        {/* Members List Table */}
        <div className="my-reg-members-section">
          <h4>👥 Danh Sách Thành Viên Trong Đội ({registration.members?.length || 1})</h4>
          <div className="my-reg-table-wrapper">
            <table className="my-reg-table">
              <thead>
                <tr>
                  <th>Vai Trò</th>
                  <th>Họ và Tên</th>
                  <th>MSSV / Email</th>
                  <th>Ingame ID</th>
                  <th>Vị Trí (Lane)</th>
                  <th>Thời Gian Vào Đội</th>
                </tr>
              </thead>
              <tbody>
                {registration.members?.map((m) => (
                  <tr key={m.participant_id}>
                    <td>
                      {m.is_captain ? (
                        <span style={{ color: '#ffb703', fontWeight: 'bold' }}>👑 Đội Trưởng</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>👤 Thành Viên</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{m.full_name}</td>
                    <td>{m.student_id || m.username || 'N/A'}</td>
                    <td><code className="code-badge">{m.ingame_id || 'Chưa rõ'}</code></td>
                    <td>{m.role_in_team || 'Chưa gán'}</td>
                    <td style={{ color: '#94a3b8' }}>
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString('vi-VN') : 'Ban đầu'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Captain Join Requests Section */}
        {isCaptain && isTeam && registration.status !== 'cancelled' && (
          <div className="my-reg-requests-section">
            <h4>
              <span>📨</span> Danh Sách Ứng Viên Xin Vào Đội ({joinRequests.length})
            </h4>
            {joinRequests.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                Chưa có thí sinh nào nộp đơn xin vào đội của bạn.
              </div>
            ) : (
              <div className="my-reg-table-wrapper">
                <table className="my-reg-table">
                  <thead>
                    <tr>
                      <th>Ứng Viên</th>
                      <th>MSSV & Khoa</th>
                      <th>Ingame ID</th>
                      <th>Lời Nhắn / Vị Trí</th>
                      <th>Trạng Thái</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joinRequests.map((req) => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{req.participant_name}</td>
                        <td>{req.student_id} • {req.faculty_name || ''}</td>
                        <td><code className="code-badge">{req.ingame_id}</code></td>
                        <td style={{ maxWidth: '240px' }}>{req.message || 'Không có lời nhắn'}</td>
                        <td>
                          {req.status === 'pending' && <span style={{ color: '#ffb703' }}>⏳ Chờ duyệt</span>}
                          {req.status === 'accepted' && <span style={{ color: '#10b981' }}>✅ Đã nhận</span>}
                          {req.status === 'rejected' && <span style={{ color: '#ef4444' }}>❌ Đã từ chối</span>}
                          {req.status === 'cancelled' && <span style={{ color: '#94a3b8' }}>🚫 Đã hủy</span>}
                        </td>
                        <td>
                          {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="my-reg-btn-accept"
                                disabled={isProcessingRequest}
                                onClick={() => handleAcceptRequest(req.id, req.participant_name || 'Ứng viên')}
                              >
                                ✓ Duyệt
                              </button>
                              <button
                                className="my-reg-btn-reject"
                                disabled={isProcessingRequest}
                                onClick={() => setRejectingRequestId(req.id)}
                              >
                                ✕ Từ Chối
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Cancel Registration Button */}
        {isCanCancel && (
          <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
            <button className="my-reg-btn-cancel-reg" onClick={handleCancelRegistration}>
              🚫 Hủy Đơn Đăng Ký Này
            </button>
            <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
              (Chỉ có thể hủy khi giải chưa đến hạn đóng đăng ký)
            </span>
          </div>
        )}
      </div>

      {/* Modal Sửa Ghi Chú Tuyển Quân */}
      {showEditNotesModal && (
        <div className="to-modal-overlay" onClick={() => setShowEditNotesModal(false)}>
          <div className="to-modal" onClick={(e) => e.stopPropagation()}>
            <div className="to-modal-header">
              <h4>✏️ Cập Nhật Ghi Chú Tuyển Quân</h4>
              <button className="to-modal-close" onClick={() => setShowEditNotesModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveNotes} className="to-modal-body">
              <div className="to-form-group">
                <label>Vị trí & Yêu cầu cần tuyển:</label>
                <textarea
                  className="to-input"
                  style={{ minHeight: '80px' }}
                  value={recruitmentNotes}
                  onChange={(e) => setRecruitmentNotes(e.target.value)}
                  placeholder="VD: Cần tìm 1 Mid và 1 Rừng rank Tinh Anh+..."
                  required
                />
              </div>
              <div className="to-modal-footer">
                <button type="button" className="to-btn-cancel" onClick={() => setShowEditNotesModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="to-btn-save" disabled={isTogglingRecruiting}>
                  Lưu Ghi Chú
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nhập Lý Do Từ Chối Ứng Viên */}
      {rejectingRequestId && (
        <div className="to-modal-overlay" onClick={() => setRejectingRequestId(null)}>
          <div className="to-modal" onClick={(e) => e.stopPropagation()}>
            <div className="to-modal-header">
              <h4>❌ Từ Chối Ứng Viên</h4>
              <button className="to-modal-close" onClick={() => setRejectingRequestId(null)}>✕</button>
            </div>
            <form onSubmit={handleRejectSubmit} className="to-modal-body">
              <div className="to-form-group">
                <label>Lý do từ chối (tùy chọn):</label>
                <input
                  type="text"
                  className="to-input"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="VD: Đội đã có người chơi vị trí này, Rank chưa phù hợp..."
                  autoFocus
                />
              </div>
              <div className="to-modal-footer">
                <button type="button" className="to-btn-cancel" onClick={() => setRejectingRequestId(null)}>
                  Hủy
                </button>
                <button type="submit" className="my-reg-btn-reject" disabled={isProcessingRequest}>
                  Xác Nhận Từ Chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
