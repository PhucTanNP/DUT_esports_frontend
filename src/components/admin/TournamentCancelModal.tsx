'use client';

import React from 'react';
import type { Tournament } from '../../types';

interface TournamentCancelModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  isCancelling: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function TournamentCancelModal({
  tournament,
  isOpen,
  isCancelling,
  onConfirm,
  onClose,
}: TournamentCancelModalProps) {
  if (!isOpen || !tournament) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-content tournament-cancel-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '92%' }}
      >
        <div className="modal-header">
          <div className="modal-title-danger">
            <span className="danger-icon">⚠️</span>
            <h3>Xác Nhận Hủy Giải Đấu</h3>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isCancelling}>✕</button>
        </div>

        <div className="modal-body tournament-cancel-body">
          <div className="cancel-warning-banner">
            <p>
              Bạn có chắc chắn muốn hủy giải đấu này? Hành động này sẽ chuyển trạng thái giải sang{' '}
              <strong>ĐÃ HỦY (Cancelled)</strong> và không thể tự động khôi phục.
            </p>
          </div>

          <div className="cancel-target-preview">
            {tournament.banner_url ? (
              <img
                src={tournament.banner_url}
                alt={tournament.name}
                className="cancel-preview-banner"
                onError={(e) => ((e.currentTarget as HTMLElement).style.display = 'none')}
              />
            ) : (
              <div className="cancel-preview-banner-placeholder">🎮 {tournament.game_name}</div>
            )}
            <div className="cancel-preview-info">
              <h4 className="cancel-target-title">{tournament.name}</h4>
              <div className="cancel-target-meta">
                <span className="code-chip">{tournament.code}</span>
                <span className="game-chip">{tournament.game_name}</span>
                <span className="slots-chip">
                  {tournament.max_participants}{' '}
                  {tournament.participation_type === 'team' ? 'đội' : 'người'}
                </span>
              </div>
            </div>
          </div>

          <div className="cancel-policy-note">
            ℹ️ Sau khi giải đấu kết thúc (sau ngày kết thúc giải), thao tác hủy sẽ tự động bị vô hiệu hóa hoàn toàn theo điều lệ.
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isCancelling}
          >
            Quay Lại
          </button>
          <button
            type="button"
            className="btn-danger-confirm"
            onClick={() => void onConfirm()}
            disabled={isCancelling}
          >
            {isCancelling ? '⏳ Đang hủy...' : '🚫 Xác Nhận Hủy Giải'}
          </button>
        </div>
      </div>
    </div>
  );
}
