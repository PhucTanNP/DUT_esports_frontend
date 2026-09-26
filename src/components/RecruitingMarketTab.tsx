'use client';

import React, { useEffect, useState } from 'react';
import { registrationAPI } from '../services/registration.service';
import type { RecruitingTeamInfo, SafeUser, Tournament } from '../types';
import '../styles/RecruitingMarketTab.css';

interface Props {
  tournament: Tournament;
  currentUser: SafeUser | null;
  onJoinSuccess?: () => void;
}

export default function RecruitingMarketTab({ tournament, currentUser, onJoinSuccess }: Props) {
  const [teams, setTeams] = useState<RecruitingTeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedTeam, setSelectedTeam] = useState<RecruitingTeamInfo | null>(null);
  const [ingameId, setIngameId] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await registrationAPI.getRecruitingTeams(tournament.id);
        if (isMounted) {
          if (res.success && res.data) {
            setTeams(res.data);
          } else {
            setError(res.message || 'Không thể tải danh sách đội tuyển quân');
          }
        }
      } catch (err) {
        if (isMounted) setError('Lỗi kết nối: ' + (err as Error).message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [tournament.id]);

  const handleOpenJoinModal = (team: RecruitingTeamInfo) => {
    if (!currentUser) {
      alert('⚠️ Bạn cần đăng nhập tài khoản sinh viên để xin gia nhập đội!');
      return;
    }
    if (currentUser.status !== 'approved') {
      alert('⚠️ Tài khoản của bạn chưa được duyệt KYC. Vui lòng chờ Admin phê duyệt tài khoản trước khi tham gia thi đấu!');
      return;
    }

    setSelectedTeam(team);
    setIngameId('');
    setMessage('');
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    if (!ingameId.trim()) {
      setSubmitError('Vui lòng nhập Ingame ID của bạn trong game');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const res = await registrationAPI.createJoinRequest(selectedTeam.id, {
        ingame_id: ingameId.trim(),
        message: message.trim() || undefined,
      });

      if (res.success) {
        setSubmitSuccess('Đã gửi yêu cầu gia nhập đội thành công! Đội trưởng sẽ xem xét hồ sơ của bạn.');
        setTimeout(() => {
          setSelectedTeam(null);
          onJoinSuccess?.();
        }, 1800);
      } else {
        setSubmitError(res.message || 'Không thể gửi yêu cầu');
      }
    } catch (err) {
      setSubmitError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rm-container">
      {/* Banner Intro */}
      <div className="rm-banner">
        <div className="rm-banner-title">
          <h3>
            <span>📢</span> Chợ Tuyển Quân / Tìm Đồng Đội ({teams.length} đội đang mở tuyển)
          </h3>
          <p>
            Dành cho thí sinh tự do muốn tìm team hoặc các đội đang thiếu thành viên cần tuyển thêm slot thi đấu.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="rm-empty-state">⏳ Đang tải danh sách đội tuyển quân...</div>
      ) : teams.length === 0 ? (
        <div className="rm-empty-state">
          <div style={{ fontSize: '2.5rem' }}>🛡️</div>
          <h4>Hiện chưa có đội nào đang mở tuyển quân</h4>
          <p>Nếu bạn là đội trưởng và thiếu người, hãy tạo đội và bật cờ &quot;Tuyển quân&quot; để hiển thị tại đây!</p>
        </div>
      ) : (
        <div className="rm-grid">
          {teams.map((team) => (
            <div key={team.id} className="rm-card">
              <div className="rm-card-header">
                <div className="rm-team-identity">
                  <div className="rm-team-avatar">
                    {team.team_avatar_url ? (
                      <img src={team.team_avatar_url} alt={team.team_name || 'Team'} />
                    ) : (
                      team.team_name?.charAt(0).toUpperCase() || 'T'
                    )}
                  </div>
                  <div>
                    <h4 className="rm-team-name">{team.team_name || 'Đội chưa đặt tên'}</h4>
                    <div className="rm-captain-name">
                      👑 Đội trưởng: <strong>{team.captain_name}</strong> (MSSV: {team.captain_student_id || 'N/A'})
                    </div>
                  </div>
                </div>
                <div className="rm-slot-badge">
                  {team.current_member_count}/{team.max_team_size} TV
                </div>
              </div>

              {/* Recruitment Notes */}
              {team.recruitment_notes ? (
                <div className="rm-notes-box">
                  <div className="rm-notes-label">Vị trí cần tìm:</div>
                  <p className="rm-notes-text">&quot;{team.recruitment_notes}&quot;</p>
                </div>
              ) : (
                <div className="rm-notes-box" style={{ borderLeftColor: '#3b82f6' }}>
                  <div className="rm-notes-label" style={{ color: '#3b82f6' }}>Tuyển quân tự do:</div>
                  <p className="rm-notes-text">Đội đang thiếu thành viên, tuyển tất cả các vị trí.</p>
                </div>
              )}

              {/* Members List */}
              <div className="rm-members-box">
                <div className="rm-members-title">Đội hình hiện tại:</div>
                <div className="rm-members-chips">
                  {team.members?.map((m) => (
                    <span
                      key={m.participant_id}
                      className={`rm-member-chip ${m.is_captain ? 'captain' : ''}`}
                    >
                      {m.is_captain ? '👑' : '👤'} {m.full_name} {m.role_in_team ? `(${m.role_in_team})` : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action */}
              <button
                className="rm-btn-join"
                onClick={() => handleOpenJoinModal(team)}
              >
                <span>⚔️</span> Xin Vào Đội Này
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nộp Đơn Xin Vào Đội */}
      {selectedTeam && (
        <div className="to-modal-overlay" onClick={() => setSelectedTeam(null)}>
          <div className="to-modal" onClick={(e) => e.stopPropagation()}>
            <div className="to-modal-header">
              <h4>⚔️ Nộp Đơn Xin Vào Đội: {selectedTeam.team_name}</h4>
              <button className="to-modal-close" onClick={() => setSelectedTeam(null)}>✕</button>
            </div>
            <form onSubmit={handleJoinSubmit} className="to-modal-body">
              <div style={{ background: 'rgba(255, 107, 0, 0.08)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #ff6b00' }}>
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>
                  Đội trưởng: {selectedTeam.captain_name}
                </div>
                {selectedTeam.recruitment_notes && (
                  <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '4px' }}>
                    Yêu cầu tuyển: {selectedTeam.recruitment_notes}
                  </div>
                )}
              </div>

              <div className="to-form-group">
                <label>Ingame ID của bạn (Tên nhân vật / Riot ID / Kiện tướng) *:</label>
                <input
                  type="text"
                  className="to-input"
                  placeholder="VD: Faker#KR1 hoặc BoyOneChamp"
                  value={ingameId}
                  onChange={(e) => setIngameId(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="to-form-group">
                <label>Vị trí sở trường, Mức Rank & Lời nhắn gửi đội trưởng:</label>
                <textarea
                  className="to-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="VD: Mình chuyên Mid/Rừng, rank Tinh Anh 1, từng có kinh nghiệm đánh giải khoa..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {submitError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                  ⚠️ {submitError}
                </div>
              )}

              {submitSuccess && (
                <div style={{ color: '#10b981', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                  ✅ {submitSuccess}
                </div>
              )}

              <div className="to-modal-footer">
                <button type="button" className="to-btn-cancel" onClick={() => setSelectedTeam(null)}>
                  Hủy
                </button>
                <button type="submit" className="to-btn-save" disabled={isSubmitting || !!submitSuccess}>
                  {isSubmitting ? '⏳ Đang gửi...' : '🚀 Gửi Yêu Cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
