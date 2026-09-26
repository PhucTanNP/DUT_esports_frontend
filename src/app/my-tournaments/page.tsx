'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import MyRegistrationModal from '../../components/MyRegistrationModal';
import CheckinScannerModal from '../../components/CheckinScannerModal';
import { registrationAPI } from '../../services/registration.service';
import { participantAPI, type ParticipantRow } from '../../services/participant.service';
import type { Registration, Tournament } from '../../types';
import { getTournamentStage } from '../../utils/tournamentStage';
import { formatDate } from '../../utils/format';
import '../../styles/MyTournaments.css';

export default function MyTournamentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<ParticipantRow | null>(null);
  const [participations, setParticipations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [selectedTour, setSelectedTour] = useState<Tournament | null>(null);
  const [checkinReg, setCheckinReg] = useState<Registration | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify student login
      const profileRes = await participantAPI.getMyProfile();
      if (!profileRes.success || !profileRes.data) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      setCurrentUser(profileRes.data);

      // Load registered tournaments
      const regRes = await registrationAPI.getMyParticipations();
      if (regRes.success && regRes.data) {
        setParticipations(regRes.data);
      } else {
        setError(regRes.message || 'Không thể tải danh sách giải đấu đã đăng ký');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelRegistration = async (regId: string) => {
    if (!confirm('⚠️ Bạn có chắc chắn muốn HỦY đơn đăng ký giải này? Thao tác này không thể hoàn tác!')) {
      return;
    }

    try {
      const res = await registrationAPI.cancel(regId);
      if (res.success) {
        alert('✅ Đã hủy đơn đăng ký thành công!');
        await loadData();
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể hủy đơn'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    }
  };

  const handleOpenDetail = (reg: Registration) => {
    const pseudoTournament: Tournament = {
      id: reg.tournament_id,
      code: '',
      name: reg.tournament_name || 'Giải Đấu',
      game_name: reg.game_name || '',
      game_logo_url: null,
      banner_url: (reg as any).banner_url || '',
      participation_type: (reg as any).participation_type || 'individual',
      max_participants: 64,
      min_team_size: null,
      max_team_size: null,
      prize_pool: 0,
      registration_open_at: (reg as any).registration_open_at || new Date().toISOString(),
      registration_close_at: (reg as any).registration_close_at || new Date().toISOString(),
      start_at: (reg as any).start_at || new Date().toISOString(),
      end_at: (reg as any).end_at || new Date().toISOString(),
      checkin_open_at: (reg as any).checkin_open_at || null,
      checkin_close_at: (reg as any).checkin_close_at || null,
      description: null,
      location: (reg as any).location || null,
      use_external_link: false,
      external_registration_url: null,
      form_schema: null,
      created_by: null,
      approved_by: null,
      status: ((reg as any).tournament_status as any) || 'approved',
      created_at: '',
      approved_at: null,
      updated_at: '',
    };

    setSelectedReg(reg);
    setSelectedTour(pseudoTournament);
  };

  return (
    <div className="my-tournaments-page">
      <Header />

      <main className="my-tournaments-container">
        {/* Page Title & Breadcrumb */}
        <div className="my-tournaments-header">
          <div>
            <div className="mt-breadcrumb">
              <Link href="/">Trang chủ</Link>
              <span>/</span>
              <span className="current">Các giải đấu đã đăng ký</span>
            </div>
            <h1 className="mt-title">🏆 CÁC GIẢI ĐẤU ĐÃ ĐĂNG KÝ</h1>
            <p className="mt-subtitle">
              Quản lý danh sách các giải đấu bạn đang tham gia, kiểm tra trạng thái phê duyệt và cập nhật thông tin trước giờ thi đấu.
            </p>
          </div>

          {currentUser && (
            <div className="mt-student-pill">
              <span className="mt-pill-avatar">{currentUser.full_name?.charAt(0).toUpperCase() || 'S'}</span>
              <div className="mt-pill-text">
                <span className="mt-pill-name">{currentUser.full_name}</span>
                <span className="mt-pill-id">{currentUser.student_id || currentUser.username || 'Thành viên'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Status / Error Alerts */}
        {error && <div className="mt-alert-error">⚠️ {error}</div>}

        {/* Content Section */}
        {loading ? (
          <div className="mt-loading">
            <div className="mt-spinner" />
            <p>⏳ Đang tải danh sách giải đấu đã đăng ký...</p>
          </div>
        ) : !currentUser ? (
          <div className="mt-empty-card">
            <span className="mt-empty-icon">🔐</span>
            <h3>Bạn chưa đăng nhập tài khoản sinh viên</h3>
            <p>Vui lòng đăng nhập để xem các giải đấu bạn đã đăng ký tham gia.</p>
            <Link href="/" className="mt-btn-primary">
              Về Trang Chủ Đăng Nhập
            </Link>
          </div>
        ) : participations.length === 0 ? (
          <div className="mt-empty-card">
            <span className="mt-empty-icon">📭</span>
            <h3>Bạn chưa đăng ký tham gia giải đấu nào</h3>
            <p>Khám phá các giải đấu thể thao điện tử đang mở đăng ký tại DUT Esports để tranh tài cùng các bạn sinh viên!</p>
            <Link href="/" className="mt-btn-primary">
              🎮 Khám Phá Các Giải Đấu Ngay
            </Link>
          </div>
        ) : (
          <div className="mt-list">
            {participations.map((reg) => {
              const pseudoTour: any = {
                status: (reg as any).tournament_status || 'approved',
                registration_open_at: (reg as any).registration_open_at || new Date().toISOString(),
                registration_close_at: (reg as any).registration_close_at || new Date().toISOString(),
                start_at: (reg as any).start_at || new Date().toISOString(),
                end_at: (reg as any).end_at || new Date().toISOString(),
                checkin_open_at: (reg as any).checkin_open_at,
              };
              const stageInfo = getTournamentStage(pseudoTour);
              const isTeam = (reg as any).participation_type === 'team' || (reg as any).participationType === 'team';

              return (
                <div key={reg.id} className="mt-card">
                  {/* Left: Tournament Banner / Image */}
                  <div className="mt-card-image">
                    <img
                      src={(reg as any).banner_url || 'https://via.placeholder.com/400x225/0b0f19/FF6B00?text=DUT+ESPORTS'}
                      alt={reg.tournament_name || 'Giải đấu'}
                    />
                    <span className={`mt-stage-badge ${stageInfo.badgeClass}`}>
                      {stageInfo.badgeText}
                    </span>
                  </div>

                  {/* Center: Details */}
                  <div className="mt-card-body">
                    <div className="mt-card-top">
                      <h2 className="mt-card-title">
                        {reg.tournament_name || 'Giải đấu DUT Esports'}
                      </h2>
                      <span className="mt-card-game">🎮 {reg.game_name}</span>
                    </div>

                    {/* Status Pill: Đã check-in / Chưa check-in */}
                    {(reg as any).checkin_status === 'approved' ? (
                      <div className="mt-status-badge status-approved">
                        🟢 ĐÃ CHECK-IN (SẴN SÀNG THI ĐẤU)
                      </div>
                    ) : reg.status === 'rejected' ? (
                      <div className="mt-status-badge status-rejected">
                        🔴 BỊ TỪ CHỐI{reg.rejection_reason ? `: ${reg.rejection_reason}` : ''}
                      </div>
                    ) : reg.status === 'cancelled' ? (
                      <div className="mt-status-badge status-cancelled">
                        🚫 ĐÃ HỦY ĐĂNG KÝ
                      </div>
                    ) : (
                      <div className="mt-status-badge status-not-checked-in">
                        🟡 CHƯA CHECK-IN
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="mt-meta-grid">
                      <div className="mt-meta-item">
                        <span className="mt-meta-label">Ingame ID (IGN):</span>
                        <strong className="mt-meta-value highlight">{reg.ingame_id || 'Chưa cập nhật'}</strong>
                      </div>

                      <div className="mt-meta-item">
                        <span className="mt-meta-label">Thể thức:</span>
                        <span className="mt-meta-value">{isTeam ? '👥 Game Đồng Đội' : '👤 Cá Nhân (Solo)'}</span>
                      </div>

                      {isTeam && reg.team_name && (
                        <div className="mt-meta-item">
                          <span className="mt-meta-label">Tên đội:</span>
                          <strong className="mt-meta-value team">{reg.team_name}</strong>
                        </div>
                      )}

                      <div className="mt-meta-item">
                        <span className="mt-meta-label">Ngày nộp đơn:</span>
                        <span className="mt-meta-value">{formatDate(reg.registered_at)}</span>
                      </div>

                      {(reg as any).location && (
                        <div className="mt-meta-item">
                          <span className="mt-meta-label">Địa điểm:</span>
                          <span className="mt-meta-value">📍 {(reg as any).location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="mt-card-actions">
                    {/* Nút Check-in bằng Camera thiết bị */}
                    {(reg as any).checkin_status !== 'approved' && reg.status !== 'cancelled' && reg.status !== 'rejected' && (
                      <button
                        type="button"
                        className="mt-btn-checkin"
                        onClick={() => setCheckinReg(reg)}
                        title="Bấm để mở Camera thiết bị quét mã QR điểm danh"
                      >
                        📸 Check-in Ngay
                      </button>
                    )}

                    <button
                      type="button"
                      className="mt-btn-view"
                      onClick={() => handleOpenDetail(reg)}
                    >
                      📋 Xem & Cập Nhật Đơn
                    </button>

                    {isTeam && (
                      <button
                        type="button"
                        className="mt-btn-team-info"
                        onClick={() => router.push(`/tournament/${reg.tournament_id}?tab=my-team`)}
                        title="Xem chi tiết danh sách thành viên và quản lý tuyển quân đội tuyển"
                      >
                        🛡️ Xem Thông Tin Đội
                      </button>
                    )}

                    {stageInfo.stage === 'GD1' && (
                      <button
                        type="button"
                        className="mt-btn-cancel"
                        onClick={() => handleCancelRegistration(reg.id)}
                      >
                        ✕ Hủy Đăng Ký
                      </button>
                    )}

                    {stageInfo.canViewBrackets && (
                      <button
                        type="button"
                        className="mt-btn-bracket"
                        onClick={() => router.push(`/tournament/${reg.tournament_id}`)}
                      >
                        ⚡ Xem Lịch Đấu & Nhánh
                      </button>
                    )}

                    {stageInfo.canExportCert && reg.status === 'approved' && (
                      <button
                        type="button"
                        className="mt-btn-cert"
                        onClick={() => alert('🎖️ Giấy chứng nhận tham gia đang được cấp phát!')}
                      >
                        🎖️ Tải Chứng Nhận
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      {/* Modal Xem & Cập Nhật Đơn Đăng Ký */}
      {selectedReg && selectedTour && (
        <MyRegistrationModal
          registration={selectedReg}
          tournament={selectedTour}
          onClose={() => {
            setSelectedReg(null);
            setSelectedTour(null);
          }}
          onUpdated={async () => {
            await loadData();
          }}
        />
      )}

      {/* Modal Quét Camera Check-in */}
      {checkinReg && (
        <CheckinScannerModal
          registration={checkinReg}
          tournamentName={checkinReg.tournament_name || 'Giải đấu DUT Esports'}
          onClose={() => setCheckinReg(null)}
          onSuccess={async () => {
            await loadData();
          }}
        />
      )}
    </div>
  );
}
