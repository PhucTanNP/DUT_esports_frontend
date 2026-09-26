'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, extractUserFromResponse } from '../../services/auth.service';
import { registrationAPI } from '../../services/registration.service';
import { tournamentAPI } from '../../services/tournament.service';
import type {
  SafeUser,
  Tournament,
  TournamentParticipantListResponseDTO,
  TournamentTeamDTO,
} from '../../types';
import { checkinAPI, type CheckinResult } from '../../services/checkin.service';
import LeafletCheckinMap, { type CheckinMapPoint } from '../LeafletCheckinMap';
import { createQRCodeDataURL } from '../../utils/qrCode';
import '../../styles/admin/TournamentDetailView.css';

type TabKey = 'info' | 'teams' | 'qr' | 'bracket';

interface Props {
  tournamentId: string;
  onBack?: () => void;
}

export default function TournamentDetailView({ tournamentId, onBack }: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/admin');
    }
  };

  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participantsData, setParticipantsData] = useState<TournamentParticipantListResponseDTO | null>(null);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc danh sách đội
  const [checkinFilter, setCheckinFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // Tab QR: Mode, Countdown & Test Mode
  const [qrMode, setQrMode] = useState<'official' | 'test'>('official');
  const [now, setNow] = useState<number>(() => Date.now());
  const [adminPreviewQR, setAdminPreviewQR] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [testQrTimestamp, setTestQrTimestamp] = useState<string>(() => new Date().toISOString());
  const [testScanModalOpen, setTestScanModalOpen] = useState(false);
  const [customQrOrigin, setCustomQrOrigin] = useState<string>('');
  const [copyTestSuccess, setCopyTestSuccess] = useState(false);
  const [checkinsList, setCheckinsList] = useState<CheckinResult[]>([]);
  const [refreshingMap, setRefreshingMap] = useState(false);

  // Tải dữ liệu giải đấu, danh sách đội và thông tin người dùng
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const [tourRes, partRes, userRes, checkinsRes] = await Promise.all([
          tournamentAPI.getById(tournamentId),
          registrationAPI.getTournamentParticipants(tournamentId),
          authAPI.getCurrentUser().catch(() => ({ success: false, data: null })),
          checkinAPI.listByTournament(tournamentId).catch(() => ({ success: false, data: [] })),
        ]);

        if (!isMounted) return;

        if (tourRes.success && tourRes.data) {
          setTournament(tourRes.data);
        } else {
          setError(tourRes.message || 'Không tìm thấy thông tin giải đấu');
        }

        if (partRes.success && partRes.data) {
          setParticipantsData(partRes.data);
        }

        if (userRes.success) {
          const userObj = extractUserFromResponse(userRes) ?? (userRes.data as SafeUser | null);
          if (userObj) setCurrentUser(userObj);
        }

        if (checkinsRes.success && checkinsRes.data) {
          setCheckinsList(checkinsRes.data);
        }
      } catch (err) {
        if (isMounted) setError('Lỗi khi tải dữ liệu: ' + (err as Error).message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  const handleRefreshCheckins = async () => {
    try {
      setRefreshingMap(true);
      const res = await checkinAPI.listByTournament(tournamentId);
      if (res.success && res.data) {
        setCheckinsList(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi làm mới bản đồ check-in:', err);
    } finally {
      setRefreshingMap(false);
    }
  };

  // Cập nhật đồng hồ đếm ngược mỗi giây
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format ngày giờ Việt Nam
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa thiết lập';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa thiết lập';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const dd = String(d.getDate()).padStart(2, '0');
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${MM}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  // Tính thời điểm 0:00 ngày tổ chức giải đấu
  const tournamentStartAt = tournament?.start_at;
  const { isQrUnlocked, countdown } = useMemo(() => {
    if (!tournamentStartAt) {
      return { isQrUnlocked: false, countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 } };
    }

    const startDate = new Date(tournamentStartAt);
    // 00:00:00 của ngày tổ chức giải đấu
    const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);

    const diffMs = dayStart.getTime() - now;

    // Đã qua hoặc đang là ngày tổ chức giải -> Mở khóa QR
    if (diffMs <= 0) {
      return { isQrUnlocked: true, countdown: { days: 0, hours: 0, minutes: 0, seconds: 0 } };
    }

    // Chưa đến ngày tổ chức -> Đếm ngược
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    return { isQrUnlocked: false, countdown: { days, hours, minutes, seconds } };
  }, [tournamentStartAt, now]);

  // Sinh mã QR điểm danh giải đấu (Mã hóa đường dẫn URL để quét bằng Camera điện thoại thường / Zalo)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const effectiveOrigin = customQrOrigin || currentOrigin;

  const officialQrData = useMemo(() => {
    if (!tournament) return { dataUrl: '', checkinUrl: '', checkinCode: '' };

    const checkinUrl = `${effectiveOrigin}/tournament/${tournament.id}?action=checkin`;
    const checkinCode = `DUT-CHECKIN-${tournament.code}`;
    const dataUrl = createQRCodeDataURL(checkinUrl, 240);

    return { dataUrl, checkinUrl, checkinCode };
  }, [tournament, effectiveOrigin]);

  // Chuyển danh sách check-in thành các điểm hiển thị trên bản đồ Leaflet
  const checkinMapPoints: CheckinMapPoint[] = useMemo(() => {
    return checkinsList
      .filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude))
      .map((c) => {
        let devId = 'DUT-DEV-RECORDED';
        if (c.device_info) {
          try {
            const parsed = JSON.parse(c.device_info);
            devId = parsed.deviceId || devId;
          } catch {
            const match = c.device_info.match(/DUT-DEV-[A-Z0-9-]+/);
            if (match) devId = match[0];
          }
        }
        return {
          id: c.id,
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
          accuracy: c.location_accuracy ? Number(c.location_accuracy) : 30,
          participantName: c.full_name || 'VĐV',
          studentId: c.student_id || undefined,
          ingameId: c.ingame_id || undefined,
          deviceId: devId,
          checkedInAt: c.checked_in_at,
          isCurrentUser: false,
        };
      });
  }, [checkinsList]);

  // Thống kê Tab 2 (Danh sách đội)
  const teams: TournamentTeamDTO[] = useMemo(() => {
    return participantsData?.teams || [];
  }, [participantsData]);

  const summaryStats = useMemo(() => {
    const totalTeams = teams.length;
    // Đội đã check-in nếu có ít nhất 1 thành viên đã check-in
    const checkedInTeams = teams.filter((t) => (t.checkedInCount || 0) > 0).length;
    const totalMembers = teams.reduce((acc, t) => acc + (t.totalMembers || t.members?.length || 0), 0);
    const checkedInMembers = teams.reduce((acc, t) => acc + (t.checkedInCount || 0), 0);

    return { totalTeams, checkedInTeams, totalMembers, checkedInMembers };
  }, [teams]);

  // Lọc và tìm kiếm đội
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const isCheckedIn = (t.checkedInCount || 0) > 0;
      if (checkinFilter === 'checked_in' && !isCheckedIn) return false;
      if (checkinFilter === 'not_checked_in' && isCheckedIn) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = t.teamName.toLowerCase().includes(query);
        const matchCaptain = t.captainName.toLowerCase().includes(query);
        const leaderMember = t.members?.find((m) => m.isCaptain);
        const matchPhone = leaderMember?.phoneNumber?.toLowerCase().includes(query) ?? false;
        return matchName || matchCaptain || matchPhone;
      }
      return true;
    });
  }, [teams, checkinFilter, searchQuery]);

  // Xuất file Excel
  const handleExportExcel = async () => {
    if (!tournament) return;
    try {
      await registrationAPI.downloadParticipantsExcel(tournament.id, tournament.code);
    } catch (err) {
      alert('Không thể tải file Excel: ' + (err as Error).message);
    }
  };

  // Sao chép liên kết check-in chính thức
  const handleCopyCode = () => {
    if (officialQrData.checkinUrl) {
      navigator.clipboard.writeText(officialQrData.checkinUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Tải file ảnh QR Code
  const handleDownloadQR = () => {
    if (!officialQrData.dataUrl || !tournament) return;
    const a = document.createElement('a');
    a.href = officialQrData.dataUrl;
    a.download = `QR_Checkin_${tournament.code}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Sinh mã QR Test để kiểm thử chức năng check-in
  const testQrData = useMemo(() => {
    if (!tournament) return { dataUrl: '', testUrl: '', testCode: '' };

    const timeShort = testQrTimestamp.slice(11, 19).replace(/:/g, '');
    const testCode = `DUT-TEST-QR-${tournament.code}-${timeShort}`;
    const testUrl = `${effectiveOrigin}/tournament/${tournament.id}?action=checkin&test=1`;
    const dataUrl = createQRCodeDataURL(testUrl, 240);

    return { dataUrl, testUrl, testCode };
  }, [tournament, effectiveOrigin, testQrTimestamp]);

  const handleCopyTestCode = () => {
    if (testQrData.testUrl) {
      navigator.clipboard.writeText(testQrData.testUrl);
      setCopyTestSuccess(true);
      setTimeout(() => setCopyTestSuccess(false), 2000);
    }
  };

  const handleDownloadTestQR = () => {
    if (!testQrData.dataUrl || !tournament) return;
    const a = document.createElement('a');
    a.href = testQrData.dataUrl;
    a.download = `QR_Test_${tournament.code}_${testQrData.testCode}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleGenerateNewTestQR = () => {
    setTestQrTimestamp(new Date().toISOString());
    setTestScanModalOpen(false);
  };

  if (loading) {
    return (
      <div className="td-page-wrapper" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
        <h3 style={{ color: '#2e259e' }}>Đang tải thông tin giải đấu...</h3>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="td-page-wrapper" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>❌</div>
        <h3 style={{ color: '#ef4444' }}>{error || 'Không tìm thấy giải đấu'}</h3>
        <button
          className="td-btn-back"
          style={{ marginTop: '20px' }}
          onClick={handleBack}
        >
          ← Quay lại Quản Lý Giải Đấu
        </button>
      </div>
    );
  }

  return (
    <div className="td-page-wrapper">
      {/* Top Navbar */}
      <header className="td-top-nav-bar">
        <button className="td-btn-back" onClick={handleBack}>
          ← Quay lại Quản Lý Giải Đấu
        </button>

        <div className="td-nav-right-actions">
          {currentUser && (
            <span className="td-user-badge">
              👤 {currentUser.full_name} ({currentUser.role === 'admin' ? 'Quản Trị Viên' : 'Cộng Tác Viên'})
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="td-main-container">
        {/* Tiêu đề giải đấu (Khớp chính xác với hình mẫu tham khảo) */}
        <section className="td-header-section">
          <h1 className="td-tournament-title">{tournament.name}</h1>
          <div className="td-title-divider-wrap">
            <div className="td-title-underline" />
            <div className="td-title-pointer" />
          </div>
        </section>

        {/* Thanh 4 nút tab hàng ngang */}
        <nav className="td-tabs-bar">
          <button
            type="button"
            className={`td-tab-button ${activeTab === 'info' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('info')}
          >
            Thông tin
          </button>
          <button
            type="button"
            className={`td-tab-button ${activeTab === 'teams' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('teams')}
          >
            Danh sách đội
          </button>
          <button
            type="button"
            className={`td-tab-button ${activeTab === 'qr' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('qr')}
          >
            Mã QR Check-in
          </button>
          <button
            type="button"
            className={`td-tab-button ${activeTab === 'bracket' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('bracket')}
          >
            Nhánh đấu
          </button>
        </nav>

        {/* =============================================================
            TAB 1: THÔNG TIN (KHỚP ẢNH 1)
           ============================================================= */}
        {activeTab === 'info' && (
          <div className="td-tab-pane-info">
            {/* Ảnh poster truyền thông ở giữa */}
            <div className="td-poster-wrap">
              {tournament.banner_url ? (
                <img
                  src={tournament.banner_url}
                  alt={tournament.name}
                  className="td-poster-img"
                  onError={(e) => {
                    // Fallback poster nếu URL ảnh bị lỗi
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  className="td-poster-img"
                  style={{
                    height: '240px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f1f5f9',
                    color: '#64748b',
                  }}
                >
                  🎮 Chưa cập nhật poster
                </div>
              )}
            </div>

            {/* Thể Lệ */}
            <div className="td-rules-text-block">
              <span className="td-rules-label">Thế Lệ:</span>
              <p className="td-rules-desc">
                {tournament.description
                  ? tournament.description
                  : 'Theo dõi các thông báo và quy định chính thức từ Ban tổ chức giải đấu.'}
              </p>
            </div>

            {/* Đường kẻ ngang phân cách */}
            <hr className="td-info-separator" />

            {/* Lưới thông tin 2 cột */}
            <div className="td-info-grid-2col">
              {/* Cột 1 */}
              <div className="td-info-item">
                <span className="td-info-item-label">Loại sự kiện</span>
                <span className="td-info-item-value">Công khai</span>
              </div>

              {/* Cột 2 */}
              <div className="td-info-item">
                <span className="td-info-item-label">Tỉnh/Thành phố</span>
                <span className="td-info-item-value">Đà Nẵng</span>
              </div>

              {/* Cột 1 */}
              <div className="td-info-item">
                <span className="td-info-item-label">Hình thức sự kiện</span>
                <span className="td-info-item-value">
                  {tournament.participation_type === 'team' ? 'Thi đấu đồng đội' : 'Cá nhân'}
                </span>
              </div>

              {/* Cột 2 */}
              <div className="td-info-item">
                <span className="td-info-item-label">Địa chỉ</span>
                <span className="td-info-item-value">
                  {tournament.location || '74 Nguyễn Lương Bằng'}
                </span>
              </div>

              {/* Cột 1 */}
              <div className="td-info-item">
                <span className="td-info-item-label">Thời gian diễn ra</span>
                <span className="td-info-item-value">
                  {formatDateTime(tournament.start_at)}
                </span>
              </div>

              {/* Cột 2 */}
              <div className="td-info-item">
                <span className="td-info-item-label">Hạn đăng ký</span>
                <span className="td-info-item-value">
                  {formatDateTime(tournament.registration_close_at)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 2: DANH SÁCH ĐỘI (KHỚP ẢNH 2)
           ============================================================= */}
        {activeTab === 'teams' && (
          <div className="td-tab-pane-teams">
            {/* Banner thống kê 4 chỉ số */}
            <div className="td-teams-summary-banner">
              <div className="td-summary-stat-col">
                <div className="td-summary-stat-item">
                  <span className="td-summary-label">Số đội đăng ký:</span>
                  <span className="td-summary-value">{summaryStats.totalTeams}</span>
                </div>
                <div className="td-summary-stat-item">
                  <span className="td-summary-label">Số người đăng ký:</span>
                  <span className="td-summary-value">{summaryStats.totalMembers}</span>
                </div>
              </div>

              <div className="td-summary-stat-col">
                <div className="td-summary-stat-item">
                  <span className="td-summary-label">Số đội check-in:</span>
                  <span className="td-summary-value">{summaryStats.checkedInTeams}</span>
                </div>
                <div className="td-summary-stat-item">
                  <span className="td-summary-label">Số người check-in:</span>
                  <span className="td-summary-value">{summaryStats.checkedInMembers}</span>
                </div>
              </div>
            </div>

            {/* Thanh điều khiển bộ lọc */}
            <div className="td-teams-filter-bar">
              <select
                className="td-filter-select"
                value={checkinFilter}
                onChange={(e) => setCheckinFilter(e.target.value as 'all' | 'checked_in' | 'not_checked_in')}
              >
                <option value="all">Trạng thái check-in (Tất cả)</option>
                <option value="checked_in">Đã check-in</option>
                <option value="not_checked_in">Chưa check-in</option>
              </select>

              <div className="td-search-box">
                <input
                  type="text"
                  placeholder="🔍 Tìm tên đội, leader, SĐT..."
                  className="td-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button type="button" className="td-btn-export-excel" onClick={handleExportExcel}>
                📊 Xuất File Excel
              </button>
            </div>

            {/* Danh sách các card đội thi đấu */}
            <div className="td-teams-list-wrap">
              {filteredTeams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#fff', borderRadius: '6px' }}>
                  Không tìm thấy đội nào phù hợp với bộ lọc.
                </div>
              ) : (
                filteredTeams.map((team, idx) => {
                  const isCheckedIn = (team.checkedInCount || 0) > 0;
                  const leaderMember = team.members?.find((m) => m.isCaptain) || team.members?.[0];
                  const leaderPhone = leaderMember?.phoneNumber || 'Chưa cập nhật';
                  const isExpanded = expandedTeamId === team.registrationId;

                  return (
                    <div key={team.registrationId} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="td-team-card">
                        {/* STT ô vuông đen */}
                        <div className="td-team-stt-badge">{idx + 1}</div>

                        {/* 2 cột dữ liệu */}
                        <div className="td-team-data-grid">
                          {/* Cột trái */}
                          <div className="td-team-field">
                            <span className="td-team-field-label">Tên đội</span>
                            <button
                              type="button"
                              className="td-team-name-link"
                              onClick={() => setExpandedTeamId(isExpanded ? null : team.registrationId)}
                              title="Bấm để xem danh sách thành viên"
                            >
                              {team.teamName}
                            </button>

                            <span className="td-team-field-label" style={{ marginTop: '6px' }}>
                              Trạng thái
                            </span>
                            <span
                              className={`td-team-status-val ${isCheckedIn ? 'checked-in' : 'pending'}`}
                            >
                              {isCheckedIn ? 'Đã check-in' : 'Chưa check-in'}
                            </span>
                          </div>

                          {/* Cột phải */}
                          <div className="td-team-field">
                            <span className="td-team-field-label">Số thành viên check-in</span>
                            <span className="td-team-count-val">
                              {team.checkedInCount || 0}/{team.totalMembers || team.members?.length || 0}
                            </span>

                            <span className="td-team-field-label" style={{ marginTop: '6px' }}>
                              SĐT Leader
                            </span>
                            <span className="td-team-phone-val">{leaderPhone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chi tiết thành viên khi bấm vào Tên đội */}
                      {isExpanded && (
                        <div className="td-team-members-drawer">
                          <h4 style={{ margin: '0 0 10px 0', color: '#2e259e', fontSize: '13.5px' }}>
                            👥 Danh sách thành viên đội {team.teamName}:
                          </h4>
                          <table className="td-members-table">
                            <thead>
                              <tr>
                                <th>Họ và Tên</th>
                                <th>MSSV</th>
                                <th>Ingame ID</th>
                                <th>Vị Trí</th>
                                <th>Trạng Thái Điểm Danh</th>
                              </tr>
                            </thead>
                            <tbody>
                              {team.members?.map((m) => (
                                <tr key={m.participantId}>
                                  <td>
                                    {m.isCaptain ? '👑 ' : '👤 '}
                                    <strong>{m.fullName}</strong>
                                  </td>
                                  <td>{m.studentId || '-'}</td>
                                  <td>
                                    <code>{m.ingameId || '-'}</code>
                                  </td>
                                  <td>{m.roleInTeam || '-'}</td>
                                  <td>
                                    <span
                                      className={`td-member-status-tag ${m.checkinStatus === 'approved' ? 'approved' : 'pending'}`}
                                    >
                                      {m.checkinStatus === 'approved' ? '✅ Đã Điểm Danh' : '⏳ Chưa Điểm Danh'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 3: MÃ QR CHECK-IN (CHÍNH THỨC & TEST THỬ NGHIỆM)
           ============================================================= */}
        {activeTab === 'qr' && (
          <div className="td-tab-pane-qr">
            {/* Thanh chuyển đổi Chế Độ QR */}
            <div className="td-qr-mode-switcher">
              <button
                type="button"
                className={`td-qr-mode-btn ${qrMode === 'official' ? 'active' : ''}`}
                onClick={() => setQrMode('official')}
              >
                🟢 Mã QR Điểm Danh Chính Thức {isQrUnlocked ? '(Đã Mở)' : '(0:00 Ngày Đấu)'}
              </button>
              <button
                type="button"
                className={`td-qr-mode-btn test ${qrMode === 'test' ? 'active' : ''}`}
                onClick={() => setQrMode('test')}
              >
                🧪 Mã QR Thử Nghiệm (Test Mode)
              </button>
            </div>

            {/* Thanh chọn Host URL cho Mã QR (Hỗ trợ điện thoại quét qua Wi-Fi / LAN) */}
            <div className="td-qr-host-bar">
              <div className="td-qr-host-label">
                <span>🌐 Thiết lập URL Mã QR (Dành cho Camera iPhone / Android quét):</span>
              </div>
              <div className="td-qr-host-controls">
                <button
                  type="button"
                  className={`td-qr-host-btn ${!customQrOrigin ? 'active' : ''}`}
                  onClick={() => setCustomQrOrigin('')}
                >
                  💻 Tự động ({currentOrigin || 'localhost:3000'})
                </button>
                <button
                  type="button"
                  className={`td-qr-host-btn ${customQrOrigin === 'http://192.168.1.135:3000' ? 'active' : ''}`}
                  onClick={() => setCustomQrOrigin('http://192.168.1.135:3000')}
                >
                  📶 IP Wi-Fi LAN (http://192.168.1.135:3000)
                </button>
                <input
                  type="text"
                  className="td-qr-host-input"
                  placeholder="Nhập IP/URL tùy chỉnh (vd: http://192.168.1.xxx:3000)"
                  value={customQrOrigin}
                  onChange={(e) => setCustomQrOrigin(e.target.value)}
                />
              </div>
              <div className="td-qr-host-tip">
                💡 <strong>Mẹo mở bằng Safari / Camera iPhone:</strong> Nếu máy tính mở bằng <code>localhost</code>, hãy chọn <strong>&ldquo;📶 IP Wi-Fi LAN&rdquo;</strong> để mã QR chứa IP máy tính (<code>192.168.1.135</code>), giúp camera iPhone quét là mở được Safari ngay lập tức!
              </div>
            </div>

            {qrMode === 'test' ? (
              /* ================= GIAO DIỆN QR TEST THỬ NGHIỆM ================= */
              <div className="td-qr-test-wrap">
                <div className="td-qr-test-header">
                  <span className="td-qr-test-badge">🧪 MÃ QR TEST CHỨC NĂNG QUÉT CHECK-IN</span>
                  <h3 className="td-qr-test-title">Thử Nghiệm Quét Mã Điểm Danh Ngay</h3>
                  <p className="td-qr-test-desc">
                    Mã QR này được thiết lập độc lập để Ban Tổ Chức và Trọng tài có thể kiểm tra camera thiết bị, ứng dụng quét mã và quy trình nhận diện mà không cần chờ tới 0:00 ngày thi đấu.
                  </p>
                </div>

                <div className="td-qr-card td-qr-test-card">
                  <div className="td-qr-test-corner-tag">TEST</div>
                  <img
                    src={testQrData.dataUrl}
                    alt="Mã QR Test Check-in"
                    className="td-qr-code-img td-qr-test-img"
                  />

                  {/* Thông tin thẻ check-in test */}
                  <div className="td-qr-info-meta">
                    <div className="td-qr-meta-row">
                      <span className="td-qr-meta-label">Liên kết URL:</span>
                      <span className="td-qr-meta-val" style={{ fontSize: '12px', wordBreak: 'break-all', color: '#38bdf8' }}>
                        {testQrData.testUrl}
                      </span>
                    </div>

                    <div className="td-qr-meta-row">
                      <span className="td-qr-meta-label">Mục đích:</span>
                      <span className="td-qr-meta-val" style={{ color: '#38bdf8', fontWeight: 'bold' }}>Kiểm thử quét bằng Camera thường / Zalo</span>
                    </div>

                    <div className="td-qr-meta-row">
                      <span className="td-qr-meta-label">Giải đấu:</span>
                      <span className="td-qr-meta-val">{tournament.name}</span>
                    </div>

                    <div className="td-qr-meta-row">
                      <span className="td-qr-meta-label">Mã Test:</span>
                      <span className="td-qr-meta-val" style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 'bold' }}>
                        {testQrData.testCode}
                      </span>
                    </div>
                  </div>

                  {/* Nút thao tác QR Test */}
                  <div className="td-qr-actions-row">
                    <button type="button" className="td-btn-qr-download" onClick={handleDownloadTestQR}>
                      ⬇️ Tải Ảnh QR Test
                    </button>
                    <button type="button" className="td-btn-qr-copy" onClick={handleCopyTestCode}>
                      {copyTestSuccess ? '✅ Đã Sao Chép Link' : '📋 Sao Chép Link Test'}
                    </button>
                    <button type="button" className="td-btn-qr-refresh" onClick={handleGenerateNewTestQR} title="Đổi mã QR Test mới">
                      🔄 Sinh Mã Test Mới
                    </button>
                  </div>
                </div>

                {/* Hộp thoại mô phỏng kết quả quét Test */}
                {testScanModalOpen && (
                  <div className="td-test-scan-result-card">
                    <div className="td-test-scan-result-header">
                      <span>✅ Kết Quả Mô Phỏng Quét QR Test:</span>
                      <button type="button" className="btn-close-test-scan" onClick={() => setTestScanModalOpen(false)}>✕</button>
                    </div>
                    <div className="td-test-scan-result-body">
                      <div className="td-scan-success-icon">🎉</div>
                      <div>
                        <strong>Quét Thành Công!</strong> Dữ liệu mã QR hợp lệ cho giải đấu <em>{tournament.name}</em> (Mã: <code>{tournament.code}</code>).
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
                          Thiết bị &amp; Camera của bạn sẵn sàng hoạt động trong ngày thi đấu chính thức.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : !isQrUnlocked && !adminPreviewQR ? (
              /* TRƯỜNG HỢP 1: CHƯA ĐẾN 0:00 NGÀY THI ĐẤU */
              <div className="td-qr-locked-box">
                <div className="td-qr-locked-icon">🔒</div>
                <h3 className="td-qr-locked-title">Cổng QR Check-in Tự Động Chưa Mở</h3>
                <p className="td-qr-locked-desc">
                  Theo quy chế giải đấu, hệ thống sẽ <strong>tự động tạo và kích hoạt mã QR Check-in chính thức</strong> vào lúc{' '}
                  <strong>00:00 ngày {formatDateOnly(tournament.start_at)}</strong> (ngày diễn ra giải đấu).
                </p>

                {/* Đồng hồ đếm ngược */}
                <div className="td-countdown-grid">
                  <div className="td-countdown-box">
                    <span className="td-countdown-num">{countdown.days}</span>
                    <span className="td-countdown-unit">Ngày</span>
                  </div>
                  <div className="td-countdown-box">
                    <span className="td-countdown-num">{String(countdown.hours).padStart(2, '0')}</span>
                    <span className="td-countdown-unit">Giờ</span>
                  </div>
                  <div className="td-countdown-box">
                    <span className="td-countdown-num">{String(countdown.minutes).padStart(2, '0')}</span>
                    <span className="td-countdown-unit">Phút</span>
                  </div>
                  <div className="td-countdown-box">
                    <span className="td-countdown-num">{String(countdown.seconds).padStart(2, '0')}</span>
                    <span className="td-countdown-unit">Giây</span>
                  </div>
                </div>

                <div className="td-locked-hint-box">
                  <span>💡 Bạn muốn kiểm tra chức năng quét mã check-in ngay?</span>
                  <button
                    type="button"
                    className="td-btn-go-test-mode"
                    onClick={() => setQrMode('test')}
                  >
                    🧪 Mở Mã QR Thử Nghiệm (Test Mode) →
                  </button>
                </div>

                <label className="td-admin-preview-toggle">
                  <input
                    type="checkbox"
                    checked={adminPreviewQR}
                    onChange={(e) => setAdminPreviewQR(e.target.checked)}
                  />
                  <span>👁️ Bật chế độ xem trước QR cá nhân chính thức (Dành cho Ban Tổ Chức)</span>
                </label>
              </div>
            ) : (
              /* TRƯỜNG HỢP 2: ĐÃ ĐẾN 0:00 HOẶC ADMIN PREVIEW */
              <div className="td-qr-unlocked-wrap">
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    🟢 Mã QR Điểm Danh Giải Đấu (Camera Thường / Zalo)
                  </span>
                  <p style={{ fontSize: '13.5px', color: '#64748b', marginTop: '8px' }}>
                    Chiếu mã QR này tại bàn thi đấu. Thí sinh sử dụng Camera iPhone thường hoặc Zalo để quét và tự động mở trang điểm danh.
                  </p>
                </div>

                <div className="td-qr-card">
                  {/* Mã QR hình ảnh SVG chứa URL */}
                  <img
                    src={officialQrData.dataUrl}
                    alt="Mã QR Check-in"
                    className="td-qr-code-img"
                  />

                  {/* Thông tin thẻ check-in */}
                  <div className="td-qr-info-meta">
                    <div className="td-qr-meta-row">
                      <span className="td-qr-meta-label">Liên kết mở:</span>
                      <span className="td-qr-meta-val" style={{ fontSize: '12px', wordBreak: 'break-all', color: '#2563eb' }}>
                        {officialQrData.checkinUrl}
                      </span>
                    </div>

                    <div className="td-qr-meta-row">
                      <span className="td-qr-meta-label">Giải đấu:</span>
                      <span className="td-qr-meta-val">{tournament.name}</span>
                    </div>

                    <div className="td-qr-meta-row">
                      <span className="td-qr-meta-label">Mã Điểm Danh:</span>
                      <span className="td-qr-meta-val" style={{ fontFamily: 'monospace', color: '#2e259e' }}>
                        {officialQrData.checkinCode}
                      </span>
                    </div>
                  </div>

                  {/* Nút thao tác */}
                  <div className="td-qr-actions-row">
                    <button type="button" className="td-btn-qr-download" onClick={handleDownloadQR}>
                      ⬇️ Tải Ảnh QR Điểm Danh
                    </button>
                    <button type="button" className="td-btn-qr-copy" onClick={handleCopyCode}>
                      {copySuccess ? '✅ Đã Sao Chép Link' : '📋 Sao Chép Link Check-in'}
                    </button>
                  </div>
                </div>

                {/* Bản đồ Leaflet giám sát vị trí các thí sinh đã check-in */}
                <div style={{ marginTop: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
                      🗺️ Giám Sát Vị Trí Thí Sinh Đã Check-in (Leaflet + OpenStreetMap)
                    </h3>
                    <button
                      type="button"
                      onClick={handleRefreshCheckins}
                      disabled={refreshingMap}
                      style={{
                        padding: '6px 12px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {refreshingMap ? '⏳ Đang tải...' : '🔄 Làm Mới Bản Đồ'}
                    </button>
                  </div>

                  <LeafletCheckinMap
                    points={checkinMapPoints}
                    height={380}
                    title={`Vị trí thí sinh điểm danh (${checkinMapPoints.length} thí sinh)`}
                  />
                </div>

                {adminPreviewQR && (
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      marginTop: '16px',
                    }}
                    onClick={() => setAdminPreviewQR(false)}
                  >
                    ✕ Tắt chế độ xem trước Admin
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* =============================================================
            TAB 4: NHÁNH ĐẤU (PLACEHOLDER THEO CHỈ ĐỊNH)
           ============================================================= */}
        {activeTab === 'bracket' && (
          <div className="td-tab-pane-bracket">
            <div className="td-bracket-placeholder-icon">🏆</div>
            <span className="td-bracket-badge-soon">Đang hoàn thiện</span>
            <h3 className="td-bracket-placeholder-title">Sơ Đồ Nhánh Đấu Giải Đấu</h3>
            <p className="td-bracket-placeholder-desc">
              Ban tổ chức đang chuẩn bị và thiết lập sơ đồ phân nhánh thi đấu cho giải đấu này. Bảng đấu sẽ chính thức hiển thị tại đây sau khi hoàn tất giai đoạn chốt danh sách và phân hạt giống.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
