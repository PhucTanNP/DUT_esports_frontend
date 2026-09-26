'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { API_ORIGIN, AVAILABLE_GAMES, getLogoUrl } from '../../config/constants';
import { registrationAPI } from '../../services/registration.service';
import { tournamentAPI } from '../../services/tournament.service';
import { organizerApi } from '../../features/tournaments/api/organizer-api';
import { getAuthToken, getAuthenticatedImageUrl } from '../../services/http';
import type { FormField, Registration, RegistrationMemberDetail, SafeUser, Tournament, TournamentParticipantListResponseDTO, UserRole } from '../../types';
import { formatDateTime } from '../../utils/format';
import { toDatetimeLocalValue, toISOStringFromLocal } from '../../utils/date';
import { parseFormSchema, parseSubmittedData } from '../../utils/formSchema';
import BannerCropModal from './BannerCropModal';
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
import '../../styles/admin/TournamentManager.css';

interface TournamentManagerProps {
  userRole?: UserRole;
}

type TabId = 'list' | 'pending';

interface TournamentForm {
  name: string;
  game_name: string;
  game_logo_url: string;
  banner_url: string;
  location: string;
  location_province?: string;
  location_province_code?: string;
  location_ward?: string;
  location_ward_code?: string;
  location_specific?: string;
  prize_pool: number;
  participation_type: 'individual' | 'team';
  max_participants: number;
  min_team_size: number | '';
  max_team_size: number | '';
  registration_open_at: string;
  registration_close_at: string;
  start_at: string;
  end_at: string;
  description: string;
  use_external_link: boolean;
  external_registration_url: string;
  form_schema: FormField[];
}

const FIELD_TYPES = [
  { value: 'text', label: '🔤 Văn bản ngắn' },
  { value: 'textarea', label: '📝 Văn bản dài' },
  { value: 'email', label: '✉️ Email' },
  { value: 'number', label: '🔢 Số' },
  { value: 'file', label: '📎 Upload ảnh/file' },
  { value: 'select', label: '📋 Đa lựa chọn' },
] as const;

const emptyForm: TournamentForm = {
  name: '',
  game_name: '',
  game_logo_url: '',
  banner_url: '',
  location: '',
  location_province: DEFAULT_PROVINCE_NAME,
  location_province_code: DEFAULT_PROVINCE_CODE,
  location_ward: DEFAULT_WARD_NAME,
  location_ward_code: DEFAULT_WARD_CODE,
  location_specific: '',
  prize_pool: 0,
  participation_type: 'individual',
  max_participants: 16,
  min_team_size: '',
  max_team_size: '',
  registration_open_at: '',
  registration_close_at: '',
  start_at: '',
  end_at: '',
  description: '',
  use_external_link: false,
  external_registration_url: '',
  form_schema: [],
};

interface SeasonalSelection {
  participant_id: string;
  full_name: string;
  student_id: string;
  custom_title: string;
}

export default function TournamentManager({ userRole }: TournamentManagerProps) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [pendingTournaments, setPendingTournaments] = useState<Tournament[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<TabId>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<string | null>(null);
  const [approveStatus, setApproveStatus] = useState<'approved' | 'rejected'>('approved');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropFileName, setCropFileName] = useState<string>('banner.jpg');

  // Organizers in modal state
  const [candidateUsers, setCandidateUsers] = useState<SafeUser[]>([]);
  const [selectedPermanentUserIds, setSelectedPermanentUserIds] = useState<string[]>([]);
  const [seasonalSearchQuery, setSeasonalSearchQuery] = useState('');
  const [seasonalCandidates, setSeasonalCandidates] = useState<SafeUser[]>([]);
  const [seasonalTitleInput, setSeasonalTitleInput] = useState('CTV Điểm danh');
  const [selectedSeasonalList, setSelectedSeasonalList] = useState<SeasonalSelection[]>([]);

  // Registrations modal state
  const [regModalTournament, setRegModalTournament] = useState<Tournament | null>(null);
  const [orgModalTournament, setOrgModalTournament] = useState<Tournament | null>(null);
  const [selectedTournamentSchema, setSelectedTournamentSchema] = useState<FormField[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regFilterStatus, setRegFilterStatus] = useState('all');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [viewingReg, setViewingReg] = useState<Registration | null>(null);
  const [viewingMemberDetail, setViewingMemberDetail] = useState<RegistrationMemberDetail | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  // Phase 9 Participant Management State
  const [participantsData, setParticipantsData] = useState<TournamentParticipantListResponseDTO | null>(null);
  const [activeRegSubTab, setActiveRegSubTab] = useState<'registrations' | 'participants'>('participants');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // Tournament Detail & Cancel Modal States
  const [detailModalTournament, setDetailModalTournament] = useState<Tournament | null>(null);
  const [viewingDetailTournamentId, setViewingDetailTournamentId] = useState<string | null>(null);
  const [cancelModalTournament, setCancelModalTournament] = useState<Tournament | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await tournamentAPI.getAll(search, filterStatus === 'all' ? '' : filterStatus);
      if (result.success) {
        // Lấy tất cả các giải không phải pending (vì pending nằm ở tab Chờ Duyệt)
        const nonPending = (result.data ?? []).filter((t) => t.status !== 'pending');
        setTournaments(nonPending);
      } else {
        setError(result.message || 'Không thể tải danh sách giải đấu');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTournament = async () => {
    if (!cancelModalTournament) return;
    try {
      setIsCancelling(true);
      setError('');
      const res = await tournamentAPI.cancel(cancelModalTournament.id);
      if (res.success) {
        setSuccess(`✅ Đã hủy giải đấu "${cancelModalTournament.name}" thành công!`);
        setCancelModalTournament(null);
        void fetchTournaments();
      } else {
        setError(res.message || 'Không thể hủy giải đấu');
      }
    } catch (err) {
      setError('Lỗi kết nối khi hủy giải: ' + (err as Error).message);
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchPendingTournaments = async () => {
    try {
      const result = await tournamentAPI.getPending();
      if (result.success) {
        setPendingTournaments(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching pending tournaments:', err);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchTournaments();
      if (userRole === 'admin') {
        await fetchPendingTournaments();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStatus, userRole]);

  const handleBannerUpload = async (file?: File) => {
    if (!file) return;
    setBannerUploading(true);
    try {
      const token = getAuthToken();
      const fd = new FormData();
      fd.append('banner', file);
      const res = await fetch(`${API_ORIGIN}/api/upload/banner`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = (await res.json()) as { success: boolean; url?: string; message?: string };
      if (data.success && data.url) {
        setForm((f) => ({ ...f, banner_url: data.url as string }));
      } else {
        setError('Upload thất bại: ' + (data.message || ''));
      }
    } catch (err) {
      setError('Lỗi upload: ' + (err as Error).message);
    } finally {
      setBannerUploading(false);
    }
  };

  const onSelectBannerFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setCropImageSrc(reader.result as string);
        setCropFileName(file.name);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const filtered = tournaments.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.game_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Tải danh sách CTV Thường Trực khi mở modal và nạp organizers hiện tại nếu sửa giải
  useEffect(() => {
    if (!showModal) return;

    void (async () => {
      try {
        const res = await organizerApi.getCandidateUsers();
        if (res.success && res.data) {
          setCandidateUsers(res.data);
        }
      } catch (err) {
        console.error('Failed to load candidate users:', err);
      }
    })();

    if (editingId) {
      void (async () => {
        try {
          const res = await organizerApi.getOrganizersByTournament(editingId);
          if (res.success && res.data) {
            const permIds: string[] = [];
            const seasonals: SeasonalSelection[] = [];
            res.data.forEach((org) => {
              if (org.organizer_type === 'permanent' && org.user_id) {
                permIds.push(org.user_id);
              } else if (org.organizer_type === 'seasonal' && org.participant_id) {
                seasonals.push({
                  participant_id: org.participant_id,
                  full_name: org.participant_name || 'Sinh viên',
                  student_id: org.student_id || 'N/A',
                  custom_title: org.custom_title || 'CTV Điểm danh',
                });
              }
            });
            setSelectedPermanentUserIds(permIds);
            setSelectedSeasonalList(seasonals);
          }
        } catch (err) {
          console.error('Failed to load existing organizers:', err);
        }
      })();
    } else {
      setSelectedPermanentUserIds([]);
      setSelectedSeasonalList([]);
    }
  }, [showModal, editingId]);

  // Tìm kiếm sinh viên CTV Thời vụ theo MSSV/Tên (debounce)
  useEffect(() => {
    if (!seasonalSearchQuery.trim()) {
      setSeasonalCandidates([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await organizerApi.getCandidateParticipants(seasonalSearchQuery.trim());
        if (res.success && res.data) {
          setSeasonalCandidates(res.data);
        }
      } catch (err) {
        console.error('Search seasonal candidate error:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [seasonalSearchQuery]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSelectedPermanentUserIds([]);
    setSelectedSeasonalList([]);
    setShowModal(true);
  };

  const openEdit = (t: Tournament) => {
    const locParsed = parseAddressString(t.location);
    setForm({
      name: t.name,
      game_name: t.game_name,
      game_logo_url: t.game_logo_url || '',
      banner_url: t.banner_url || '',
      location: t.location || '',
      location_province: locParsed.province_name,
      location_province_code: locParsed.province_code,
      location_ward: locParsed.ward_name,
      location_ward_code: locParsed.ward_code,
      location_specific: locParsed.detailed_address,
      prize_pool: t.prize_pool || 0,
      participation_type: t.participation_type,
      max_participants: t.max_participants,
      min_team_size: t.min_team_size || '',
      max_team_size: t.max_team_size || '',
      registration_open_at: toDatetimeLocalValue(t.registration_open_at),
      registration_close_at: toDatetimeLocalValue(t.registration_close_at),
      start_at: toDatetimeLocalValue(t.start_at),
      end_at: toDatetimeLocalValue(t.end_at),
      description: t.description || '',
      use_external_link: t.use_external_link || false,
      external_registration_url: t.external_registration_url || '',
      form_schema: parseFormSchema(t.form_schema),
    });
    setEditingId(t.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      if (!form.game_name) {
        setError('Tên trò chơi là bắt buộc');
        return;
      }
      if (!form.banner_url) {
        setError('Ảnh truyền thông (Banner) là bắt buộc');
        return;
      }

      if (form.participation_type === 'team') {
        if (!form.min_team_size || !form.max_team_size) {
          setError('Kích thước tối thiểu và tối đa của đội là bắt buộc');
          return;
        }
        if (Number(form.min_team_size) > Number(form.max_team_size)) {
          setError('Kích thước tối thiểu phải nhỏ hơn hoặc bằng kích thước tối đa');
          return;
        }
      }

      const fullLocation = formatAddress({
        province_code: form.location_province_code,
        ward_code: form.location_ward_code,
        province_name: form.location_province,
        ward_name: form.location_ward,
        detailed_address: form.location_specific,
      });

      const submitData = {
        ...form,
        registration_open_at: toISOStringFromLocal(form.registration_open_at),
        registration_close_at: toISOStringFromLocal(form.registration_close_at),
        start_at: toISOStringFromLocal(form.start_at),
        end_at: toISOStringFromLocal(form.end_at),
        location: fullLocation || undefined,
        form_schema: form.form_schema || [],
        min_team_size: form.participation_type === 'team' ? Number(form.min_team_size) : null,
        max_team_size: form.participation_type === 'team' ? Number(form.max_team_size) : null,
        max_participants: Number(form.max_participants),
      };

      let result;
      if (editingId) {
        result = await tournamentAPI.update(editingId, submitData);
      } else {
        result = await tournamentAPI.create(submitData);
      }

      if (result.success) {
        const tournamentId = editingId || result.data?.id;
        if (tournamentId) {
          // Tự động gán các CTV Thường trực đã chọn vào BTC giải
          for (const uId of selectedPermanentUserIds) {
            try {
              await organizerApi.addOrganizer(tournamentId, {
                organizer_type: 'permanent',
                user_id: uId,
                role: 'co_organizer',
              });
            } catch {
              // Bỏ qua nếu đã tồn tại
            }
          }
          // Tự động gán các CTV Thời vụ đã chọn vào BTC giải
          for (const s of selectedSeasonalList) {
            try {
              await organizerApi.addOrganizer(tournamentId, {
                organizer_type: 'seasonal',
                participant_id: s.participant_id,
                role: 'seasonal_staff',
                custom_title: s.custom_title,
              });
            } catch {
              // Bỏ qua nếu đã tồn tại
            }
          }
        }

        setSuccess(result.message || 'Lưu thành công!');
        setShowModal(false);
        void fetchTournaments();
        if (userRole === 'admin') void fetchPendingTournaments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Lỗi khi lưu giải đấu');
      }
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
    }
  };

  // Form Builder helpers
  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      options: '',
    };
    setForm({ ...form, form_schema: [...(form.form_schema || []), newField] });
  };

  const removeField = (idx: number) => {
    const updated = form.form_schema.filter((_, i) => i !== idx);
    setForm({ ...form, form_schema: updated });
  };

  const updateField = (idx: number, key: keyof FormField, value: unknown) => {
    const updated = form.form_schema.map((f, i) => (i === idx ? { ...f, [key]: value } : f));
    setForm({ ...form, form_schema: updated });
  };

  const moveField = (idx: number, dir: number) => {
    const arr = [...form.form_schema];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setForm({ ...form, form_schema: arr });
  };

  const handleDelete = async (id: string) => {
    try {
      setError('');
      const result = await tournamentAPI.remove(id);
      if (result.success) {
        setSuccess('Xóa thành công!');
        setDeleteConfirm(null);
        void fetchTournaments();
        if (userRole === 'admin') void fetchPendingTournaments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Lỗi khi xóa giải đấu');
      }
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
    }
  };

  const handleApprove = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setError('');
      const result = await tournamentAPI.approveTournament(id, status);
      if (result.success) {
        setSuccess(status === 'approved' ? 'Giải đấu được duyệt!' : 'Giải đấu bị từ chối');
        setApproveConfirm(null);
        void fetchPendingTournaments();
        void fetchTournaments();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Lỗi khi duyệt giải đấu');
      }
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
    }
  };

  const openRegModal = async (tournament: Tournament) => {
    setRegModalTournament(tournament);
    setRegFilterStatus('all');
    setRegistrations([]);
    setParticipantsData(null);
    setActiveRegSubTab('participants');
    setExpandedTeamId(null);
    setRegError('');
    setSelectedTournamentSchema(parseFormSchema(tournament.form_schema));
    try {
      setRegLoading(true);
      const [regRes, partRes] = await Promise.all([
        registrationAPI.getMyRegistrations(tournament.id, 'all'),
        registrationAPI.getTournamentParticipants(tournament.id),
      ]);
      if (regRes.success) {
        setRegistrations(regRes.data || []);
      } else {
        setRegError(regRes.message || 'Không thể tải danh sách đăng ký');
      }
      if (partRes.success && partRes.data) {
        setParticipantsData(partRes.data);
      }
    } catch (err) {
      setRegError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleConfirmParticipation = async (
    registrationId: string,
    participantId: string,
    currentStatus: string,
  ) => {
    if (!regModalTournament) return;
    const action = currentStatus === 'approved' ? 'cancel' : 'confirm';
    try {
      const res = await registrationAPI.confirmParticipation(
        regModalTournament.id,
        registrationId,
        participantId,
        action,
      );
      if (res.success) {
        setSuccess(action === 'confirm' ? '✅ Đã xác nhận điểm danh tham gia!' : '❌ Đã hủy xác nhận điểm danh!');
        const partRes = await registrationAPI.getTournamentParticipants(regModalTournament.id);
        if (partRes.success && partRes.data) {
          setParticipantsData(partRes.data);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setRegError(res.message || 'Thao tác thất bại');
      }
    } catch (err) {
      setRegError('Lỗi: ' + (err as Error).message);
    }
  };

  const handleRegStatusFilter = async (status: string) => {
    setRegFilterStatus(status);
    if (!regModalTournament) return;
    try {
      setRegLoading(true);
      const result = await registrationAPI.getMyRegistrations(regModalTournament.id, status);
      if (result.success) setRegistrations(result.data || []);
      else setRegError(result.message || '');
    } catch (err) {
      setRegError('Lỗi: ' + (err as Error).message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleUpdateRegStatus = async (regId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const result = await registrationAPI.updateStatus(regId, newStatus);
      if (result.success) {
        setSuccess('Đã cập nhật trạng thái!');
        if (regModalTournament) {
          const r = await registrationAPI.getMyRegistrations(regModalTournament.id, regFilterStatus);
          if (r.success) setRegistrations(r.data || []);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else setRegError(result.message || '');
    } catch (err) {
      setRegError('Lỗi: ' + (err as Error).message);
    }
  };

  const handleDeleteReg = async (regId: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa đăng ký này?')) return;
    try {
      const result = await registrationAPI.remove(regId);
      if (result.success) {
        setSuccess('Đã xóa đăng ký!');
        if (regModalTournament) {
          const r = await registrationAPI.getMyRegistrations(regModalTournament.id, regFilterStatus);
          if (r.success) setRegistrations(r.data || []);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else setRegError(result.message || '');
    } catch (err) {
      setRegError('Lỗi: ' + (err as Error).message);
    }
  };

  const exportToExcel = () => {
    if (registrations.length === 0) {
      setRegError('Không có dữ liệu để xuất!');
      return;
    }
    const tourName = regModalTournament?.name || 'GiaiDau';
    const isTeam = regModalTournament?.participation_type === 'team';
    const schemaFields = selectedTournamentSchema;

    const rows: Record<string, unknown>[] = registrations.map((reg, idx) => {
      const submittedData = parseSubmittedData(reg.submitted_data);
      const membersList = (reg.members || [])
        .map(
          (m) =>
            `${m.is_captain ? '👑 Đội trưởng: ' : '• Thành viên: '}${m.full_name} (${m.username}${m.class_name ? ` - ${m.class_name}` : ''})`,
        )
        .join('\n');

      const row: Record<string, unknown> = {
        STT: idx + 1,
        'Hình Thức': isTeam ? 'Đội' : 'Cá nhân',
        ...(isTeam ? { 'Tên Đội': reg.team_name || 'Chưa đặt' } : {}),
        'Đội Trưởng / Thí Sinh': reg.captain_name || '-',
        'Mã SV / Username': reg.captain_username || '-',
        Lớp: reg.captain_class_name || '-',
        Khoa: reg.captain_faculty_name || '-',
        ...(isTeam ? { 'Số Thành Viên': reg.members?.length || 0, 'Danh Sách Thành Viên': membersList } : {}),
        'Ngày Đăng Ký': reg.registered_at ? new Date(reg.registered_at).toLocaleString('vi-VN') : '-',
        'Trạng Thái': reg.status === 'approved' ? 'Đã duyệt' : reg.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
      };

      if (schemaFields.length > 0) {
        schemaFields.forEach((f) => {
          row[f.label] = submittedData[f.id] ?? '';
        });
      } else {
        Object.entries(submittedData).forEach(([k, v]) => {
          row[k] = v;
        });
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map((k) => ({ wch: Math.max(k.length, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Đăng Ký');
    const fileName = `DangKy_${tourName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setSuccess(`Đã xuất file ${fileName}`);
    setTimeout(() => setSuccess(''), 4000);
  };

  if (viewingDetailTournamentId) {
    return (
      <div className="tournament-manager">
        <TournamentDetailView
          tournamentId={viewingDetailTournamentId}
          onBack={() => setViewingDetailTournamentId(null)}
        />
      </div>
    );
  }

  return (
    <div className="tournament-manager">
      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {/* Tabs */}
      <div className="tournament-tabs">
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Danh Sách Giải Đấu
        </button>
        {userRole === 'admin' && (
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Chờ Duyệt ({pendingTournaments.length})
          </button>
        )}
      </div>

      {/* List Tab */}
      {activeTab === 'list' && (
        <>
          <div className="manager-controls">
            <div className="controls-left">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm giải đấu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">🟢 Đang diễn ra / Hoạt động</option>
                <option value="approved">✅ Đã duyệt</option>
                <option value="completed">🏁 Hoàn thành</option>
                <option value="cancelled">❌ Đã hủy</option>
              </select>

              <div className="view-mode-toggle">
                <button
                  type="button"
                  className={`btn-toggle-view ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Dạng Lưới Thẻ Banner 16:9"
                >
                  🔲 Thẻ Banner
                </button>
                <button
                  type="button"
                  className={`btn-toggle-view ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Dạng Bảng Danh Sách"
                >
                  📋 Bảng
                </button>
              </div>
            </div>
            <button onClick={openAdd} className="btn-add">
              ➕ Tạo Giải Đấu
            </button>
          </div>

          {loading ? (
            <div className="loading">⏳ Đang tải dữ liệu...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>📭 Không có giải đấu nào</p>
              <button onClick={openAdd} className="btn-add-secondary">
                ➕ Tạo giải đấu đầu tiên
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GIAO DIỆN LƯỚI THẺ BANNER 16:9 (ESPORTS CARDS) */
            <div className="tournament-cards-grid">
              {filtered.map((t) => {
                const isEnded = Boolean(t.end_at && new Date() >= new Date(t.end_at));
                const isCancelled = t.status === 'cancelled';
                const isCompleted = t.status === 'completed';
                const canMutate = !isEnded && !isCancelled && !isCompleted;
                const stageInfo = getTournamentStage(t);

                return (
                  <div
                    key={t.id}
                    className={`tournament-media-card ${isEnded ? 'is-ended' : ''} ${isCancelled ? 'is-cancelled' : ''}`}
                  >
                    {/* Banner Truyền Thông 16:9 */}
                    <div className="card-media-banner">
                      {t.banner_url ? (
                        <img
                          src={t.banner_url}
                          alt={t.name}
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
                        style={{ display: t.banner_url ? 'none' : 'flex' }}
                      >
                        <span className="fallback-game-name">🎮 {t.game_name}</span>
                        <span className="fallback-tour-name">{t.name}</span>
                      </div>

                      <div className="banner-overlay-top">
                        <span className="banner-game-badge">🎮 {t.game_name}</span>
                        <span
                          className="banner-stage-badge"
                          style={{ backgroundColor: stageInfo.badgeColor + 'e0' }}
                        >
                          {stageInfo.badgeText}
                        </span>
                      </div>

                      <div className="banner-overlay-bottom">
                        <code className="banner-code-badge">{t.code}</code>
                      </div>
                    </div>

                    {/* Nội Dung Card */}
                    <div className="card-media-body">
                      <h3 className="card-media-title" title={t.name}>
                        {t.name}
                      </h3>

                      <div className="card-meta-chips">
                        <span className="meta-chip type-chip">
                          {t.participation_type === 'team'
                            ? `👥 Đội (${t.min_team_size || 1}-${t.max_team_size || 5} TV)`
                            : '👤 Cá nhân'}
                        </span>
                        <span className="meta-chip slots-chip">
                          🎯 {t.max_participants} {t.participation_type === 'team' ? 'đội' : 'người'}
                        </span>
                      </div>

                      <div className="card-schedule-box">
                        <div className="schedule-row">
                          <span className="sch-label">Bắt đầu:</span>
                          <span className="sch-val">{t.start_at ? formatDateTime(t.start_at) : '-'}</span>
                        </div>
                        <div className={`schedule-row ${isEnded ? 'ended-row' : ''}`}>
                          <span className="sch-label">Kết thúc:</span>
                          <span className="sch-val">
                            {t.end_at ? formatDateTime(t.end_at) : '-'}
                            {isEnded && <span className="ended-indicator"> (Hết hạn)</span>}
                          </span>
                        </div>
                      </div>

                      {/* Bộ 3 Nút Hành Động Chuẩn Hoá: Chi tiết, Hủy, Chỉnh sửa */}
                      <div className="card-primary-actions">
                        <button
                          type="button"
                          className="btn-action-hub btn-action-detail"
                          onClick={() => setViewingDetailTournamentId(t.id)}
                          title="Xem chi tiết giải đấu trên Dashboard"
                        >
                          🔍 Chi tiết
                        </button>

                        <button
                          type="button"
                          className={`btn-action-hub btn-action-cancel ${!canMutate ? 'is-disabled' : ''}`}
                          disabled={!canMutate}
                          onClick={() => setCancelModalTournament(t)}
                          title={
                            isEnded
                              ? `Không thể hủy: Giải đấu đã qua ngày kết thúc (${formatDateTime(t.end_at)})`
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
                          className={`btn-action-hub btn-action-edit ${!canMutate ? 'is-disabled' : ''}`}
                          disabled={!canMutate}
                          onClick={() => openEdit(t)}
                          title={
                            isEnded
                              ? `Không thể chỉnh sửa: Giải đấu đã qua ngày kết thúc (${formatDateTime(t.end_at)})`
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

                      {/* Lối Tắt Nhanh Ban Tổ Chức & Đăng Ký */}
                      <div className="card-secondary-actions">
                        <button
                          type="button"
                          className="btn-sub-action btn-sub-org"
                          onClick={() => setOrgModalTournament(t)}
                          title="Quản lý Ban Tổ Chức (CTV Thường trực & Thời vụ)"
                        >
                          🛡️ BTC
                        </button>
                        <button
                          type="button"
                          className="btn-sub-action btn-sub-reg"
                          onClick={() => void openRegModal(t)}
                          title="Danh sách đăng ký & VĐV"
                        >
                          👥 Đăng ký
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* GIAO DIỆN BẢNG DANH SÁCH CÓ BANNER THUMBNAIL */
            <div className="tournament-table">
              <table>
                <thead>
                  <tr>
                    <th>Banner</th>
                    <th>Mã</th>
                    <th>Tên Giải Đấu</th>
                    <th>Trò Chơi</th>
                    <th>Loại Tham Gia</th>
                    <th>Ngày Kết Thúc</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const isEnded = Boolean(t.end_at && new Date() >= new Date(t.end_at));
                    const isCancelled = t.status === 'cancelled';
                    const isCompleted = t.status === 'completed';
                    const canMutate = !isEnded && !isCancelled && !isCompleted;

                    return (
                      <tr key={t.id} className={isEnded ? 'row-ended' : ''}>
                        {/* Thumbnail Banner 16:9 */}
                        <td className="banner-thumb-cell">
                          {t.banner_url ? (
                            <img
                              src={t.banner_url}
                              alt={t.name}
                              className="table-banner-thumb"
                              onError={(e) => ((e.currentTarget as HTMLElement).style.display = 'none')}
                            />
                          ) : (
                            <div className="table-banner-fallback">🎮 {t.game_name}</div>
                          )}
                        </td>
                        <td><code className="code-badge">{t.code}</code></td>
                        <td className="name-cell">
                          <div className="tour-name-bold">{t.name}</div>
                          {isEnded && <span className="badge-ended-tag">Đã kết thúc</span>}
                          {isCancelled && <span className="badge-cancelled-tag">Đã hủy</span>}
                        </td>
                        <td>{t.game_name}</td>
                        <td>
                          {t.participation_type === 'team' ? (
                            <span className="type-tag team">👥 Đội ({t.min_team_size || 1}-{t.max_team_size || 5} TV)</span>
                          ) : (
                            <span className="type-tag individual">👤 Cá nhân</span>
                          )}
                        </td>
                        <td>
                          <div className={isEnded ? 'ended-date-text' : ''}>
                            {t.end_at ? formatDateTime(t.end_at) : '-'}
                          </div>
                        </td>
                        <td className="actions-cell">
                          <div className="table-action-btns">
                            <button
                              type="button"
                              onClick={() => setViewingDetailTournamentId(t.id)}
                              className="btn-action-hub btn-action-detail"
                              title="Chi tiết giải đấu trên Dashboard"
                            >
                              🔍 Chi tiết
                            </button>
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => setCancelModalTournament(t)}
                              className={`btn-action-hub btn-action-cancel ${!canMutate ? 'is-disabled' : ''}`}
                              title={
                                isEnded
                                  ? `Không thể hủy giải đấu đã qua ngày kết thúc (${formatDateTime(t.end_at)})`
                                  : isCancelled
                                    ? 'Giải đấu đã được hủy'
                                    : isCompleted
                                      ? 'Giải đấu đã hoàn thành'
                                      : 'Hủy giải đấu'
                              }
                            >
                              🚫 Hủy
                            </button>
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => openEdit(t)}
                              className={`btn-action-hub btn-action-edit ${!canMutate ? 'is-disabled' : ''}`}
                              title={
                                isEnded
                                  ? `Không thể chỉnh sửa giải đấu đã qua ngày kết thúc (${formatDateTime(t.end_at)})`
                                  : isCancelled
                                    ? 'Không thể chỉnh sửa giải đấu đã bị hủy'
                                    : isCompleted
                                      ? 'Không thể chỉnh sửa giải đấu đã hoàn thành'
                                      : 'Chỉnh sửa'
                              }
                            >
                              ✏️ Chỉnh sửa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pending Tab (Admin only) */}
      {activeTab === 'pending' && userRole === 'admin' && (
        <div className="pending-section">
          <h3>⏳ Giải Đấu Chờ Duyệt</h3>
          {pendingTournaments.length === 0 ? (
            <div className="empty-state">
              <p>✅ Không có giải đấu nào chờ duyệt</p>
            </div>
          ) : (
            <div className="pending-list">
              {pendingTournaments.map((t) => (
                <div key={t.id} className="pending-card">
                  <div className="pending-header">
                    <div>
                      <h4>{t.name}</h4>
                      <p className="game-info">🎮 {t.game_name} • Mã: {t.code}</p>
                      <p className="created-info">👤 {t.created_by_name} • {formatDateTime(t.created_at)}</p>
                    </div>
                    <div className="pending-badge">⏳ Chờ Duyệt</div>
                  </div>

                  <div className="pending-details">
                    <div className="detail-item">
                      <span className="label">Loại:</span>
                      <span>
                        {t.participation_type === 'team'
                          ? `👥 Đội (${t.min_team_size}-${t.max_team_size})`
                          : '👤 Cá nhân'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Số Lượng Max:</span>
                      <span>{t.max_participants} {t.participation_type === 'team' ? 'đội' : 'thí sinh'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Thời Gian:</span>
                      <span>{formatDateTime(t.start_at)} - {formatDateTime(t.end_at)}</span>
                    </div>
                  </div>

                  {t.description && (
                    <div className="pending-description">
                      <p>{t.description}</p>
                    </div>
                  )}

                  <div className="pending-actions">
                    <button
                      onClick={() => {
                        setApproveConfirm(t.id);
                        setApproveStatus('approved');
                      }}
                      className="btn-approve"
                    >
                      ✅ Duyệt
                    </button>
                    <button
                      onClick={() => {
                        setApproveConfirm(t.id);
                        setApproveStatus('rejected');
                      }}
                      className="btn-reject"
                    >
                      ❌ Từ Chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Registrations & Participant Management Slide Modal */}
      {regModalTournament && (
        <div className="reg-modal-overlay" onClick={() => setRegModalTournament(null)}>
          <div className="reg-slide-panel" onClick={(e) => e.stopPropagation()}>
            <div className="reg-panel-header">
              <div>
                <h3>
                  👥 Quản Lý Thành Viên &amp; Đăng Ký
                  <span className="panel-type-badge">
                    {regModalTournament.participation_type === 'team' ? ' 👥 Giải Đội' : ' 👤 Giải Cá Nhân'}
                  </span>
                </h3>
                <p className="reg-panel-sub">{regModalTournament.name} • <code>{regModalTournament.code}</code></p>
              </div>
              <div className="reg-panel-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-export-excel"
                  style={{ backgroundColor: '#2e7d32', color: '#ffffff', fontWeight: 'bold' }}
                  onClick={() => void registrationAPI.downloadParticipantsExcel(regModalTournament.id, regModalTournament.code)}
                  title="Tải file Excel báo cáo danh sách thành viên và điểm danh ngày thi đấu"
                >
                  📥 Tải Excel Báo Cáo
                </button>
                <button className="reg-panel-close" onClick={() => setRegModalTournament(null)}>✕</button>
              </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', padding: '0 20px' }}>
              <button
                type="button"
                style={{
                  padding: '12px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeRegSubTab === 'participants' ? '3px solid #00f2fe' : '3px solid transparent',
                  color: activeRegSubTab === 'participants' ? '#00f2fe' : '#aaa',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                onClick={() => setActiveRegSubTab('participants')}
              >
                👥 Thành Viên &amp; Điểm Danh Ngày Đánh Giải ({participantsData?.teams?.length || participantsData?.individualParticipants?.length || 0})
              </button>
              <button
                type="button"
                style={{
                  padding: '12px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeRegSubTab === 'registrations' ? '3px solid #00f2fe' : '3px solid transparent',
                  color: activeRegSubTab === 'registrations' ? '#00f2fe' : '#aaa',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                onClick={() => setActiveRegSubTab('registrations')}
              >
                📋 Đơn Đăng Ký ({registrations.length})
              </button>
            </div>

            {regError && (
              <div className="alert alert-error" style={{ margin: '10px 20px' }}>
                ⚠️ {regError}
                <button onClick={() => setRegError('')}>✕</button>
              </div>
            )}

            <div className="reg-panel-body">
              {regLoading ? (
                <div className="loading">⏳ Đang tải dữ liệu...</div>
              ) : activeRegSubTab === 'participants' ? (
                /* TAB 1: QUẢN LÝ THÀNH VIÊN & XÁC NHẬN ĐIỂM DANH NGÀY ĐÁNH GIẢI */
                <div className="participants-management-view" style={{ padding: '10px 0' }}>
                  {regModalTournament.participation_type === 'team' ? (
                    /* GIẢI ĐỒNG ĐỘI */
                    <div>
                      {!participantsData?.teams || participantsData.teams.length === 0 ? (
                        <div className="reg-empty-hint">
                          <div className="reg-empty-icon">📭</div>
                          <p>Chưa có đội nào được phê duyệt tham gia</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {participantsData.teams.map((team, tIdx) => {
                            const isExpanded = expandedTeamId === team.registrationId;
                            return (
                              <div
                                key={team.registrationId}
                                style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    padding: '12px 16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => setExpandedTeamId(isExpanded ? null : team.registrationId)}
                                >
                                  <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#00f2fe' }}>
                                      🚩 #{tIdx + 1} {team.teamName}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>
                                      👑 Đội trưởng: <strong>{team.captainName}</strong> ({team.captainStudentId || 'N/A'}) • 👥 {team.totalMembers} thành viên
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        backgroundColor: team.checkedInCount === team.totalMembers ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                                        color: team.checkedInCount === team.totalMembers ? '#4caf50' : '#ff9800',
                                        border: `1px solid ${team.checkedInCount === team.totalMembers ? '#4caf50' : '#ff9800'}`,
                                      }}
                                    >
                                      Điểm danh: {team.checkedInCount}/{team.totalMembers}
                                    </span>
                                    <button
                                      type="button"
                                      className="btn-reg-view"
                                      style={{ padding: '6px 12px', fontSize: '13px' }}
                                    >
                                      {isExpanded ? '🔼 Thu gọn' : '👁️ Xem danh sách thành viên'}
                                    </button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <table className="members-table" style={{ width: '100%' }}>
                                      <thead>
                                        <tr>
                                          <th>#</th>
                                          <th>Vai Trò</th>
                                          <th>Họ và Tên</th>
                                          <th>MSSV</th>
                                          <th>Ingame ID</th>
                                          <th>Lớp / Khoa</th>
                                          <th>SĐT / Email</th>
                                          <th>Điểm Danh Ngày Đánh Giải</th>
                                          <th>Thao Tác Xác Nhận</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {team.members.map((m, mIdx) => (
                                          <tr key={m.participantId} className={m.isCaptain ? 'captain-row' : ''}>
                                            <td>{mIdx + 1}</td>
                                            <td>
                                              {m.isCaptain ? (
                                                <span className="role-badge captain">👑 Đội trưởng</span>
                                              ) : (
                                                <span className="role-badge member">👤 Thành viên</span>
                                              )}
                                            </td>
                                            <td className="font-bold">{m.fullName}</td>
                                            <td><code>{m.studentId || '-'}</code></td>
                                            <td><span style={{ color: '#00f2fe', fontWeight: 'bold' }}>{m.ingameId || '-'}</span></td>
                                            <td>{`${m.className || '-'} • ${m.facultyName || '-'}`}</td>
                                            <td style={{ fontSize: '12px' }}>
                                              <div>{m.phoneNumber || '-'}</div>
                                              <div style={{ color: '#888' }}>{m.email || '-'}</div>
                                            </td>
                                            <td>
                                              {m.checkinStatus === 'approved' ? (
                                                <span className="reg-status-badge reg-status-approved" style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}>
                                                  ✅ Đã điểm danh
                                                </span>
                                              ) : (
                                                <span className="reg-status-badge reg-status-pending" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#ff9800' }}>
                                                  ⏳ Chưa điểm danh
                                                </span>
                                              )}
                                            </td>
                                            <td>
                                              {m.checkinStatus === 'approved' ? (
                                                <button
                                                  type="button"
                                                  className="btn-reg-reject"
                                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                                  onClick={() => void handleConfirmParticipation(team.registrationId, m.participantId, 'approved')}
                                                  title="Hủy xác nhận điểm danh"
                                                >
                                                  ❌ Hủy xác nhận
                                                </button>
                                              ) : (
                                                <button
                                                  type="button"
                                                  className="btn-reg-approve"
                                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                                  onClick={() => void handleConfirmParticipation(team.registrationId, m.participantId, 'not_checked_in')}
                                                  title="Bấm nút xác nhận tham gia ngày thi đấu"
                                                >
                                                  ✅ Xác nhận tham gia
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* GIẢI CÁ NHÂN */
                    <div>
                      {!participantsData?.individualParticipants || participantsData.individualParticipants.length === 0 ? (
                        <div className="reg-empty-hint">
                          <div className="reg-empty-icon">📭</div>
                          <p>Chưa có thí sinh nào được phê duyệt tham gia</p>
                        </div>
                      ) : (
                        <div className="reg-table-wrapper">
                          <table className="reg-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Họ và Tên</th>
                                <th>MSSV</th>
                                <th>Ingame ID</th>
                                <th>Lớp / Khoa</th>
                                <th>Liên Hệ</th>
                                <th>Điểm Danh Ngày Đánh Giải</th>
                                <th>Thao Tác Xác Nhận</th>
                              </tr>
                            </thead>
                            <tbody>
                              {participantsData.individualParticipants.map((m, pIdx) => (
                                <tr key={m.participantId}>
                                  <td>{pIdx + 1}</td>
                                  <td className="font-bold">👤 {m.fullName}</td>
                                  <td><code>{m.studentId || '-'}</code></td>
                                  <td><span style={{ color: '#00f2fe', fontWeight: 'bold' }}>{m.ingameId || '-'}</span></td>
                                  <td>{`${m.className || '-'} • ${m.facultyName || '-'}`}</td>
                                  <td style={{ fontSize: '12px' }}>
                                    <div>{m.phoneNumber || '-'}</div>
                                    <div style={{ color: '#888' }}>{m.email || '-'}</div>
                                  </td>
                                  <td>
                                    {m.checkinStatus === 'approved' ? (
                                      <span className="reg-status-badge reg-status-approved" style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}>
                                        ✅ Đã điểm danh
                                      </span>
                                    ) : (
                                      <span className="reg-status-badge reg-status-pending" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#ff9800' }}>
                                        ⏳ Chưa điểm danh
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {m.checkinStatus === 'approved' ? (
                                      <button
                                        type="button"
                                        className="btn-reg-reject"
                                        style={{ padding: '4px 10px', fontSize: '12px' }}
                                        onClick={() => void handleConfirmParticipation(m.registrationId || '', m.participantId, 'approved')}
                                        title="Hủy xác nhận điểm danh"
                                      >
                                        ❌ Hủy xác nhận
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn-reg-approve"
                                        style={{ padding: '4px 10px', fontSize: '12px' }}
                                        onClick={() => void handleConfirmParticipation(m.registrationId || '', m.participantId, 'not_checked_in')}
                                        title="Bấm nút xác nhận tham gia ngày thi đấu"
                                      >
                                        ✅ Xác nhận tham gia
                                      </button>
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
                </div>
              ) : (
                /* TAB 2: QUẢN LÝ ĐƠN ĐĂNG KÝ (LEGACY REGISTRATIONS VIEW) */
                <>
                  <div className="reg-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span>Tổng: <strong>{registrations.length}</strong></span>
                      <span>✅ <strong className="text-green">{registrations.filter((r) => r.status === 'approved').length}</strong></span>
                      <span>⏳ <strong className="text-yellow">{registrations.filter((r) => r.status === 'pending').length}</strong></span>
                      <span>❌ <strong className="text-red">{registrations.filter((r) => r.status === 'rejected').length}</strong></span>
                    </div>
                    <select
                      className="reg-status-filter"
                      value={regFilterStatus}
                      onChange={(e) => void handleRegStatusFilter(e.target.value)}
                    >
                      <option value="all">Tất cả đơn đăng ký</option>
                      <option value="pending">⏳ Đơn chờ duyệt</option>
                      <option value="approved">✅ Đơn đã duyệt</option>
                      <option value="rejected">❌ Đơn bị từ chối</option>
                    </select>
                  </div>
                  <div className="reg-table-wrapper">
                    <table className="reg-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Thời Gian</th>
                          <th>{regModalTournament.participation_type === 'team' ? 'Đội / Đội Trưởng' : 'Thí Sinh Tham Gia'}</th>
                          <th>Trạng Thái</th>
                          <th>Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map((reg, idx) => {
                          const isTeamReg = regModalTournament.participation_type === 'team' || Boolean(reg.team_name);
                          return (
                            <tr key={reg.id}>
                              <td>{idx + 1}</td>
                              <td className="reg-date">{formatDateTime(reg.registered_at)}</td>
                              <td className="reg-info-cell">
                                {isTeamReg ? (
                                  <div>
                                    <div className="reg-team-title font-bold">🚩 {reg.team_name || 'Đội chưa đặt tên'}</div>
                                    <div className="reg-sub-text">
                                      👑 Đội trưởng: {reg.captain_name || 'N/A'} <code>({reg.captain_username || '-'})</code>
                                    </div>
                                    <div className="reg-member-badge">
                                      👥 {reg.members?.length || 1} thành viên
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="reg-participant-title font-bold">👤 {reg.captain_name || 'Thí sinh'}</div>
                                    <div className="reg-sub-text">
                                      Mã SV: <code>{reg.captain_username || '-'}</code> {reg.captain_class_name ? `• ${reg.captain_class_name}` : ''}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className={`reg-status-badge reg-status-${reg.status}`}>
                                  {reg.status === 'approved' ? '✅ Duyệt'
                                    : reg.status === 'rejected' ? '❌ Từ chối'
                                    : '⏳ Chờ'}
                                </span>
                              </td>
                              <td className="reg-actions">
                                <button className="btn-reg-view" onClick={() => setViewingReg(reg)} title="Xem chi tiết & danh sách thành viên">👁️ Xem</button>
                                {reg.status !== 'approved' && (
                                  <button className="btn-reg-approve" onClick={() => void handleUpdateRegStatus(reg.id, 'approved')} title="Duyệt">✅</button>
                                )}
                                {reg.status !== 'rejected' && (
                                  <button className="btn-reg-reject" onClick={() => void handleUpdateRegStatus(reg.id, 'rejected')} title="Từ chối">❌</button>
                                )}
                                <button className="btn-reg-delete" onClick={() => void handleDeleteReg(reg.id)} title="Xóa">🗑️</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Registration Detail Modal */}
      {viewingReg && (
        <div className="modal-overlay" onClick={() => setViewingReg(null)}>
          <div className="modal modal-reg-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Chi Tiết Đăng Ký &amp; Danh Sách Thành Viên</h3>
              <button onClick={() => setViewingReg(null)} className="btn-close">✕</button>
            </div>
            <div className="reg-detail-content">
              <div className="reg-detail-meta">
                <span className="type-badge-pill">
                  {viewingReg.participation_type === 'team' || viewingReg.team_name ? '👥 Đăng Ký Đội' : '👤 Đăng Ký Cá Nhân'}
                </span>
                <span>⏰ {formatDateTime(viewingReg.registered_at)}</span>
                <span className={`reg-status-badge reg-status-${viewingReg.status}`}>
                  {viewingReg.status === 'approved' ? '✅ Đã duyệt'
                    : viewingReg.status === 'rejected' ? '❌ Từ chối'
                    : '⏳ Chờ duyệt'}
                </span>
              </div>

              {/* Summary Card */}
              <div className="reg-detail-summary-card">
                {viewingReg.team_name && (
                  <div className="summary-row">
                    <span className="summary-label">🚩 Tên Đội:</span>
                    <span className="summary-val team-title">{viewingReg.team_name}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span className="summary-label">👑 {viewingReg.team_name ? 'Đội Trưởng:' : 'Thí Sinh:'}</span>
                  <span className="summary-val font-bold">
                    {viewingReg.captain_name || viewingReg.captain_id} 
                    {viewingReg.captain_username && <code className="sub-code"> ({viewingReg.captain_username})</code>}
                  </span>
                </div>
                {(viewingReg.captain_class_name || viewingReg.captain_faculty_name) && (
                  <div className="summary-row">
                    <span className="summary-label">🎓 Lớp / Khoa:</span>
                    <span className="summary-val">
                      {viewingReg.captain_class_name || '-'} • {viewingReg.captain_faculty_name || '-'}
                    </span>
                  </div>
                )}
              </div>

              {/* Members Table */}
              {viewingReg.members && viewingReg.members.length > 0 && (
                <div className="reg-detail-members-section">
                  <h4 className="section-subtitle">
                    👥 Danh Sách Thành Viên ({viewingReg.members.length} người)
                  </h4>
                  <div className="members-table-wrapper">
                    <table className="members-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Vai Trò</th>
                          <th>Họ và Tên</th>
                          <th>MSSV / Username</th>
                          <th>Trường</th>
                          <th>Lớp / Khoa</th>
                          <th>Loại TK</th>
                          <th>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingReg.members.map((m, idx) => (
                          <tr key={m.participant_id || m.participantId || idx} className={m.is_captain || m.isCaptain ? 'captain-row' : ''}>
                            <td>{idx + 1}</td>
                            <td>
                              {m.is_captain || m.isCaptain ? (
                                <span className="role-badge captain">👑 Đội trưởng</span>
                              ) : (
                                <span className="role-badge member">👤 Thành viên</span>
                              )}
                            </td>
                            <td className="font-bold">{m.full_name || m.fullName || '-'}</td>
                            <td><code>{m.student_id || m.studentId || m.username || '-'}</code></td>
                            <td>{m.university_name || m.universityName || 'ĐH Bách Khoa'}</td>
                            <td>
                              {(m.class_name || m.className || '-') + ' • ' + (m.faculty_name || m.facultyName || '-')}
                            </td>
                            <td>
                              <span className="acc-type-tag dut">
                                🎓 Sinh viên
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-reg-view"
                                onClick={() => setViewingMemberDetail(m)}
                                title="Xem thông tin chi tiết sinh viên"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                              >
                                🔍 Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submitted Form Data */}
              <div className="reg-detail-fields-section">
                <h4 className="section-subtitle">📝 Thông Tin Form Đăng Ký</h4>
                <div className="reg-detail-fields">
                  {Object.keys(parseSubmittedData(viewingReg.submitted_data)).length === 0 ? (
                    <p className="text-muted">Không có dữ liệu form bổ sung</p>
                  ) : (
                    Object.entries(parseSubmittedData(viewingReg.submitted_data)).map(([k, v]) => {
                      const schemaField = selectedTournamentSchema.find((f) => f.id === k);
                      return (
                        <div key={k} className="reg-detail-field">
                          <span className="reg-detail-label">{schemaField?.label || k}</span>
                          <span className="reg-detail-value">{String(v)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="modal-actions">
                {viewingReg.status !== 'approved' && (
                  <button className="btn-approve" onClick={() => { void handleUpdateRegStatus(viewingReg.id, 'approved'); setViewingReg(null); }}>✅ Duyệt</button>
                )}
                {viewingReg.status !== 'rejected' && (
                  <button className="btn-reject" onClick={() => { void handleUpdateRegStatus(viewingReg.id, 'rejected'); setViewingReg(null); }}>❌ Từ chối</button>
                )}
                <button className="btn-cancel" onClick={() => setViewingReg(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Personal Details & KYC Images Modal */}
      {viewingMemberDetail && (
        <div className="modal-overlay" onClick={() => setViewingMemberDetail(null)} style={{ zIndex: 1100 }}>
          <div className="modal modal-student-detail" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '92%' }}>
            <div className="modal-header">
              <h3>🪪 Hồ Sơ Chi Tiết Sinh Viên</h3>
              <button onClick={() => setViewingMemberDetail(null)} className="btn-close">✕</button>
            </div>
            <div className="reg-detail-content">
              {/* Student Header Card */}
              <div className="student-profile-header-card">
                <div className="student-avatar-badge">🎓</div>
                <div className="student-header-info">
                  <h3 className="student-name">{viewingMemberDetail.full_name || viewingMemberDetail.fullName || 'N/A'}</h3>
                  <div className="student-sub-info">
                    <span>MSSV: <code>{viewingMemberDetail.student_id || viewingMemberDetail.studentId || viewingMemberDetail.username || 'N/A'}</code></span>
                    <span className="bullet">•</span>
                    <span className="student-uni">{viewingMemberDetail.university_name || viewingMemberDetail.universityName || 'Đại học Bách khoa - ĐHĐN'}</span>
                  </div>
                </div>
                <div className="student-kyc-status">
                  <span className={`reg-status-badge reg-status-${viewingMemberDetail.status || viewingMemberDetail.participant_status || 'approved'}`}>
                    {(viewingMemberDetail.status || viewingMemberDetail.participant_status) === 'approved' ? '✅ KYC Đã duyệt'
                      : (viewingMemberDetail.status || viewingMemberDetail.participant_status) === 'rejected' ? '❌ KYC Bị từ chối'
                      : '⏳ KYC Chờ duyệt'}
                  </span>
                </div>
              </div>

              {/* Detailed Info Grid */}
              <div className="student-info-grid">
                <div className="info-grid-item">
                  <span className="info-label">🏫 Trường / Đơn vị</span>
                  <span className="info-value">{viewingMemberDetail.university_name || viewingMemberDetail.universityName || 'Đại học Bách khoa - ĐHĐN'}</span>
                </div>
                <div className="info-grid-item">
                  <span className="info-label">📚 Khoa</span>
                  <span className="info-value">{viewingMemberDetail.faculty_name || viewingMemberDetail.facultyName || '-'}</span>
                </div>
                <div className="info-grid-item">
                  <span className="info-label">🎓 Lớp</span>
                  <span className="info-value">{viewingMemberDetail.class_name || viewingMemberDetail.className || '-'}</span>
                </div>
                <div className="info-grid-item">
                  <span className="info-label">📧 Email</span>
                  <span className="info-value">{viewingMemberDetail.email || '-'}</span>
                </div>
                <div className="info-grid-item">
                  <span className="info-label">📞 Số điện thoại</span>
                  <span className="info-value">{viewingMemberDetail.phone || viewingMemberDetail.phone_number || '-'}</span>
                </div>
                <div className="info-grid-item">
                  <span className="info-label">🎮 Ingame ID</span>
                  <span className="info-value font-mono"><code>{viewingMemberDetail.ingame_id || viewingMemberDetail.ingameId || '-'}</code></span>
                </div>
                <div className="info-grid-item">
                  <span className="info-label">👑 Vai trò trong giải</span>
                  <span className="info-value">
                    {viewingMemberDetail.is_captain || viewingMemberDetail.isCaptain ? '👑 Đội trưởng' : '👤 Thành viên'} 
                    {viewingMemberDetail.role_in_team || viewingMemberDetail.roleInTeam ? ` (${viewingMemberDetail.role_in_team || viewingMemberDetail.roleInTeam})` : ''}
                  </span>
                </div>
                <div className="info-grid-item">
                  <span className="info-label">🏷️ Loại tài khoản</span>
                  <span className="info-value">🎓 Sinh viên</span>
                </div>
              </div>

              {/* KYC Identity Verification Photos (Student Cards only - ZERO CCCD) */}
              <div className="student-kyc-photos-section">
                <h4 className="section-subtitle">🖼️ Ảnh Thẻ Sinh Viên &amp; Xác Thực KYC (Zero CCCD)</h4>
                <div className="kyc-photos-grid">
                  {/* Card 1: Student Card Front */}
                  <div className="kyc-photo-card">
                    <div className="kyc-photo-header">📌 Mặt trước Thẻ Sinh Viên</div>
                    {(viewingMemberDetail.student_card_url || viewingMemberDetail.studentCardUrl) ? (
                      <div 
                        className="kyc-photo-wrapper"
                        onClick={() => setZoomImage({ 
                          url: (viewingMemberDetail.student_card_url || viewingMemberDetail.studentCardUrl)!, 
                          title: `Mặt trước Thẻ SV - ${viewingMemberDetail.full_name || viewingMemberDetail.fullName}` 
                        })}
                      >
                        <img 
                          src={getAuthenticatedImageUrl(viewingMemberDetail.student_card_url || viewingMemberDetail.studentCardUrl)} 
                          alt="Mặt trước thẻ sinh viên" 
                          className="kyc-img"
                        />
                        <div className="kyc-photo-overlay">🔍 Click để phóng to</div>
                      </div>
                    ) : (
                      <div className="kyc-photo-empty">Chưa tải lên ảnh thẻ SV</div>
                    )}
                  </div>

                  {/* Card 2: Selfie with Student Card */}
                  <div className="kyc-photo-card">
                    <div className="kyc-photo-header">📸 Selfie cùng Thẻ Sinh Viên</div>
                    {(viewingMemberDetail.selfie_with_student_card_url || viewingMemberDetail.selfieWithStudentCardUrl) ? (
                      <div 
                        className="kyc-photo-wrapper"
                        onClick={() => setZoomImage({ 
                          url: (viewingMemberDetail.selfie_with_student_card_url || viewingMemberDetail.selfieWithStudentCardUrl)!, 
                          title: `Selfie cùng Thẻ SV - ${viewingMemberDetail.full_name || viewingMemberDetail.fullName}` 
                        })}
                      >
                        <img 
                          src={getAuthenticatedImageUrl(viewingMemberDetail.selfie_with_student_card_url || viewingMemberDetail.selfieWithStudentCardUrl)} 
                          alt="Selfie cùng thẻ sinh viên" 
                          className="kyc-img"
                        />
                        <div className="kyc-photo-overlay">🔍 Click để phóng to</div>
                      </div>
                    ) : (
                      <div className="kyc-photo-empty">Chưa tải lên ảnh selfie cùng thẻ SV</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn-cancel" onClick={() => setViewingMemberDetail(null)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Zoom Modal */}
      {zoomImage && (
        <div className="modal-overlay" onClick={() => setZoomImage(null)} style={{ zIndex: 1200 }}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <h4>{zoomImage.title}</h4>
              <button onClick={() => setZoomImage(null)} className="btn-close">✕</button>
            </div>
            <div className="lightbox-body">
              <img src={getAuthenticatedImageUrl(zoomImage.url)} alt={zoomImage.title} className="lightbox-img" />
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !editingId || setShowModal(false)}>
          <div className="modal tm-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? '✏️ Sửa Giải Đấu' : '➕ Thêm Giải Đấu Mới'}</h3>
              <button onClick={() => setShowModal(false)} className="btn-close">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {/* Row 1: Game Name & Tournament Name */}
              <div className="form-row">
                <div className="form-group">
                  <label>Tên Trò Chơi * 🎮</label>
                  <select
                    value={form.game_name}
                    onChange={(e) => {
                      const newGameName = e.target.value;
                      const logoUrl = getLogoUrl(newGameName);
                      setForm({
                        ...form,
                        game_name: newGameName,
                        game_logo_url: logoUrl,
                      });
                    }}
                    required
                  >
                    <option value="">-- Chọn Trò Chơi --</option>
                    {AVAILABLE_GAMES.map((game) => (
                      <option key={game.code} value={game.name}>
                        {game.name}
                      </option>
                    ))}
                  </select>
                  <small>Logo sẽ tự động chọn khi bạn chọn trò chơi</small>
                </div>
                <div className="form-group">
                  <label>Tên Giải Đấu *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="VD: LOL Championship Q2"
                  />
                </div>
              </div>

              {/* Row 2: Participation Type & Max Participants */}
              <div className="form-row">
                <div className="form-group">
                  <label>Loại Tham Gia *</label>
                  <select
                    value={form.participation_type}
                    onChange={(e) => {
                      const type = e.target.value as 'individual' | 'team';
                      setForm({
                        ...form,
                        participation_type: type,
                        min_team_size: type === 'team' ? (form.min_team_size || 3) : '',
                        max_team_size: type === 'team' ? (form.max_team_size || 5) : '',
                      });
                    }}
                  >
                    <option value="individual">👤 Cá nhân</option>
                    <option value="team">👥 Đội</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{form.participation_type === 'team' ? 'Số Đội Tối Đa *' : 'Số Thí Sinh Tối Đa *'}</label>
                  <input
                    type="number"
                    value={form.max_participants}
                    onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })}
                    required
                    min="1"
                  />
                </div>
              </div>

              {/* Conditional Team Size Fields */}
              {form.participation_type === 'team' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Số Thành Viên Tối Thiểu *</label>
                    <input
                      type="number"
                      value={form.min_team_size}
                      onChange={(e) => setForm({ ...form, min_team_size: e.target.value as unknown as number })}
                      required
                      min="1"
                      placeholder="VD: 3"
                    />
                  </div>
                  <div className="form-group">
                    <label>Số Thành Viên Tối Đa *</label>
                    <input
                      type="number"
                      value={form.max_team_size}
                      onChange={(e) => setForm({ ...form, max_team_size: e.target.value as unknown as number })}
                      required
                      min="1"
                      placeholder="VD: 5"
                    />
                  </div>
                </div>
              )}

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

              {/* Banner Upload with Dimension Requirements & Cropper */}
              <div className="form-group">
                <div className="banner-label-row">
                  <label>📸 Ảnh Truyền Thông (Banner) *</label>
                  <span className="banner-size-requirement">
                    📐 Chuẩn 16:9 (1920 × 1080 px hoặc tối thiểu 1280 × 720 px)
                  </span>
                </div>
                <div
                  className={`banner-upload-zone ${bannerUploading ? 'uploading' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onSelectBannerFile(e.dataTransfer.files[0]);
                  }}
                >
                  {form.banner_url ? (
                    <div className="banner-upload-preview">
                      <img src={form.banner_url} alt="Banner preview" />
                      <div className="banner-upload-overlay">
                        <button
                          type="button"
                          className="banner-adjust-btn"
                          onClick={() => {
                            setCropImageSrc(form.banner_url);
                            setCropFileName('banner.jpg');
                            setShowCropModal(true);
                          }}
                        >
                          📐 Căn chỉnh lại
                        </button>
                        <label className="banner-change-btn">
                          🔄 Đổi ảnh
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              onSelectBannerFile(e.target.files?.[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="banner-remove-btn"
                          onClick={() => setForm((f) => ({ ...f, banner_url: '' }))}
                        >
                          ✕ Xóa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="banner-upload-placeholder">
                      {bannerUploading ? (
                        <>
                          <span className="upload-spinner"></span>
                          <span>Đang tải và tối ưu ảnh banner...</span>
                        </>
                      ) : (
                        <>
                          <span className="upload-icon">🖼️</span>
                          <span className="upload-text">Kéo thả hoặc click để chọn ảnh banner</span>
                          <span className="upload-hint">Tự động mở công cụ căn chỉnh chuẩn 16:9 • Tối đa 5MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          onSelectBannerFile(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Registration Dates */}
              <div className="form-row">
                <div className="form-group">
                  <label>📅 Ngày &amp; Giờ Mở Đăng Ký</label>
                  <input
                    type="datetime-local"
                    value={form.registration_open_at}
                    onChange={(e) => setForm({ ...form, registration_open_at: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>📅 Ngày &amp; Giờ Đóng Đăng Ký</label>
                  <input
                    type="datetime-local"
                    value={form.registration_close_at}
                    onChange={(e) => setForm({ ...form, registration_close_at: e.target.value })}
                  />
                </div>
              </div>

              {/* Tournament Dates */}
              <div className="form-row">
                <div className="form-group">
                  <label>🎮 Ngày &amp; Giờ Bắt Đầu</label>
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>🏁 Ngày &amp; Giờ Kết Thúc</label>
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Mô Tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Nhập mô tả chi tiết về giải đấu (quy tắc, phần thưởng...)..."
                />
              </div>

              {/* ===== BAN TỔ CHỨC THAM GIA ĐIỀU HÀNH ===== */}
              <div className="form-group tm-org-section">
                <div className="tm-org-section-header">
                  <h4 className="tm-org-section-title">🛡️ Ban Tổ Chức Tham Gia Điều Hành Giải</h4>
                  <p className="tm-org-section-sub">
                    Chọn các CTV thường trực phụ trách và bổ sung CTV thời vụ (sinh viên DUT đã duyệt KYC)
                  </p>
                </div>

                {/* 1. CTV Thường Trực */}
                <div className="tm-org-block">
                  <span className="tm-org-subheading">
                    👥 CTV Thường Trực Phụ Trách ({selectedPermanentUserIds.length} đã chọn):
                  </span>
                  {candidateUsers.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '12px' }}>Đang tải danh sách CTV thường trực...</p>
                  ) : (
                    <div className="tm-ctv-grid">
                      {candidateUsers.map((u) => {
                        const isSelected = selectedPermanentUserIds.includes(u.id);
                        return (
                          <label key={u.id} className={`tm-ctv-card ${isSelected ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedPermanentUserIds((prev) => prev.filter((id) => id !== u.id));
                                } else {
                                  setSelectedPermanentUserIds((prev) => [...prev, u.id]);
                                }
                              }}
                            />
                            <div className="tm-ctv-card-text">
                              <strong className="tm-ctv-card-name">{u.full_name}</strong>
                              <span className="tm-ctv-card-email">{u.email}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. CTV Thời Vụ (Add bằng MSSV) */}
                <div className="tm-org-block">
                  <span className="tm-org-subheading">
                    🎓 CTV Thời Vụ (Sinh Viên DUT đã KYC — {selectedSeasonalList.length} nhân sự):
                  </span>
                  <div className="tm-seasonal-input-row">
                    <div className="tm-seasonal-search-wrap">
                      <input
                        type="text"
                        placeholder="Nhập MSSV (VD: 102220...) hoặc Họ tên..."
                        value={seasonalSearchQuery}
                        onChange={(e) => setSeasonalSearchQuery(e.target.value)}
                        className="tm-seasonal-input"
                      />
                      {seasonalCandidates.length > 0 && (
                        <div className="tm-seasonal-dropdown">
                          {seasonalCandidates.map((c) => (
                            <div
                              key={c.id}
                              className="tm-seasonal-dropdown-item"
                              onClick={() => {
                                if (!selectedSeasonalList.some((s) => s.participant_id === c.id)) {
                                  setSelectedSeasonalList((prev) => [
                                    ...prev,
                                    {
                                      participant_id: c.id,
                                      full_name: c.full_name,
                                      student_id: c.student_id || 'N/A',
                                      custom_title: seasonalTitleInput.trim() || 'CTV Điểm danh',
                                    },
                                  ]);
                                }
                                setSeasonalSearchQuery('');
                                setSeasonalCandidates([]);
                              }}
                            >
                              <div>
                                <strong>{c.full_name}</strong> — <span>MSSV: {c.student_id || 'N/A'}</span>
                              </div>
                              <span className="tm-badge-kyc">KYC ✓</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Chức danh (VD: CTV Điểm danh)..."
                      value={seasonalTitleInput}
                      onChange={(e) => setSeasonalTitleInput(e.target.value)}
                      className="tm-seasonal-input"
                    />

                    <button
                      type="button"
                      className="btn-add-seasonal-manual"
                      onClick={async () => {
                        if (!seasonalSearchQuery.trim()) {
                          alert('Vui lòng nhập MSSV hoặc tên sinh viên để thêm');
                          return;
                        }
                        try {
                          const res = await organizerApi.getCandidateParticipants(seasonalSearchQuery.trim());
                          if (res.success && res.data && res.data.length > 0) {
                            const matched = res.data[0];
                            if (!selectedSeasonalList.some((s) => s.participant_id === matched.id)) {
                              setSelectedSeasonalList((prev) => [
                                ...prev,
                                {
                                  participant_id: matched.id,
                                  full_name: matched.full_name,
                                  student_id: matched.student_id || 'N/A',
                                  custom_title: seasonalTitleInput.trim() || 'CTV Điểm danh',
                                },
                              ]);
                              setSeasonalSearchQuery('');
                              setSeasonalCandidates([]);
                            } else {
                              alert('Sinh viên này đã được thêm vào danh sách');
                            }
                          } else {
                            alert('Không tìm thấy sinh viên nào đã KYC approved với thông tin này');
                          }
                        } catch (err) {
                          alert('Lỗi tìm kiếm: ' + (err as Error).message);
                        }
                      }}
                    >
                      ➕ Thêm CTV Thời Vụ
                    </button>
                  </div>

                  {/* Danh sách CTV Thời vụ đã thêm */}
                  {selectedSeasonalList.length > 0 && (
                    <div className="tm-seasonal-selected-list">
                      {selectedSeasonalList.map((s) => (
                        <div key={s.participant_id} className="tm-seasonal-tag">
                          <span>
                            🎓 <strong>{s.full_name}</strong> (MSSV: {s.student_id}) — <em>&quot;{s.custom_title}&quot;</em>
                          </span>
                          <button
                            type="button"
                            className="tm-seasonal-tag-remove"
                            onClick={() =>
                              setSelectedSeasonalList((prev) =>
                                prev.filter((item) => item.participant_id !== s.participant_id),
                              )
                            }
                            title="Xóa khỏi danh sách"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ===== FORM BUILDER ===== */}
              <div className="form-group form-builder-section">
                <label className="form-builder-label">
                  📋 Thiết kế Form Đăng Ký
                  <span className="form-builder-badge">{(form.form_schema || []).length} trường</span>
                </label>
                <p className="form-builder-desc">
                  Thêm, xóa và thiết lập các trường cho form đăng ký. Người dùng sẽ điền vào những trường này khi đăng ký tham gia giải.
                </p>

                <div className="fb-field-list">
                  {(form.form_schema || []).length === 0 ? (
                    <div className="fb-empty">
                      <p>📝 Chưa có trường nào. Nhấn {'"+ Thêm trường"'} để bắt đầu thiết kế form.</p>
                    </div>
                  ) : (
                    (form.form_schema || []).map((field, idx) => (
                      <div key={field.id} className="fb-field-card">
                        <div className="fb-field-handle">
                          <button type="button" className="fb-move-btn" onClick={() => moveField(idx, -1)} disabled={idx === 0} title="Lên">↑</button>
                          <span className="fb-field-num">{idx + 1}</span>
                          <button type="button" className="fb-move-btn" onClick={() => moveField(idx, 1)} disabled={idx === (form.form_schema || []).length - 1} title="Xuống">↓</button>
                        </div>

                        <div className="fb-field-body">
                          <div className="fb-field-row">
                            <div className="fb-field-group">
                              <label className="fb-mini-label">Tên trường *</label>
                              <input
                                className="fb-input"
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(idx, 'label', e.target.value)}
                                placeholder="VD: Họ và tên, Số điện thoại..."
                                required
                              />
                            </div>
                            <div className="fb-field-group fb-type-group">
                              <label className="fb-mini-label">Loại</label>
                              <select
                                className="fb-select"
                                value={field.type}
                                onChange={(e) => updateField(idx, 'type', e.target.value)}
                              >
                                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                          </div>

                          {field.type === 'select' && (
                            <div className="fb-field-group" style={{ marginTop: '8px' }}>
                              <label className="fb-mini-label">📌 Các lựa chọn (cách nhau bằng dấu phẩy)</label>
                              <input
                                className="fb-input"
                                type="text"
                                value={field.options || ''}
                                onChange={(e) => updateField(idx, 'options', e.target.value)}
                                placeholder="VD: Hà Nội, TP.HCM, Đà Nẵng"
                              />
                            </div>
                          )}

                          <div className="fb-field-row fb-field-bottom">
                            <label className="fb-required-toggle">
                              <input
                                type="checkbox"
                                checked={field.required || false}
                                onChange={(e) => updateField(idx, 'required', e.target.checked)}
                              />
                              <span>Bắt buộc</span>
                            </label>
                            <span className="fb-type-badge">
                              {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                            </span>
                          </div>
                        </div>

                        <button type="button" className="fb-remove-btn" onClick={() => removeField(idx)} title="Xóa trường">✕</button>
                      </div>
                    ))
                  )}
                </div>

                <button type="button" className="fb-add-btn" onClick={addField}>
                  + Thêm trường
                </button>
              </div>

              {editingId && (
                <div className="form-group">
                  <label>Ghi Chú: Mã giải đấu sẽ được tự động tạo theo định dạng: &lt;TênGame&gt;&lt;THÁNG-NĂM&gt;&lt;MãTăng&gt;</label>
                  <small>Ví dụ: AOV052026001 (Liên Quân), LOL052026001 (League of Legend)</small>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  {editingId ? 'Cập Nhật' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Xác Nhận Xóa</h3>
            </div>
            <p>Bạn chắc chắn muốn xóa giải đấu này? Hành động này không thể hoàn tác.</p>
            <div className="modal-actions">
              <button onClick={() => setDeleteConfirm(null)} className="btn-cancel">
                Hủy
              </button>
              <button onClick={() => void handleDelete(deleteConfirm)} className="btn-delete">
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation */}
      {approveConfirm && (
        <div className="modal-overlay" onClick={() => setApproveConfirm(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{approveStatus === 'approved' ? '✅ Duyệt Giải Đấu' : '❌ Từ Chối Giải Đấu'}</h3>
            </div>
            <p>
              {approveStatus === 'approved'
                ? 'Bạn chắc chắn muốn duyệt giải đấu này?'
                : 'Bạn chắc chắn muốn từ chối giải đấu này?'}
            </p>
            <div className="modal-actions">
              <button onClick={() => setApproveConfirm(null)} className="btn-cancel">
                Hủy
              </button>
              <button
                onClick={() => void handleApprove(approveConfirm, approveStatus)}
                className={approveStatus === 'approved' ? 'btn-approve' : 'btn-reject'}
              >
                {approveStatus === 'approved' ? '✅ Duyệt' : '❌ Từ Chối'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Ban Tổ Chức Giải */}
      {orgModalTournament && (
        <div className="modal-overlay" onClick={() => setOrgModalTournament(null)}>
          <div className="modal" style={{ maxWidth: '950px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ban Tổ Chức Giải Đấu</h3>
              <button className="modal-close" onClick={() => setOrgModalTournament(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <TournamentOrganizersTab tournament={orgModalTournament} onClose={() => setOrgModalTournament(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Căn Chỉnh & Cắt Banner 16:9 */}
      {showCropModal && cropImageSrc && (
        <BannerCropModal
          imageSrc={cropImageSrc}
          fileName={cropFileName}
          onApply={async (croppedFile) => {
            await handleBannerUpload(croppedFile);
          }}
          onClose={() => {
            setShowCropModal(false);
            setCropImageSrc('');
          }}
        />
      )}

      {/* Modal Chi Tiết Toàn Diện Giải Đấu */}
      <TournamentDetailModal
        tournament={detailModalTournament}
        isOpen={Boolean(detailModalTournament)}
        onClose={() => setDetailModalTournament(null)}
        onManageOrganizers={(t) => setOrgModalTournament(t)}
        onManageRegistrations={(t) => void openRegModal(t)}
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
