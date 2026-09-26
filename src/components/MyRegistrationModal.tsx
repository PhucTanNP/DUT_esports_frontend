'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registrationAPI } from '../services/registration.service';
import type { Registration, Tournament } from '../types';
import { getTournamentStage } from '../utils/tournamentStage';
import { formatDate } from '../utils/format';
import '../styles/MyRegistrationModal.css';

interface MyRegistrationModalProps {
  registration: Registration;
  tournament: Tournament;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function MyRegistrationModal({
  registration,
  tournament,
  onClose,
  onUpdated,
}: MyRegistrationModalProps) {
  const router = useRouter();
  const stageInfo = getTournamentStage(tournament);

  // Edit form state (for GD2/GD1)
  const [isEditing, setIsEditing] = useState(false);
  const [ingameId, setIngameId] = useState(registration.ingame_id || '');
  const [teamName, setTeamName] = useState(registration.team_name || '');
  const [teamAvatarUrl, setTeamAvatarUrl] = useState(registration.team_avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isTeam = tournament.participation_type === 'team';

  // Parse dynamic submitted data if any
  let dynamicData: Record<string, unknown> = {};
  if (registration.submitted_data) {
    if (typeof registration.submitted_data === 'string') {
      try {
        dynamicData = JSON.parse(registration.submitted_data);
      } catch {
        dynamicData = {};
      }
    } else {
      dynamicData = registration.submitted_data as Record<string, unknown>;
    }
  }

  // Handle Update Information (GD1 & GD2)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingameId.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập Ingame ID hợp lệ' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const res = await registrationAPI.updateInfo(registration.id, {
        ingame_id: ingameId.trim(),
        team_name: isTeam ? teamName.trim() || null : null,
        team_avatar_url: isTeam ? teamAvatarUrl.trim() || null : null,
      });

      if (res.success) {
        setMessage({ type: 'success', text: '✅ Cập nhật thông tin thành công!' });
        setIsEditing(false);
        onUpdated?.();
      } else {
        setMessage({ type: 'error', text: res.message || 'Không thể cập nhật thông tin' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối: ' + (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // Handle Cancel Registration (GD1)
  const handleCancelRegistration = async () => {
    if (!confirm('⚠️ Bạn có chắc chắn muốn HỦY đơn đăng ký giải đấu này? Thao tác này không thể hoàn tác!')) {
      return;
    }

    try {
      setCancelling(true);
      setMessage(null);
      const res = await registrationAPI.cancel(registration.id);
      if (res.success) {
        alert('✅ Đã hủy đơn đăng ký thành công!');
        onUpdated?.();
        onClose();
      } else {
        setMessage({ type: 'error', text: res.message || 'Không thể hủy đơn đăng ký' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối: ' + (err as Error).message });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mrm-overlay" onClick={onClose}>
      <div className="mrm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="mrm-header">
          <div className="mrm-header-left">
            <span className={`mrm-stage-badge ${stageInfo.badgeClass}`}>
              {stageInfo.badgeText}
            </span>
            <h2 className="mrm-title">{tournament.name}</h2>
            <span className="mrm-game-tag">🎮 {tournament.game_name}</span>
          </div>
          <button className="mrm-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="mrm-body">
          {message && (
            <div className={`mrm-alert ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Status Banner */}
          <div className={`mrm-status-card status-${registration.status}`}>
            <div className="mrm-status-icon">
              {registration.status === 'approved' && '✅'}
              {registration.status === 'pending' && '⏳'}
              {registration.status === 'rejected' && '❌'}
              {registration.status === 'cancelled' && '🚫'}
            </div>
            <div className="mrm-status-info">
              <h4>
                {registration.status === 'approved' && 'ĐƠN ĐĂNG KÝ ĐÃ ĐƯỢC DUYỆT'}
                {registration.status === 'pending' && 'ĐANG CHỜ BAN TỔ CHỨC PHÊ DUYỆT'}
                {registration.status === 'rejected' && 'ĐƠN ĐĂNG KÝ BỊ TỪ CHỐI'}
                {registration.status === 'cancelled' && 'ĐƠN ĐĂNG KÝ ĐÃ HỦY'}
              </h4>
              <p>
                {registration.status === 'approved' && 'Bạn đã chính thức có tên trong danh sách thi đấu của giải!'}
                {registration.status === 'pending' && 'Ban tổ chức đang rà soát thông tin đăng ký của bạn. Vui lòng chờ thông báo.'}
                {registration.status === 'rejected' && (registration.rejection_reason ? `Lý do: ${registration.rejection_reason}` : 'Thông tin đăng ký không đáp ứng thể lệ giải đấu.')}
                {registration.status === 'cancelled' && 'Đơn đăng ký đã bị hủy theo yêu cầu của bạn.'}
              </p>
            </div>
          </div>

          {/* Edit Form or Information Display */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="mrm-edit-form">
              <h4 className="mrm-section-heading">✏️ Cập Nhật Thông Tin Đăng Ký (Giai đoạn {stageInfo.stage})</h4>

              <div className="mrm-form-group">
                <label>Ingame ID / Riot ID / Tên nhân vật *</label>
                <input
                  type="text"
                  value={ingameId}
                  onChange={(e) => setIngameId(e.target.value)}
                  placeholder="VD: Faker#KR1 / Tên kiện tướng"
                  required
                />
              </div>

              {isTeam && (
                <>
                  <div className="mrm-form-group">
                    <label>Tên Đội Tuyển *</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="VD: DUT Warriors"
                      required
                    />
                  </div>

                  <div className="mrm-form-group">
                    <label>Link Ảnh Đại Diện Đội (Logo URL)</label>
                    <input
                      type="url"
                      value={teamAvatarUrl}
                      onChange={(e) => setTeamAvatarUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}

              <div className="mrm-edit-actions">
                <button
                  type="button"
                  className="mrm-btn-secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Hủy Chỉnh Sửa
                </button>
                <button type="submit" className="mrm-btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : '💾 Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mrm-details-grid">
              {/* Box 1: Thông tin cá nhân / Đội trưởng */}
              <div className="mrm-detail-box">
                <h4 className="mrm-box-title">👤 Thông Tin Thí Sinh</h4>
                <div className="mrm-row">
                  <span className="mrm-label">Ingame ID (IGN):</span>
                  <span className="mrm-value mrm-highlight">{registration.ingame_id || 'Chưa cập nhật'}</span>
                </div>
                <div className="mrm-row">
                  <span className="mrm-label">Hình thức:</span>
                  <span className="mrm-value">{isTeam ? '👥 Game Đồng Đội' : '👤 Đấu Cá Nhân (Solo)'}</span>
                </div>
                <div className="mrm-row">
                  <span className="mrm-label">Ngày nộp đơn:</span>
                  <span className="mrm-value">{formatDate(registration.registered_at)}</span>
                </div>
                {tournament.location && (
                  <div className="mrm-row">
                    <span className="mrm-label">Địa điểm thi đấu:</span>
                    <span className="mrm-value">📍 {tournament.location}</span>
                  </div>
                )}
              </div>

              {/* Box 2: Thông tin Đội (nếu là giải đồng đội) */}
              {isTeam && (
                <div className="mrm-detail-box">
                  <h4 className="mrm-box-title">🛡️ Thông Tin Đội Tuyển</h4>
                  <div className="mrm-row">
                    <span className="mrm-label">Tên đội:</span>
                    <span className="mrm-value mrm-team-name">{registration.team_name || 'Chưa đặt tên'}</span>
                  </div>
                  {registration.team_avatar_url && (
                    <div className="mrm-row">
                      <span className="mrm-label">Logo đội:</span>
                      <img src={registration.team_avatar_url} alt="Logo" className="mrm-team-avatar" />
                    </div>
                  )}
                  {registration.members && registration.members.length > 0 && (
                    <div className="mrm-members-block">
                      <span className="mrm-label">Danh sách thành viên ({registration.members.length} người):</span>
                      <div className="mrm-members-list">
                        {registration.members.map((m) => (
                          <div key={m.participant_id} className="mrm-member-chip">
                            <span className="mrm-member-role">{m.is_captain ? '👑 Đội trưởng' : m.role_in_team || 'Thành viên'}</span>
                            <span className="mrm-member-name">{m.full_name} ({m.ingame_id || 'N/A'})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Box 3: Câu trả lời form động (nếu có) */}
              {Object.keys(dynamicData).length > 0 && (
                <div className="mrm-detail-box full-width">
                  <h4 className="mrm-box-title">📋 Thông Tin Bổ Sung</h4>
                  <div className="mrm-dynamic-grid">
                    {Object.entries(dynamicData).map(([key, val]) => (
                      <div key={key} className="mrm-dynamic-item">
                        <span className="mrm-dynamic-key">{key}:</span>
                        <span className="mrm-dynamic-val">{String(val || '—')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Actions based on Stage */}
        <div className="mrm-footer">
          <div className="mrm-footer-left">
            {stageInfo.stage === 'GD1' && (
              <button
                type="button"
                className="mrm-btn-danger"
                onClick={handleCancelRegistration}
                disabled={cancelling || isEditing}
              >
                {cancelling ? '⏳ Đang hủy...' : '❌ Hủy Đăng Ký'}
              </button>
            )}

            {stageInfo.stage === 'GD2' && !isEditing && (
              <button
                type="button"
                className="mrm-btn-edit"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Cập Nhật Thông Tin (GD2)
              </button>
            )}

            {stageInfo.stage === 'GD3' && (
              <span className="mrm-locked-notice">
                🔒 Thông tin đăng ký đã khóa để thi đấu
              </span>
            )}
          </div>

          <div className="mrm-footer-right">
            {stageInfo.canViewBrackets && (
              <button
                type="button"
                className="mrm-btn-bracket"
                onClick={() => {
                  onClose();
                  router.push(`/tournament/${tournament.id}`);
                }}
              >
                ⚡ Xem Nhánh Đấu & Lịch Trận
              </button>
            )}

            {stageInfo.canExportCert && registration.status === 'approved' && (
              <button
                type="button"
                className="mrm-btn-cert"
                onClick={() => {
                  alert('🎖️ Giấy chứng nhận tham gia giải đấu đang được chuẩn bị phát hành!');
                }}
              >
                🎖️ Xuất Giấy Chứng Nhận
              </button>
            )}

            <button type="button" className="mrm-btn-close-modal" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
