'use client';

import React from 'react';
import type { Tournament } from '../../types';
import { getTournamentStage } from '../../utils/tournamentStage';

interface TournamentDetailModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onManageOrganizers?: (tournament: Tournament) => void;
  onManageRegistrations?: (tournament: Tournament) => void;
}

export default function TournamentDetailModal({
  tournament,
  isOpen,
  onClose,
  onManageOrganizers,
  onManageRegistrations,
}: TournamentDetailModalProps) {
  if (!isOpen || !tournament) return null;

  const stageInfo = getTournamentStage(tournament);
  const isEnded = Boolean(tournament.end_at && new Date() >= new Date(tournament.end_at));

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa thiết lập';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return 'Chưa công bố';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-content tournament-detail-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '840px', width: '95%' }}
      >
        <div className="modal-header">
          <div className="modal-title-with-badge">
            <h3>🔍 Chi Tiết Giải Đấu</h3>
            <span
              className="stage-chip"
              style={{
                backgroundColor: stageInfo.badgeColor + '25',
                color: stageInfo.badgeColor,
                border: `1px solid ${stageInfo.badgeColor}`,
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {stageInfo.badgeText}
            </span>
          </div>
          <button className="close-btn" onClick={onClose} title="Đóng">✕</button>
        </div>

        <div className="modal-body tournament-detail-body">
          {/* Banner Hero Showcase */}
          <div className="detail-banner-container">
            {tournament.banner_url ? (
              <img
                src={tournament.banner_url}
                alt={tournament.name}
                className="detail-banner-img"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.detail-banner-fallback');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="detail-banner-fallback"
              style={{ display: tournament.banner_url ? 'none' : 'flex' }}
            >
              <div className="fallback-game-badge">🎮 {tournament.game_name}</div>
              <h4>{tournament.name}</h4>
              <p>Mã giải: {tournament.code}</p>
            </div>
            <div className="detail-banner-overlay">
              <span className="banner-game-tag">🎮 {tournament.game_name}</span>
              <span className="banner-code-tag">{tournament.code}</span>
            </div>
          </div>

          {/* Heading */}
          <div className="detail-title-section">
            <h2 className="detail-tournament-name">{tournament.name}</h2>
            {isEnded && (
              <div className="detail-ended-notice">
                🏁 Giải đấu này đã kết thúc thời gian thi đấu ({formatDateTime(tournament.end_at)})
              </div>
            )}
            {tournament.status === 'cancelled' && (
              <div className="detail-cancelled-notice">
                ❌ Giải đấu này đã bị hủy bỏ
              </div>
            )}
          </div>

          {/* Key Info Grid */}
          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-card-icon">👥</span>
              <div className="detail-card-content">
                <label>Hình Thức Tham Gia</label>
                <strong>
                  {tournament.participation_type === 'team'
                    ? `Thi Đấu Đội (${tournament.min_team_size || 1} - ${tournament.max_team_size || 5} thành viên)`
                    : 'Thi Đấu Cá Nhân'}
                </strong>
              </div>
            </div>

            <div className="detail-card">
              <span className="detail-card-icon">🎯</span>
              <div className="detail-card-content">
                <label>Quy Mô Tối Đa</label>
                <strong>
                  {tournament.max_participants}{' '}
                  {tournament.participation_type === 'team' ? 'đội' : 'thí sinh'}
                </strong>
              </div>
            </div>

            <div className="detail-card">
              <span className="detail-card-icon">📍</span>
              <div className="detail-card-content">
                <label>Địa Điểm Thi Đấu</label>
                <strong>{tournament.location || 'Online / Discord DUT'}</strong>
              </div>
            </div>

            <div className="detail-card">
              <span className="detail-card-icon">🏆</span>
              <div className="detail-card-content">
                <label>Tổng Giải Thưởng</label>
                <strong className="prize-highlight">{formatCurrency(tournament.prize_pool)}</strong>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="detail-timeline-box">
            <h4>📅 Lịch Trình Giải Đấu</h4>
            <div className="timeline-items-grid">
              <div className="timeline-item">
                <span className="timeline-dot green" />
                <div>
                  <div className="timeline-label">Mở đăng ký</div>
                  <div className="timeline-val">{formatDateTime(tournament.registration_open_at)}</div>
                </div>
              </div>
              <div className="timeline-item">
                <span className="timeline-dot orange" />
                <div>
                  <div className="timeline-label">Đóng đăng ký</div>
                  <div className="timeline-val">{formatDateTime(tournament.registration_close_at)}</div>
                </div>
              </div>
              <div className="timeline-item">
                <span className="timeline-dot blue" />
                <div>
                  <div className="timeline-label">Bắt đầu thi đấu</div>
                  <div className="timeline-val">{formatDateTime(tournament.start_at)}</div>
                </div>
              </div>
              <div className={`timeline-item ${isEnded ? 'is-ended' : ''}`}>
                <span className={`timeline-dot ${isEnded ? 'gray' : 'purple'}`} />
                <div>
                  <div className="timeline-label">Kết thúc giải</div>
                  <div className="timeline-val">{formatDateTime(tournament.end_at)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {tournament.description && (
            <div className="detail-description-box">
              <h4>📝 Mô Tả & Điều Lệ</h4>
              <p className="detail-description-text">{tournament.description}</p>
            </div>
          )}

          {/* External Registration Link */}
          {tournament.use_external_link && tournament.external_registration_url && (
            <div className="detail-external-box">
              <h4>🔗 Link Đăng Ký Ngoài</h4>
              <a
                href={tournament.external_registration_url}
                target="_blank"
                rel="noreferrer"
                className="external-link-btn"
              >
                {tournament.external_registration_url} ↗
              </a>
            </div>
          )}

          {/* Quick Admin Actions */}
          <div className="detail-quick-actions">
            <h4>⚡ Lối Tắt Quản Trị</h4>
            <div className="action-buttons-wrap">
              {onManageOrganizers && (
                <button
                  type="button"
                  className="btn-action-detail btn-action-org"
                  onClick={() => {
                    onClose();
                    onManageOrganizers(tournament);
                  }}
                >
                  🛡️ Quản Lý Ban Tổ Chức
                </button>
              )}
              {onManageRegistrations && (
                <button
                  type="button"
                  className="btn-action-detail btn-action-reg"
                  onClick={() => {
                    onClose();
                    onManageRegistrations(tournament);
                  }}
                >
                  👥 Danh Sách Đăng Ký & Điểm Danh
                </button>
              )}
              <a
                href={`/tournament/${tournament.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn-action-detail btn-action-public"
              >
                🌐 Xem Trang Public ↗
              </a>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
