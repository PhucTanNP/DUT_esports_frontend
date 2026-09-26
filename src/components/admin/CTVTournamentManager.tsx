'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizerApi } from '../../features/tournaments/api/organizer-api';
import { tournamentAPI } from '../../services/tournament.service';
import type {
  OrganizerRole,
  OrganizerType,
  SafeUser,
  Tournament,
  TournamentOrganizer,
} from '../../types';
import { toDatetimeLocalValue, toISOStringFromLocal } from '../../utils/date';
import TournamentOrganizersTab from './TournamentOrganizersTab';
import TournamentDetailModal from './TournamentDetailModal';
import TournamentCancelModal from './TournamentCancelModal';
import TournamentDetailView from './TournamentDetailView';
import { getTournamentStage } from '../../utils/tournamentStage';
import { AddressSelector } from '../ui';
import {
  DEFAULT_PROVINCE_CODE,
  DEFAULT_WARD_CODE,
  DEFAULT_PROVINCE_NAME,
  DEFAULT_WARD_NAME,
  formatAddress,
  parseAddressString,
} from '../../utils/address';
import '../../styles/admin/CTVTournamentManager.css';

const GAME_CODE_MAP: Record<string, string> = {
  'Liên Quân Mobile': 'LQ.png',
  'League of Legend': 'LOL.png',
  Valorant: 'Valorant.png',
  TFT: 'TFT.jpg',
};

const GAME_LIST = Object.keys(GAME_CODE_MAP);

interface CtvTournamentForm {
  name: string;
  game_name: string;
  participation_type: 'individual' | 'team';
  max_participants: number;
  min_team_size: number;
  max_team_size: number;
  banner_url: string;
  location: string;
  location_province?: string;
  location_province_code?: string;
  location_ward?: string;
  location_ward_code?: string;
  location_specific?: string;
  registration_open_at: string;
  registration_close_at: string;
  start_at: string;
  end_at: string;
  description: string;
  use_external_link: boolean;
  external_registration_url: string;
}

const emptyForm: CtvTournamentForm = {
  name: '',
  game_name: '',
  participation_type: 'team',
  max_participants: 16,
  min_team_size: 5,
  max_team_size: 7,
  banner_url: '',
  location: '',
  location_province: DEFAULT_PROVINCE_NAME,
  location_province_code: DEFAULT_PROVINCE_CODE,
  location_ward: DEFAULT_WARD_NAME,
  location_ward_code: DEFAULT_WARD_CODE,
  location_specific: '',
  registration_open_at: '',
  registration_close_at: '',
  start_at: '',
  end_at: '',
  description: '',
  use_external_link: false,
  external_registration_url: '',
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'completed' | 'cancelled';
type MainTab = 'tournaments' | 'organizers';

export default function CTVTournamentManager() {
  const router = useRouter();
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('tournaments');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewingDetailTournamentId, setViewingDetailTournamentId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [orgModalTournament, setOrgModalTournament] = useState<Tournament | null>(null);
  const [form, setForm] = useState<CtvTournamentForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Tab "Ban Tổ Chức" State
  const [selectedOrgTournamentId, setSelectedOrgTournamentId] = useState<string>('');
  const [organizers, setOrganizers] = useState<TournamentOrganizer[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Form Thêm BTC State
  const [addOrgType, setAddOrgType] = useState<OrganizerType>('seasonal');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<SafeUser[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<SafeUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrganizerRole>('seasonal_staff');
  const [customTitle, setCustomTitle] = useState('CTV Điểm danh & Điều phối');
  const [isAddingOrg, setIsAddingOrg] = useState(false);

  // Tournament Detail & Cancel Modal States
  const [detailModalTournament, setDetailModalTournament] = useState<Tournament | null>(null);
  const [cancelModalTournament, setCancelModalTournament] = useState<Tournament | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelTournament = async () => {
    if (!cancelModalTournament) return;
    try {
      setIsCancelling(true);
      setError(null);
      const res = await tournamentAPI.cancel(cancelModalTournament.id);
      if (res.success) {
        setSuccessMessage(`✅ Đã hủy giải đấu "${cancelModalTournament.name}" thành công!`);
        setCancelModalTournament(null);
        void loadTournaments();
      } else {
        setError(res.message || 'Không thể hủy giải đấu');
      }
    } catch (err) {
      setError('Lỗi kết nối khi hủy giải: ' + (err as Error).message);
    } finally {
      setIsCancelling(false);
    }
  };

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await tournamentAPI.getMine();

      if (result.success) {
        let filtered = result.data || [];
        if (filterStatus !== 'all') {
          filtered = filtered.filter((t) => t.status === filterStatus);
        }
        if (search) {
          filtered = filtered.filter(
            (t) =>
              t.name.toLowerCase().includes(search.toLowerCase()) ||
              t.game_name.toLowerCase().includes(search.toLowerCase()),
          );
        }
        setTournaments(filtered);
        setPagination({ total: filtered.length, pages: Math.ceil(filtered.length / 10) });

        // Auto select first tournament for organizers tab if not yet set
        if (!selectedOrgTournamentId && filtered.length > 0) {
          setSelectedOrgTournamentId(filtered[0].id);
        }
      } else {
        setError(result.message || 'Lỗi khi tải dữ liệu');
      }
    } catch (err) {
      console.error('Load tournaments error:', err);
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizers = async (tournamentId: string) => {
    if (!tournamentId) return;
    try {
      setOrgLoading(true);
      setOrgError(null);
      const res = await organizerApi.getOrganizersByTournament(tournamentId);
      if (res.success && res.data) {
        setOrganizers(res.data);
      } else {
        setOrgError(res.message || 'Không thể tải danh sách Ban Tổ Chức');
      }
    } catch (err) {
      setOrgError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setOrgLoading(false);
    }
  };

  // Load tournaments on mount and when filters change
  useEffect(() => {
    void (async () => {
      await loadTournaments();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStatus, page]);

  // Load organizers when selected tournament changes in organizers tab
  useEffect(() => {
    if (activeMainTab === 'organizers' && selectedOrgTournamentId) {
      loadOrganizers(selectedOrgTournamentId);
    }
  }, [selectedOrgTournamentId, activeMainTab]);

  // Candidate search with debounce
  useEffect(() => {
    if (!candidateQuery.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        if (addOrgType === 'permanent') {
          const res = await organizerApi.getCandidateUsers(candidateQuery);
          if (res.success && res.data) setCandidates(res.data);
        } else {
          const res = await organizerApi.getCandidateParticipants(candidateQuery);
          if (res.success && res.data) setCandidates(res.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [candidateQuery, addOrgType]);

  const handleAddOrganizerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgTournamentId) {
      alert('Vui lòng chọn giải đấu trước');
      return;
    }
    if (!selectedCandidate) {
      alert('Vui lòng tìm và chọn một ứng viên');
      return;
    }

    try {
      setIsAddingOrg(true);
      const payload = {
        organizer_type: addOrgType,
        user_id: addOrgType === 'permanent' ? selectedCandidate.id : undefined,
        participant_id: addOrgType === 'seasonal' ? selectedCandidate.id : undefined,
        role: selectedRole,
        custom_title: customTitle.trim() || undefined,
      };
      const res = await organizerApi.addOrganizer(selectedOrgTournamentId, payload);
      if (res.success) {
        alert('✅ Đã gán thành viên vào Ban Tổ Chức thành công!');
        setSelectedCandidate(null);
        setCandidateQuery('');
        loadOrganizers(selectedOrgTournamentId);
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể gán thành viên'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsAddingOrg(false);
    }
  };

  const handleRemoveOrganizer = async (organizerId: string, name: string) => {
    if (!confirm(`Xác nhận xóa "${name}" khỏi Ban Tổ Chức?`)) return;
    try {
      const res = await organizerApi.removeOrganizer(selectedOrgTournamentId, organizerId);
      if (res.success) {
        loadOrganizers(selectedOrgTournamentId);
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể xóa'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.name || !form.game_name || !form.banner_url) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setIsSaving(true);
    try {
      const fullLocation = formatAddress({
        province_code: form.location_province_code,
        ward_code: form.location_ward_code,
        province_name: form.location_province,
        ward_name: form.location_ward,
        detailed_address: form.location_specific,
      });

      const submitPayload = {
        ...form,
        location: fullLocation || undefined,
        registration_open_at: toISOStringFromLocal(form.registration_open_at),
        registration_close_at: toISOStringFromLocal(form.registration_close_at),
        start_at: toISOStringFromLocal(form.start_at),
        end_at: toISOStringFromLocal(form.end_at),
      };

      let result;
      if (editingTournament) {
        result = await tournamentAPI.update(editingTournament.id, submitPayload);
      } else {
        result = await tournamentAPI.create(submitPayload);
      }

      if (result.success) {
        setSuccessMessage(editingTournament ? 'Cập nhật thành công!' : 'Tạo giải đấu thành công!');
        setShowModal(false);
        setEditingTournament(null);
        setForm(emptyForm);
        await loadTournaments();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.message || 'Lỗi khi lưu');
      }
    } catch (err) {
      console.error('Submit tournament error:', err);
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const openAdd = () => {
    setEditingTournament(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (tournament: Tournament) => {
    const locParsed = parseAddressString(tournament.location);
    setEditingTournament(tournament);
    setForm({
      name: tournament.name,
      game_name: tournament.game_name,
      participation_type: tournament.participation_type,
      max_participants: tournament.max_participants,
      min_team_size: tournament.min_team_size || 5,
      max_team_size: tournament.max_team_size || 7,
      banner_url: tournament.banner_url,
      location: tournament.location || '',
      location_province: locParsed.province_name,
      location_province_code: locParsed.province_code,
      location_ward: locParsed.ward_name,
      location_ward_code: locParsed.ward_code,
      location_specific: locParsed.detailed_address,
      registration_open_at: toDatetimeLocalValue(tournament.registration_open_at),
      registration_close_at: toDatetimeLocalValue(tournament.registration_close_at),
      start_at: toDatetimeLocalValue(tournament.start_at),
      end_at: toDatetimeLocalValue(tournament.end_at),
      description: tournament.description || '',
      use_external_link: tournament.use_external_link || false,
      external_registration_url: tournament.external_registration_url || '',
    });
    setShowModal(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const pagedTournaments = tournaments.slice((page - 1) * 10, page * 10);

  if (viewingDetailTournamentId) {
    return (
      <div className="ctv-tournament-manager">
        <TournamentDetailView
          tournamentId={viewingDetailTournamentId}
          onBack={() => setViewingDetailTournamentId(null)}
        />
      </div>
    );
  }

  return (
    <div className="ctv-tournament-manager">
      {/* Main Tab Navigation */}
      <div className="ctv-main-tabs">
        <button
          className={`ctv-main-tab-btn ${activeMainTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('tournaments')}
        >
          🎮 Giải Đấu Của Tôi ({tournaments.length})
        </button>
        <button
          className={`ctv-main-tab-btn ${activeMainTab === 'organizers' ? 'active' : ''}`}
          onClick={() => {
            setActiveMainTab('organizers');
            if (selectedOrgTournamentId) {
              loadOrganizers(selectedOrgTournamentId);
            } else if (tournaments.length > 0) {
              setSelectedOrgTournamentId(tournaments[0].id);
              loadOrganizers(tournaments[0].id);
            }
          }}
        >
          🛡️ Phân Quyền Ban Tổ Chức
        </button>
      </div>

      {/* Messages */}
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* TAB 1: DANH SÁCH GIẢI ĐẤU */}
      {activeMainTab === 'tournaments' && (
        <>
          <div className="manager-header">
            <h2>🎮 Danh Sách Giải Đấu Do Tôi Phụ Trách</h2>
            <button className="btn-add-tournament" onClick={openAdd}>
              ➕ Tạo Giải Đấu Mới
            </button>
          </div>

          {/* Search and Filter */}
          <div className="manager-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm giải đấu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-buttons">
              {[
                { value: 'all', label: '📋 Tất Cả' },
                { value: 'pending', label: '⏳ Chờ Duyệt' },
                { value: 'approved', label: '✅ Đã Duyệt' },
              ].map((btn) => (
                <button
                  key={btn.value}
                  className={`filter-btn ${filterStatus === btn.value ? 'active' : ''}`}
                  onClick={() => setFilterStatus(btn.value as FilterStatus)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tournaments List */}
          {loading ? (
            <div className="loading">⏳ Đang tải...</div>
          ) : tournaments.length === 0 ? (
            <div className="empty-state">
              <p>📭 Chưa có giải đấu nào</p>
            </div>
          ) : (
            <div className="tournaments-grid">
              {pagedTournaments.map((tournament) => {
                const isEnded = Boolean(tournament.end_at && new Date() >= new Date(tournament.end_at));
                const isCancelled = tournament.status === 'cancelled';
                const isCompleted = tournament.status === 'completed';
                const canMutate = !isEnded && !isCancelled && !isCompleted;
                const stageInfo = getTournamentStage(tournament);

                return (
                  <div
                    key={tournament.id}
                    className={`tournament-card ${isEnded ? 'is-ended' : ''} ${isCancelled ? 'is-cancelled' : ''}`}
                  >
                    {/* Banner Truyền Thông 16:9 */}
                    <div className="card-media-banner">
                      {tournament.banner_url ? (
                        <img
                          src={tournament.banner_url}
                          alt={tournament.name}
                          className="banner-image-preview"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const fb = e.currentTarget.parentElement?.querySelector('.banner-media-fallback');
                            if (fb) (fb as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="banner-media-fallback"
                        style={{ display: tournament.banner_url ? 'none' : 'flex' }}
                      >
                        <span className="fallback-game-name">🎮 {tournament.game_name}</span>
                        <span className="fallback-tour-name">{tournament.name}</span>
                      </div>

                      <div className="banner-overlay-top">
                        <span className="banner-game-badge">🎮 {tournament.game_name}</span>
                        <span
                          className="banner-stage-badge"
                          style={{ backgroundColor: stageInfo.badgeColor + 'e0' }}
                        >
                          {stageInfo.badgeText}
                        </span>
                      </div>

                      <div className="banner-overlay-bottom">
                        <code className="banner-code-badge">{tournament.code}</code>
                      </div>
                    </div>

                    <div className="card-body">
                      <h3 className="card-tournament-title" title={tournament.name}>
                        {tournament.name}
                      </h3>

                      <div className="info-row">
                        <span className="label">Hình thức:</span>
                        <span>
                          {tournament.participation_type === 'team'
                            ? `Đội (${tournament.min_team_size || 1}-${tournament.max_team_size || 5} TV)`
                            : 'Cá nhân'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Quy mô:</span>
                        <span>
                          {tournament.max_participants}{' '}
                          {tournament.participation_type === 'team' ? 'đội' : 'người'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Bắt đầu:</span>
                        <span>{formatDate(tournament.start_at)}</span>
                      </div>
                      <div className={`info-row ${isEnded ? 'ended-info-row' : ''}`}>
                        <span className="label">Kết thúc:</span>
                        <span>
                          {formatDate(tournament.end_at)}
                          {isEnded && <span className="ended-indicator"> (Hết hạn)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Bộ 3 Nút Hành Động Chuẩn Hoá: Chi tiết, Hủy, Chỉnh sửa */}
                    <div className="card-actions">
                      <div className="primary-actions-row">
                        <button
                          type="button"
                          className="btn-action btn-detail"
                          onClick={() => setViewingDetailTournamentId(tournament.id)}
                          title="Xem chi tiết giải đấu trên Dashboard"
                        >
                          🔍 Chi tiết
                        </button>

                        <button
                          type="button"
                          className={`btn-action btn-cancel ${!canMutate ? 'is-disabled' : ''}`}
                          disabled={!canMutate}
                          onClick={() => setCancelModalTournament(tournament)}
                          title={
                            isEnded
                              ? `Không thể hủy: Giải đấu đã qua ngày kết thúc (${formatDate(tournament.end_at)})`
                              : isCancelled
                                ? 'Giải đấu đã được hủy'
                                : isCompleted
                                  ? 'Giải đấu đã hoàn thành'
                                  : 'Hủy giải đấu này'
                          }
                        >
                          🚫 Hủy
                        </button>

                        <button
                          type="button"
                          className={`btn-action btn-edit ${!canMutate ? 'is-disabled' : ''}`}
                          disabled={!canMutate}
                          onClick={() => void openEdit(tournament)}
                          title={
                            isEnded
                              ? `Không thể chỉnh sửa: Giải đấu đã qua ngày kết thúc (${formatDate(tournament.end_at)})`
                              : isCancelled
                                ? 'Không thể chỉnh sửa giải đấu đã bị hủy'
                                : isCompleted
                                  ? 'Không thể chỉnh sửa giải đấu đã hoàn thành'
                                  : 'Chỉnh sửa thông tin giải đấu'
                          }
                        >
                          ✏️ Chỉnh sửa
                        </button>
                      </div>

                      {/* Lối tắt quản lý Ban Tổ Chức */}
                      <button
                        type="button"
                        className="btn-sub-org"
                        onClick={() => {
                          setSelectedOrgTournamentId(tournament.id);
                          setActiveMainTab('organizers');
                          loadOrganizers(tournament.id);
                        }}
                        title="Quản lý Ban Tổ Chức"
                      >
                        🛡️ Phân Quyền Ban Tổ Chức
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>← Trước</button>
              <span>Trang {page}/{pagination.pages}</span>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages || loading}>Sau →</button>
            </div>
          )}
        </>
      )}

      {/* TAB 2: BAN TỔ CHỨC GIẢI */}
      {activeMainTab === 'organizers' && (
        <div className="ctv-org-panel">
          <div className="manager-header" style={{ marginBottom: '12px' }}>
            <h2>🛡️ Quản Lý Phân Quyền Ban Tổ Chức</h2>
          </div>

          {/* Tournament Selector */}
          <div className="ctv-org-select-box">
            <label>🎯 Chọn Giải Đấu Cần Phân Quyền:</label>
            <select
              className="ctv-org-select"
              value={selectedOrgTournamentId}
              onChange={(e) => {
                setSelectedOrgTournamentId(e.target.value);
                loadOrganizers(e.target.value);
              }}
            >
              {tournaments.length === 0 && <option value="">(Chưa có giải đấu)</option>}
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.game_name} • {t.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'})
                </option>
              ))}
            </select>
          </div>

          {/* Form Thêm Thành Viên BTC */}
          <div className="ctv-org-add-card">
            <h4>➕ Gán Thành Viên Ban Tổ Chức Mới</h4>

            <div className="ctv-org-type-toggle">
              <button
                type="button"
                className={`ctv-org-type-btn ${addOrgType === 'seasonal' ? 'active' : ''}`}
                onClick={() => {
                  setAddOrgType('seasonal');
                  setSelectedCandidate(null);
                  setCandidateQuery('');
                  setSelectedRole('seasonal_staff');
                  setCustomTitle('CTV Điểm danh & Điều phối');
                }}
              >
                🎓 CTV Thời Vụ (Sinh Viên DUT - KYC approved)
              </button>
              <button
                type="button"
                className={`ctv-org-type-btn ${addOrgType === 'permanent' ? 'active' : ''}`}
                onClick={() => {
                  setAddOrgType('permanent');
                  setSelectedCandidate(null);
                  setCandidateQuery('');
                  setSelectedRole('co_organizer');
                  setCustomTitle('Đồng Trưởng BTC');
                }}
              >
                👥 CTV Thường Trực
              </button>
            </div>

            <form onSubmit={handleAddOrganizerSubmit} className="ctv-org-form-grid">
              <div className="ctv-org-input-group">
                <label>
                  {addOrgType === 'seasonal'
                    ? '🔍 Tìm kiếm Sinh viên (MSSV / Họ tên):'
                    : '🔍 Tìm kiếm CTV Thường trực (Tên / Email):'}
                </label>
                <input
                  type="text"
                  className="ctv-org-input"
                  placeholder={addOrgType === 'seasonal' ? 'VD: 102220..., Nguyễn Văn A...' : 'VD: ctv1, email@...'}
                  value={candidateQuery}
                  onChange={(e) => {
                    setCandidateQuery(e.target.value);
                    setSelectedCandidate(null);
                  }}
                  required
                />
                {candidates.length > 0 && !selectedCandidate && (
                  <div className="ctv-org-candidates-popup">
                    {candidates.map((c) => (
                      <div
                        key={c.id}
                        className="ctv-org-candidate-item"
                        onClick={() => {
                          setSelectedCandidate(c);
                          setCandidateQuery(
                            addOrgType === 'seasonal'
                              ? `${c.full_name} (MSSV: ${c.student_id || 'SV'})`
                              : `${c.full_name} (${c.email || ''})`,
                          );
                          setCandidates([]);
                        }}
                      >
                        <strong>{c.full_name}</strong>
                        <span style={{ color: '#718096' }}>
                          {addOrgType === 'seasonal' ? `MSSV: ${c.student_id || 'N/A'}` : c.email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ctv-org-input-group">
                <label>Vai Trò Trong Giải Đấu:</label>
                <select
                  className="ctv-org-select-input"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as OrganizerRole)}
                >
                  {addOrgType === 'permanent' ? (
                    <>
                      <option value="lead_organizer">👑 Trưởng Ban Tổ Chức</option>
                      <option value="co_organizer">🤝 Đồng Trưởng Ban</option>
                      <option value="referee">⚖️ Trọng Tài Thi Đấu</option>
                      <option value="support_staff">🛠️ Ban Kỹ Thuật</option>
                    </>
                  ) : (
                    <>
                      <option value="seasonal_staff">📋 CTV Thời Vụ (Điểm Danh / Check-in)</option>
                      <option value="referee">⚖️ Trọng Tài Bàn</option>
                      <option value="support_staff">🛠️ Hỗ Trợ Kỹ Thuật & Phòng Thi Đấu</option>
                    </>
                  )}
                </select>
              </div>

              <div className="ctv-org-input-group">
                <label>Chức Danh Tùy Biến (E-Certificate):</label>
                <input
                  type="text"
                  className="ctv-org-input"
                  placeholder="VD: CTV Điểm danh & Điều phối phòng máy"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="ctv-btn-add-org"
                disabled={!selectedCandidate || isAddingOrg}
              >
                {isAddingOrg ? '⏳ Đang gán...' : '➕ Gán Thành Viên BTC'}
              </button>
            </form>
          </div>

          {/* Bảng Danh Sách BTC */}
          {orgError && <div className="alert alert-error">{orgError}</div>}

          <div className="ctv-org-table-wrapper">
            {orgLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
                ⏳ Đang tải danh sách Ban Tổ Chức...
              </div>
            ) : organizers.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
                📭 Giải đấu này chưa có thành viên Ban Tổ Chức nào.
              </div>
            ) : (
              <table className="ctv-org-table">
                <thead>
                  <tr>
                    <th>Thành Viên</th>
                    <th>Phân Loại</th>
                    <th>Vai Trò & Chức Danh</th>
                    <th>Người Gán</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {organizers.map((org) => {
                    const isSeasonal = org.organizer_type === 'seasonal';
                    const name = isSeasonal ? org.participant_name : org.user_name;
                    const sub = isSeasonal ? `MSSV: ${org.student_id || 'N/A'}` : org.user_email;
                    return (
                      <tr key={org.id}>
                        <td>
                          <strong>{name || 'Chưa rõ tên'}</strong>
                          <div style={{ fontSize: '11px', color: '#718096' }}>{sub}</div>
                        </td>
                        <td>
                          <span className={`ctv-org-badge ${org.organizer_type}`}>
                            {org.organizer_type === 'permanent' ? '🛡️ Thường Trực' : '🎓 Thời Vụ (SV)'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#d97706' }}>{org.role}</strong>
                          {org.custom_title && (
                            <div style={{ fontSize: '12px', color: '#4a5568' }}>
                              &quot;{org.custom_title}&quot;
                            </div>
                          )}
                        </td>
                        <td>{org.assigned_by_name || 'Hệ thống'}</td>
                        <td>
                          <button
                            className="ctv-btn-del-org"
                            onClick={() => handleRemoveOrganizer(org.id, name || 'thành viên')}
                          >
                            🗑️ Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal Form Tạo/Sửa Giải */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTournament ? '✏️ Chỉnh Sửa Giải Đấu' : '➕ Tạo Giải Đấu Mới'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-col">
                  <label>Tên Giải Đấu *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Giải Đấu Liên Quân"
                    required
                  />
                </div>
                <div className="form-col">
                  <label>Trò Chơi *</label>
                  <select
                    value={form.game_name}
                    onChange={(e) => setForm({ ...form, game_name: e.target.value })}
                    required
                  >
                    <option value="">Chọn trò chơi</option>
                    {GAME_LIST.map((game) => (
                      <option key={game} value={game}>{game}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-col">
                  <label>Loại Tham Gia *</label>
                  <select
                    value={form.participation_type}
                    onChange={(e) => setForm({ ...form, participation_type: e.target.value as 'individual' | 'team' })}
                  >
                    <option value="individual">Cá Nhân</option>
                    <option value="team">Đội Tuyển</option>
                  </select>
                </div>
                <div className="form-col">
                  <label>Số Người Tối Đa *</label>
                  <input
                    type="number"
                    value={form.max_participants}
                    onChange={(e) => setForm({ ...form, max_participants: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                </div>
              </div>

              {form.participation_type === 'team' && (
                <div className="form-row">
                  <div className="form-col">
                    <label>Kích Thước Đội Tối Thiểu</label>
                    <input
                      type="number"
                      value={form.min_team_size}
                      onChange={(e) => setForm({ ...form, min_team_size: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>
                  <div className="form-col">
                    <label>Kích Thước Đội Tối Đa</label>
                    <input
                      type="number"
                      value={form.max_team_size}
                      onChange={(e) => setForm({ ...form, max_team_size: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-col" style={{ width: '100%' }}>
                  <label>Banner *</label>
                  <input
                    type="url"
                    value={form.banner_url}
                    onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>
              </div>

              {/* Module Địa Điểm 3 Cấp: Tỉnh/TP (34 tỉnh), Phường/Xã/Đặc khu (3.321 đơn vị), Địa chỉ cụ thể */}
              <AddressSelector
                value={{
                  province_code: form.location_province_code || DEFAULT_PROVINCE_CODE,
                  ward_code: form.location_ward_code || DEFAULT_WARD_CODE,
                  detailed_address: form.location_specific || '',
                  province_name: form.location_province,
                  ward_name: form.location_ward,
                }}
                onChange={(addr) => {
                  setForm((prev) => ({
                    ...prev,
                    location_province_code: addr.province_code,
                    location_ward_code: addr.ward_code,
                    location_province: addr.province_name,
                    location_ward: addr.ward_name,
                    location_specific: addr.detailed_address,
                    location: addr.formatted_address || '',
                  }));
                }}
                required
                title="📍 Địa Điểm Tổ Chức Thi Đấu"
              />

              <div className="form-row">
                <div className="form-col">
                  <label>Ngày Đăng Ký Mở</label>
                  <input
                    type="datetime-local"
                    value={form.registration_open_at}
                    onChange={(e) => setForm({ ...form, registration_open_at: e.target.value })}
                  />
                </div>
                <div className="form-col">
                  <label>Ngày Đăng Ký Đóng</label>
                  <input
                    type="datetime-local"
                    value={form.registration_close_at}
                    onChange={(e) => setForm({ ...form, registration_close_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-col">
                  <label>Ngày Bắt Đầu</label>
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                  />
                </div>
                <div className="form-col">
                  <label>Ngày Kết Thúc</label>
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mô Tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả giải đấu..."
                  rows={3}
                />
              </div>


              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.use_external_link}
                    onChange={(e) => setForm({ ...form, use_external_link: e.target.checked })}
                  />
                  <span>Dùng liên kết ngoài cho form đăng ký</span>
                </label>
                {form.use_external_link && (
                  <input
                    type="url"
                    value={form.external_registration_url}
                    onChange={(e) => setForm({ ...form, external_registration_url: e.target.value })}
                    placeholder="https://..."
                    className="external-url-input"
                  />
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-submit" disabled={isSaving}>
                  {isSaving ? '⏳ Đang lưu...' : editingTournament ? '💾 Cập Nhật' : '✅ Tạo Giải'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ban Tổ Chức Giải (nếu mở từ nơi khác) */}
      {orgModalTournament && (
        <div className="modal-overlay" onClick={() => setOrgModalTournament(null)}>
          <div className="modal" style={{ maxWidth: '950px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ban Tổ Chức Giải Đấu</h3>
              <button className="close-btn" onClick={() => setOrgModalTournament(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <TournamentOrganizersTab tournament={orgModalTournament} onClose={() => setOrgModalTournament(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Toàn Diện Giải Đấu */}
      <TournamentDetailModal
        tournament={detailModalTournament}
        isOpen={Boolean(detailModalTournament)}
        onClose={() => setDetailModalTournament(null)}
        onManageOrganizers={(t) => {
          setSelectedOrgTournamentId(t.id);
          setActiveMainTab('organizers');
          loadOrganizers(t.id);
        }}
      />

      {/* Modal Xác Nhận Hủy Giải Đấu */}
      <TournamentCancelModal
        tournament={cancelModalTournament}
        isOpen={Boolean(cancelModalTournament)}
        isCancelling={isCancelling}
        onConfirm={handleCancelTournament}
        onClose={() => setCancelModalTournament(null)}
      />
    </div>
  );
}
