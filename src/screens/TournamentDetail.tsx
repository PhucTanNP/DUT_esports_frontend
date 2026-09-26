'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import MyTeamRegistrationTab from '../components/MyTeamRegistrationTab';
import RecruitingMarketTab from '../components/RecruitingMarketTab';
import { organizerAPI } from '../services/organizer.service';
import { participantAPI, type ParticipantRow } from '../services/participant.service';
import { type CreateRegistrationPayload, registrationAPI } from '../services/registration.service';
import { tournamentAPI } from '../services/tournament.service';
import type { FormField, SafeUser, Tournament } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { parseFormSchema } from '../utils/formSchema';
import { getTournamentStage } from '../utils/tournamentStage';
import SoloCheckinModal from '../components/SoloCheckinModal';
import '../styles/TournamentDetail.css';

type TabType = 'overview' | 'recruiting' | 'my-team' | 'rules' | 'faq';

const ROLES = ['Top', 'Jungle', 'Mid', 'AD', 'SP', 'Sub'];

interface TeamMemberInput {
  participant_id: string;
  ingame_id: string;
  role_in_team: string;
  full_name?: string;
}

export default function TournamentDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentUser, setCurrentUser] = useState<ParticipantRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showSoloCheckin, setShowSoloCheckin] = useState(false);

  useEffect(() => {
    if (tabParam && ['overview', 'recruiting', 'my-team', 'rules', 'faq'].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }
  }, [tabParam]);

  // Tự động kích hoạt Check-in khi URL có ?action=checkin hoặc ?checkin=true
  useEffect(() => {
    const actionParam = searchParams.get('action');
    const checkinParam = searchParams.get('checkin');
    const isCheckinRequested = actionParam === 'checkin' || checkinParam === 'true' || checkinParam === '1';

    if (isCheckinRequested && !loading) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') : null;
      if (!token && !currentUser) {
        // Chưa đăng nhập: điều hướng tới trang /login kèm redirect quay lại đây
        const targetPath = window.location.pathname + window.location.search;
        router.push(`/login?redirect=${encodeURIComponent(targetPath)}`);
      } else {
        setShowSoloCheckin(true);
      }
    }
  }, [searchParams, loading, currentUser, router]);

  // Registration Modal State
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Form Fields State
  const [ingameId, setIngameId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamAvatarUrl, setTeamAvatarUrl] = useState('');
  const [captainRole, setCaptainRole] = useState('Top');
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [recruitmentNotes, setRecruitmentNotes] = useState('');
  const [members, setMembers] = useState<TeamMemberInput[]>([]);

  // Add Member Input State
  const [newMemberQuery, setNewMemberQuery] = useState('');
  const [memberCandidates, setMemberCandidates] = useState<SafeUser[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<SafeUser | null>(null);
  const [newMemberIngameId, setNewMemberIngameId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Jungle');

  // Dynamic Form Data
  const [dynamicData, setDynamicData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const result = await tournamentAPI.getById(id);
        if (isMounted) {
          if (result.success) {
            setTournament(result.data ?? null);
            setError('');
          } else {
            setError(result.message || 'Không thể tải thông tin giải đấu');
          }
        }
      } catch (err) {
        if (isMounted) setError('Lỗi kết nối: ' + (err as Error).message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    participantAPI
      .getMyProfile()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setCurrentUser(res.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Search candidate members when adding member
  useEffect(() => {
    if (!newMemberQuery.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await organizerAPI.getCandidateParticipants(newMemberQuery);
        if (res.success && res.data) {
          setMemberCandidates(res.data);
        }
      } catch (err) {
        console.error('Search member error:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [newMemberQuery]);

  const formSchema: FormField[] = parseFormSchema(tournament?.form_schema);

  const handleRegisterClick = () => {
    if (!currentUser) {
      alert('⚠️ Bạn cần đăng nhập tài khoản sinh viên để đăng ký tham gia giải đấu!');
      router.push('/profile');
      return;
    }

    if (currentUser.status === 'pending') {
      alert('⏳ Tài khoản của bạn đang chờ Admin phê duyệt KYC qua thẻ SV. Vui lòng quay lại sau khi tài khoản được duyệt!');
      return;
    }

    if (currentUser.status === 'rejected') {
      alert('❌ Tài khoản của bạn đã bị từ chối KYC. Vui lòng vào trang cá nhân để nộp lại ảnh thẻ sinh viên!');
      router.push('/profile');
      return;
    }

    // Reset Form
    const initialDynamic: Record<string, unknown> = {};
    formSchema.forEach((field) => {
      initialDynamic[field.id] = '';
    });
    setDynamicData(initialDynamic);
    setIngameId('');
    setTeamName('');
    setTeamAvatarUrl('');
    setCaptainRole('Top');
    setIsRecruiting(false);
    setRecruitmentNotes('');
    setMembers([]);
    setNewMemberQuery('');
    setSelectedCandidate(null);
    setNewMemberIngameId('');
    setRegError(null);
    setFormSubmitted(false);
    setShowRegistrationForm(true);
  };

  const handleAddMember = () => {
    if (!selectedCandidate) {
      alert('Vui lòng tìm kiếm và chọn một sinh viên đã KYC');
      return;
    }

    if (!newMemberIngameId.trim()) {
      alert('Vui lòng nhập Ingame ID của thành viên này');
      return;
    }

    if (selectedCandidate.id === currentUser?.id) {
      alert('Bạn là Đội trưởng, không cần thêm bản thân vào danh sách thành viên!');
      return;
    }

    if (members.some((m) => m.participant_id === selectedCandidate.id)) {
      alert('Thành viên này đã có trong danh sách!');
      return;
    }

    const maxTeam = tournament?.max_team_size || 5;
    if (1 + members.length >= maxTeam) {
      alert(`Đội đã đạt tối đa ${maxTeam} thành viên (bao gồm Đội trưởng)`);
      return;
    }

    setMembers([
      ...members,
      {
        participant_id: selectedCandidate.id,
        ingame_id: newMemberIngameId.trim(),
        role_in_team: newMemberRole,
        full_name: selectedCandidate.full_name,
      },
    ]);

    setSelectedCandidate(null);
    setNewMemberQuery('');
    setNewMemberIngameId('');
  };

  const handleRemoveMember = (participantId: string) => {
    setMembers(members.filter((m) => m.participant_id !== participantId));
  };

  const handleSubmitRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tournament) return;

    const isTeam = tournament.participation_type === 'team';

    if (!ingameId.trim()) {
      setRegError('Vui lòng nhập Ingame ID của bạn trong game');
      return;
    }

    if (isTeam) {
      if (!teamName.trim()) {
        setRegError('Vui lòng nhập Tên Đội thi đấu');
        return;
      }

      const totalMembers = 1 + members.length;
      const minSize = tournament.min_team_size || 5;
      const maxSize = tournament.max_team_size || 7;

      if (!isRecruiting) {
        if (totalMembers < minSize || totalMembers > maxSize) {
          setRegError(`Số lượng thành viên hiện tại (${totalMembers}) chưa đủ từ ${minSize} đến ${maxSize} người. Nếu đội đang thiếu người, vui lòng bật cờ "Tuyển quân" để tìm thêm trên Chợ Đồng Đội!`);
          return;
        }
      } else {
        if (!recruitmentNotes.trim()) {
          setRegError('Vui lòng ghi chú vị trí cần tuyển (VD: Cần 1 Mid, 1 SP rank Cao thủ)');
          return;
        }
      }
    }

    // Validate dynamic required fields
    const requiredFields = formSchema.filter((f) => f.required);
    const missingFields = requiredFields.filter(
      (f) => !dynamicData[f.id] || String(dynamicData[f.id]).trim() === '',
    );
    if (missingFields.length > 0) {
      setRegError(`Vui lòng điền các trường bắt buộc: ${missingFields.map((f) => f.label).join(', ')}`);
      return;
    }

    setSubmittingForm(true);
    setRegError(null);

    try {
      const payload: CreateRegistrationPayload = {
        tournament_id: id as string,
        ingame_id: ingameId.trim(),
        role_in_team: isTeam ? captainRole : undefined,
        team_name: isTeam ? teamName.trim() : undefined,
        team_avatar_url: isTeam && teamAvatarUrl.trim() ? teamAvatarUrl.trim() : undefined,
        members: isTeam
          ? members.map((m) => ({
              participant_id: m.participant_id,
              ingame_id: m.ingame_id,
              role_in_team: m.role_in_team,
            }))
          : undefined,
        is_recruiting: isTeam ? isRecruiting : false,
        recruitment_notes: isTeam && isRecruiting ? recruitmentNotes.trim() : undefined,
        submitted_data: dynamicData,
      };

      const result = await registrationAPI.create(payload);
      if (result.success) {
        setFormSubmitted(true);
      } else {
        setRegError(result.message || 'Không thể đăng ký giải đấu');
      }
    } catch (err) {
      setRegError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setSubmittingForm(false);
    }
  };

  if (loading) {
    return (
      <div className="tournament-detail" suppressHydrationWarning>
        <div className="loading" suppressHydrationWarning>⏳ Đang tải thông tin giải đấu...</div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="tournament-detail" suppressHydrationWarning>
        <div className="error-state">
          <div className="error-message">
            <h2>❌ Lỗi</h2>
            <p>{error || 'Không tìm thấy giải đấu'}</p>
            <button onClick={() => router.push('/')} className="btn-back">
              ← Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stageInfo = getTournamentStage(tournament);
  const isRegistrationOpen = stageInfo.canRegister;

  return (
    <div className="tournament-detail" suppressHydrationWarning>
      {/* Banner */}
      <div className="banner-section">
        <img src={tournament.banner_url} alt={tournament.name} className="banner-image" />
        <div className="banner-overlay">
          <div className="banner-content">
            <div className="tournament-header-info">
              <div className="left-info">
                <h1>{tournament.name}</h1>
                <div className="game-info">
                  {tournament.game_logo_url && (
                    <img src={tournament.game_logo_url} alt={tournament.game_name} className="game-logo" />
                  )}
                  <span className="game-name">{tournament.game_name}</span>
                </div>
                <div className={`status-badge ${stageInfo.badgeClass}`}>{stageInfo.badgeText}</div>
              </div>
              <button onClick={() => router.push('/')} className="btn-close-detail">✕</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="detail-container">
        {/* Info Cards Grid */}
        <div className="info-cards">
          {tournament.prize_pool > 0 && (
            <div className="info-card">
              <div className="info-icon">💰</div>
              <div className="info-content">
                <div className="info-label">Tổng Tiền Thưởng</div>
                <div className="info-value">{formatCurrency(tournament.prize_pool)}</div>
              </div>
            </div>
          )}

          <div className="info-card">
            <div className="info-icon">👥</div>
            <div className="info-content">
              <div className="info-label">Quy Mô Max</div>
              <div className="info-value">
                {tournament.max_participants} {tournament.participation_type === 'team' ? 'Đội' : 'VĐV'}
              </div>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">📋</div>
            <div className="info-content">
              <div className="info-label">Loại Tham Gia</div>
              <div className="info-value">
                {tournament.participation_type === 'team' ? '👥 Game Đồng Đội' : '👤 Game Cá Nhân (TFT)'}
              </div>
            </div>
          </div>

          {tournament.location && (
            <div className="info-card">
              <div className="info-icon">📍</div>
              <div className="info-content">
                <div className="info-label">Địa Điểm Thi Đấu</div>
                <div className="info-value">{tournament.location}</div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="timeline-section">
          <h2>📅 Lịch Trình Giải Đấu</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-icon">🔓</div>
              <div className="timeline-content">
                <div className="timeline-label">Mở Đăng Ký</div>
                <div className="timeline-date">{formatDate(tournament.registration_open_at)}</div>
              </div>
            </div>

            <div className="timeline-connector"></div>

            <div className="timeline-item">
              <div className="timeline-icon">🔒</div>
              <div className="timeline-content">
                <div className="timeline-label">Đóng Đăng Ký</div>
                <div className="timeline-date">{formatDate(tournament.registration_close_at)}</div>
              </div>
            </div>

            <div className="timeline-connector"></div>

            <div className="timeline-item">
              <div className="timeline-icon">🎮</div>
              <div className="timeline-content">
                <div className="timeline-label">Bắt Đầu</div>
                <div className="timeline-date">{formatDate(tournament.start_at)}</div>
              </div>
            </div>

            <div className="timeline-connector"></div>

            <div className="timeline-item">
              <div className="timeline-icon">🏁</div>
              <div className="timeline-content">
                <div className="timeline-label">Kết Thúc</div>
                <div className="timeline-date">{formatDate(tournament.end_at)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-section">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📝 Tổng Quan
            </button>

            {tournament.participation_type === 'team' && (
              <button
                className={`tab-btn ${activeTab === 'recruiting' ? 'active' : ''}`}
                onClick={() => setActiveTab('recruiting')}
              >
                📢 Chợ Tuyển Quân
              </button>
            )}

            <button
              className={`tab-btn ${activeTab === 'my-team' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-team')}
            >
              {tournament.participation_type === 'team' ? '🛡️ Đội Tuyển Của Tôi' : '📋 Đơn Đăng Ký Của Tôi'}
            </button>

            <button
              className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              ⚖️ Điều Lệ
            </button>

            <button
              className={`tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              ❓ FAQ
            </button>
          </div>

          <div className="tabs-content">
            {/* 1. Overview Tab */}
            {activeTab === 'overview' && (
              <div className="tab-pane">
                <h3>Thông Tin Chi Tiết</h3>
                {tournament.description && (
                  <div className="description">
                    <p>{tournament.description}</p>
                  </div>
                )}

                {tournament.participation_type === 'team' && (
                  <div className="team-info">
                    <h4>🏆 Cấu Trúc Đội Tuyển</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Số Thành Viên Tối Thiểu:</span>
                        <span className="value">{tournament.min_team_size || 5} người</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Số Thành Viên Tối Đa:</span>
                        <span className="value">{tournament.max_team_size || 7} người</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="registration-info">
                  <h4>📋 Đăng Ký Thi Đấu</h4>
                  {stageInfo.stage === 'GD0' && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '16px', borderRadius: '8px', color: '#fef3c7' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>⏳ Giải đấu chưa mở nhận đăng ký (GD0).</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#fde68a' }}>
                        Thời gian mở đăng ký dự kiến: <strong>{formatDate(tournament.registration_open_at)}</strong>. Vui lòng quay lại sau!
                      </p>
                    </div>
                  )}
                  {(stageInfo.stage === 'GD1' || stageInfo.canRegister) && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '16px', borderRadius: '8px', color: '#d1fae5' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>🟢 Giải đấu đang mở nhận đăng ký (GD1).</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#a7f3d0' }}>
                        Vui lòng bấm nút <strong>"Đăng Ký Ngay"</strong> ở thanh thao tác phía dưới để đăng ký thi đấu.
                      </p>
                    </div>
                  )}
                  {stageInfo.stage === 'GD2' && (
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', padding: '16px', borderRadius: '8px', color: '#e0f2fe' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>🔒 Giải đấu đã đóng nhận đăng ký mới (GD2).</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                        Thí sinh đã đăng ký có thể kiểm tra hoặc cập nhật thông tin trong tab <strong>"{tournament.participation_type === 'team' ? 'Đội Tuyển Của Tôi' : 'Đơn Đăng Ký Của Tôi'}"</strong>.
                      </p>
                    </div>
                  )}
                  {stageInfo.stage === 'GD3' && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '16px', borderRadius: '8px', color: '#fee2e2' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>⚡ Giải đấu đang trong giai đoạn Check-in & Thi đấu (GD3).</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#fca5a5' }}>
                        Thông tin đăng ký đã được khóa để đảm bảo tính minh bạch thi đấu. Mời bạn theo dõi bảng đấu và lịch thi đấu!
                      </p>
                    </div>
                  )}
                  {stageInfo.stage === 'GD4' && (
                    <div style={{ background: 'rgba(100, 116, 139, 0.15)', border: '1px solid #64748b', padding: '16px', borderRadius: '8px', color: '#f1f5f9' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>🏁 Giải đấu đã kết thúc (GD4).</p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        Cảm ơn tất cả các vận động viên và khán giả đã đồng hành cùng giải đấu!
                      </p>
                    </div>
                  )}

                  {/* Registration Form Modal */}
                  {showRegistrationForm && (
                        <div
                          className="reg-modal-backdrop"
                          onClick={() => {
                            setShowRegistrationForm(false);
                            setFormSubmitted(false);
                          }}
                        >
                          <div
                            className="reg-modal-dialog"
                            style={{ maxWidth: '680px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="reg-modal-header">
                              <div className="reg-modal-title-block">
                                <span className="reg-modal-icon">📝</span>
                                <div>
                                  <h3>Đăng Ký: {tournament.name}</h3>
                                  <p>{tournament.participation_type === 'team' ? 'Giải đấu đồng đội' : 'Giải đấu cá nhân (TFT)'}</p>
                                </div>
                              </div>
                              <button
                                className="reg-modal-close"
                                onClick={() => {
                                  setShowRegistrationForm(false);
                                  setFormSubmitted(false);
                                }}
                              >
                                ✕
                              </button>
                            </div>

                            <div className="reg-modal-body">
                              {formSubmitted ? (
                                <div className="reg-success">
                                  <div className="reg-success-icon">🎉</div>
                                  <h3>Đăng Ký Thành Công!</h3>
                                  <p>
                                    Hồ sơ của bạn đã được gửi tới Ban Tổ Chức <strong>{tournament.name}</strong>.
                                    <br />
                                    Bạn có thể xem trạng thái hoặc quản lý đội hình tại tab <strong>&quot;Đơn Đăng Ký Của Tôi&quot;</strong>.
                                  </p>
                                  <button
                                    className="reg-done-btn"
                                    onClick={() => {
                                      setShowRegistrationForm(false);
                                      setFormSubmitted(false);
                                      setActiveTab('my-team');
                                    }}
                                  >
                                    Xem Đơn Của Tôi →
                                  </button>
                                </div>
                              ) : (
                                <form onSubmit={handleSubmitRegistration} className="reg-form">
                                  {/* Section: Thông tin Đội Trưởng / Cá nhân */}
                                  <div className="reg-section-title">
                                    <span>👤</span> Thông Tin Thí Sinh / Đội Trưởng
                                  </div>

                                  <div className="reg-row-2">
                                    <div className="reg-field-group">
                                      <label className="reg-label">
                                        Ingame ID Chính Xác * (Riot ID / Kiện tướng):
                                      </label>
                                      <input
                                        className="reg-input"
                                        type="text"
                                        placeholder="VD: Faker#KR1 hoặc TênKiệnTướng"
                                        value={ingameId}
                                        onChange={(e) => setIngameId(e.target.value)}
                                        required
                                      />
                                    </div>

                                    {tournament.participation_type === 'team' && (
                                      <div className="reg-field-group">
                                        <label className="reg-label">Vị Trí Thi Đấu (Lane) *:</label>
                                        <select
                                          className="reg-input"
                                          value={captainRole}
                                          onChange={(e) => setCaptainRole(e.target.value)}
                                        >
                                          {ROLES.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>

                                  {/* Section: Thông tin Đội Tuyển (Chỉ hiển thị khi là giải đồng đội) */}
                                  {tournament.participation_type === 'team' && (
                                    <>
                                      <div className="reg-section-title">
                                        <span>🛡️</span> Thông Tin Đội Tuyển
                                      </div>

                                      <div className="reg-row-2">
                                        <div className="reg-field-group">
                                          <label className="reg-label">Tên Đội Thi Đấu *:</label>
                                          <input
                                            className="reg-input"
                                            type="text"
                                            placeholder="VD: DUT Warriors"
                                            value={teamName}
                                            onChange={(e) => setTeamName(e.target.value)}
                                            required
                                          />
                                        </div>

                                        <div className="reg-field-group">
                                          <label className="reg-label">Logo / Avatar Đội (URL ảnh):</label>
                                          <input
                                            className="reg-input"
                                            type="url"
                                            placeholder="https://..."
                                            value={teamAvatarUrl}
                                            onChange={(e) => setTeamAvatarUrl(e.target.value)}
                                          />
                                        </div>
                                      </div>

                                      {/* Thành viên hiện có */}
                                      <div className="reg-members-builder">
                                        <label className="reg-label">
                                          Thành Viên Trong Đội (Hiện có: {1 + members.length}/{tournament.max_team_size || 5}):
                                        </label>

                                        <div className="reg-add-member-form">
                                          <input
                                            className="reg-input"
                                            type="text"
                                            placeholder="🔍 Tìm MSSV / Họ tên..."
                                            value={newMemberQuery}
                                            onChange={(e) => {
                                              setNewMemberQuery(e.target.value);
                                              setSelectedCandidate(null);
                                            }}
                                          />

                                          <input
                                            className="reg-input"
                                            type="text"
                                            placeholder="Ingame ID thành viên..."
                                            value={newMemberIngameId}
                                            onChange={(e) => setNewMemberIngameId(e.target.value)}
                                          />

                                          <select
                                            className="reg-input"
                                            value={newMemberRole}
                                            onChange={(e) => setNewMemberRole(e.target.value)}
                                          >
                                            {ROLES.map((r) => (
                                              <option key={r} value={r}>{r}</option>
                                            ))}
                                          </select>

                                          <button
                                            type="button"
                                            className="reg-btn-add-member"
                                            onClick={handleAddMember}
                                          >
                                            + Thêm
                                          </button>
                                        </div>

                                        {/* Candidate Suggestions */}
                                        {memberCandidates.length > 0 && !selectedCandidate && (
                                          <div className="to-candidate-list" style={{ maxHeight: '120px' }}>
                                            {memberCandidates.map((c) => (
                                              <div
                                                key={c.id}
                                                className="to-candidate-item"
                                                onClick={() => {
                                                  setSelectedCandidate(c);
                                                  setNewMemberQuery(`${c.full_name} (${c.student_id || 'SV'})`);
                                                  setMemberCandidates([]);
                                                }}
                                              >
                                                <span>{c.full_name}</span>
                                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>MSSV: {c.student_id}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Table of Members */}
                                        <table className="reg-members-table">
                                          <thead>
                                            <tr>
                                              <th>Vai Trò</th>
                                              <th>Họ và Tên</th>
                                              <th>Ingame ID</th>
                                              <th>Vị Trí</th>
                                              <th>Xóa</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              <td>👑 Đội trưởng</td>
                                              <td>{currentUser?.full_name}</td>
                                              <td><code>{ingameId || 'Chưa nhập'}</code></td>
                                              <td>{captainRole}</td>
                                              <td>-</td>
                                            </tr>
                                            {members.map((m) => (
                                              <tr key={m.participant_id}>
                                                <td>👤 Thành viên</td>
                                                <td>{m.full_name}</td>
                                                <td><code>{m.ingame_id}</code></td>
                                                <td>{m.role_in_team}</td>
                                                <td>
                                                  <button
                                                    type="button"
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                    onClick={() => handleRemoveMember(m.participant_id)}
                                                  >
                                                    ✕
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Chế độ Tuyển Quân */}
                                      <div className="reg-recruiting-box">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#ffffff' }}>
                                          <input
                                            type="checkbox"
                                            checked={isRecruiting}
                                            onChange={(e) => setIsRecruiting(e.target.checked)}
                                          />
                                          <span>📢 Đội chưa đủ người? Bật tuyển quân trên &quot;Chợ Tìm Đồng Đội&quot;</span>
                                        </label>

                                        {isRecruiting && (
                                          <div className="reg-field-group">
                                            <label className="reg-label">Ghi Chú Vị Trí Cần Tuyển *:</label>
                                            <input
                                              className="reg-input"
                                              type="text"
                                              placeholder="VD: Cần 1 Mid, 1 SP rank Cao thủ..."
                                              value={recruitmentNotes}
                                              onChange={(e) => setRecruitmentNotes(e.target.value)}
                                              required={isRecruiting}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}

                                  {/* Section: Dynamic form_schema fields */}
                                  {formSchema.length > 0 && (
                                    <>
                                      <div className="reg-section-title">
                                        <span>📝</span> Câu Hỏi Khảo Sát Bổ Sung
                                      </div>
                                      {formSchema.map((field) => (
                                        <div key={field.id} className="reg-field-group">
                                          <label className="reg-label">
                                            {field.label}
                                            {field.required && <span className="reg-required">*</span>}
                                          </label>
                                          {field.description && (
                                            <p className="reg-field-hint">{field.description}</p>
                                          )}
                                          {field.type === 'textarea' ? (
                                            <textarea
                                              className="reg-input"
                                              value={(dynamicData[field.id] as string) || ''}
                                              onChange={(e) =>
                                                setDynamicData({ ...dynamicData, [field.id]: e.target.value })
                                              }
                                              required={field.required}
                                              rows={3}
                                              placeholder="Nhập câu trả lời..."
                                            />
                                          ) : field.type === 'select' && field.options ? (
                                            <select
                                              className="reg-input"
                                              value={(dynamicData[field.id] as string) || ''}
                                              onChange={(e) =>
                                                setDynamicData({ ...dynamicData, [field.id]: e.target.value })
                                              }
                                              required={field.required}
                                            >
                                              <option value="">-- Chọn --</option>
                                              {String(field.options)
                                                .split(',')
                                                .map((opt) => opt.trim())
                                                .filter(Boolean)
                                                .map((opt) => (
                                                  <option key={opt} value={opt}>
                                                    {opt}
                                                  </option>
                                                ))}
                                            </select>
                                          ) : (
                                            <input
                                              className="reg-input"
                                              type={field.type || 'text'}
                                              value={(dynamicData[field.id] as string) || ''}
                                              onChange={(e) =>
                                                setDynamicData({ ...dynamicData, [field.id]: e.target.value })
                                              }
                                              required={field.required}
                                              placeholder="Nhập câu trả lời..."
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </>
                                  )}

                                  {regError && (
                                    <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px' }}>
                                      ⚠️ {regError}
                                    </div>
                                  )}

                                  <div className="reg-modal-footer">
                                    <button
                                      type="button"
                                      className="reg-btn-cancel"
                                      onClick={() => setShowRegistrationForm(false)}
                                    >
                                      Hủy
                                    </button>
                                    <button type="submit" className="reg-btn-submit" disabled={submittingForm}>
                                      {submittingForm ? '⏳ Đang gửi đăng ký...' : '✅ Xác Nhận Đăng Ký'}
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                </div>
              </div>
            )}

            {/* 2. Recruiting Market Tab */}
            {activeTab === 'recruiting' && tournament.participation_type === 'team' && (
              <div className="tab-pane">
                <RecruitingMarketTab
                  tournament={tournament}
                  currentUser={currentUser}
                  onJoinSuccess={() => setActiveTab('my-team')}
                />
              </div>
            )}

            {/* 3. My Team & Registration Management Tab */}
            {activeTab === 'my-team' && (
              <div className="tab-pane">
                <MyTeamRegistrationTab
                  tournament={tournament}
                  currentUser={currentUser}
                  onRegisterClick={handleRegisterClick}
                />
              </div>
            )}

            {/* 4. Rules Tab */}
            {activeTab === 'rules' && (
              <div className="tab-pane">
                <h3>Điều Lệ Giải Đấu</h3>
                <div className="rules-content">
                  <ol>
                    <li>
                      <strong>Điều Kiện Tham Gia:</strong>
                      <ul>
                        <li>Sinh viên Đại học Bách Khoa - ĐHĐN và các trường thành viên ĐHĐN.</li>
                        <li>Đã hoàn thành xác thực hồ sơ KYC Sinh viên (2 ảnh thẻ SV) được duyệt.</li>
                        <li>Tuân thủ quy chuẩn về Ingame ID và tính trung thực trong thể thao điện tử.</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Quy Tắc Ingame & Thi Đấu:</strong>
                      <ul>
                        <li>Tất cả VĐV phải sử dụng đúng Ingame ID đã đăng ký trong hệ thống.</li>
                        <li>Cấm tuyệt đối hành vi hack/cheat, gian lận, cày thuê hoặc thái độ phi thể thao.</li>
                        <li>Có mặt điểm danh đúng giờ theo lịch trình Ban Tổ Chức công bố.</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Về Quyết Định Của Ban Tổ Chức:</strong>
                      <ul>
                        <li>Trọng tài và Ban Tổ Chức có toàn quyền xử lý khiếu nại và tranh chấp.</li>
                        <li>Quyết định của Ban Tổ Chức là quyết định cuối cùng.</li>
                      </ul>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* 5. FAQ Tab */}
            {activeTab === 'faq' && (
              <div className="tab-pane">
                <h3>Câu Hỏi Thường Gặp</h3>
                <div className="faq-list">
                  <div className="faq-item">
                    <div className="faq-question">❓ Làm sao để tìm đồng đội nếu team tôi thiếu người?</div>
                    <div className="faq-answer">
                      Khi đăng ký, Đội trưởng bật cờ &quot;Tuyển quân&quot;, đội sẽ hiển thị trên tab &quot;Chợ Tuyển Quân&quot; để các bạn sinh viên tự do nộp đơn xin vào đội.
                    </div>
                  </div>
                  <div className="faq-item">
                    <div className="faq-question">❓ Tôi có thể hủy đơn đăng ký sau khi đã nộp không?</div>
                    <div className="faq-answer">
                      Có, bạn có thể vào tab &quot;Đơn Đăng Ký Của Tôi&quot; và bấm &quot;Hủy Đơn Đăng Ký&quot; bất kỳ lúc nào trước khi giải đấu đóng đăng ký.
                    </div>
                  </div>
                  <div className="faq-item">
                    <div className="faq-question">❓ Sinh viên làm CTV Thời vụ có được cấp giấy chứng nhận không?</div>
                    <div className="faq-answer">
                      Có! Các bạn sinh viên có tên trong danh sách Ban Tổ Chức giải đấu được quyền tự xuất Giấy chứng nhận Ban Tổ Chức (Organizer E-Certificate) chính thức sau khi giải hoàn thành.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/')} className="btn-back-home">
            ← Quay lại Trang Chủ
          </button>
          {/* Nút Check-in VĐV (Giải cá nhân TFT) */}
          <button
            type="button"
            className="btn-checkin-tft-highlight"
            onClick={() => {
              const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') : null;
              if (!token && !currentUser) {
                const target = window.location.pathname + '?action=checkin';
                router.push(`/login?redirect=${encodeURIComponent(target)}`);
              } else {
                setShowSoloCheckin(true);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #00f0ff 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0, 240, 255, 0.35)',
            }}
          >
            📸 Check-in VĐV (TFT)
          </button>
          {isRegistrationOpen && (
            <button className="btn-register-primary" onClick={handleRegisterClick}>
              🎮 Đăng Ký Ngay
            </button>
          )}
        </div>
      </div>

      {/* Modal Check-in Giải Cá Nhân (TFT) */}
      {showSoloCheckin && tournament && (
        <SoloCheckinModal
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          currentUser={currentUser}
          onClose={() => setShowSoloCheckin(false)}
        />
      )}
    </div>
  );
}
