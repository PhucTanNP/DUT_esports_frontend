'use client';

import { useEffect, useState, useCallback } from 'react';
import { participantAPI, type ParticipantRow, UNIVERSITIES } from '../../services/participant.service';
import { getDutFaculties, DUT_FACULTIES } from '../../services/auth.service';
import type { Pagination, ParticipantStatus } from '../../types';
import ParticipantKYCModal from './ParticipantKYCModal';
import '../../styles/admin/CTVManager.css';
import '../../styles/admin/ParticipantManager.css';

interface ParticipantForm {
  account_type: 'internal' | 'external' | 'dut' | 'free' | 'dut_student';
  username: string;
  full_name: string;
  email: string;
  phone_number: string;
  university_name: string;
  class_name: string;
  faculty_name: string;
  password?: string;
  status?: ParticipantStatus;
}

const emptyForm: ParticipantForm = {
  account_type: 'internal',
  username: '',
  full_name: '',
  email: '',
  phone_number: '',
  university_name: UNIVERSITIES[0],
  class_name: '',
  faculty_name: '',
  password: '',
  status: 'pending',
};

const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, pages: 1 };

export default function ParticipantManager() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterAccountType, setFilterAccountType] = useState<'all' | 'internal' | 'external' | 'dut' | 'free'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterFaculty, setFilterFaculty] = useState<string>('all');

  // KYC Modal State
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantRow | null>(null);

  // Edit / Create Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<string[]>([...DUT_FACULTIES]);
  const [form, setForm] = useState<ParticipantForm>(emptyForm);

  // Delete & Status Confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ id: string; targetStatus: ParticipantStatus; name: string } | null>(null);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);

  useEffect(() => {
    getDutFaculties().then(setFaculties);
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await participantAPI.getAll(
        search,
        filterAccountType,
        filterStatus,
        filterFaculty,
        page,
        10,
      );

      if (result.success) {
        setParticipants(result.data ?? []);
        setPagination(result.pagination ?? EMPTY_PAGINATION);
      } else {
        setError(result.message || 'Lỗi khi tải dữ liệu người dùng');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, filterAccountType, filterStatus, filterFaculty, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadParticipants();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadParticipants]);

  const getAvatarLetter = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'P';
  };

  // Open KYC Modal
  const openKYCModal = (user: ParticipantRow) => {
    setSelectedParticipant(user);
    setShowKYCModal(true);
  };

  // Approve action from KYC Modal
  const handleApproveKYC = async (id: string) => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await participantAPI.approve(id);
      if (res.success) {
        triggerToast(`✅ Đã phê duyệt hồ sơ sinh viên ${res.data?.full_name || ''} thành công!`);
        setShowKYCModal(false);
        await loadParticipants();
      } else {
        setError(res.message || 'Phê duyệt thất bại');
      }
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Reject action from KYC Modal
  const handleRejectKYC = async (id: string, reason: string) => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await participantAPI.reject(id, reason);
      if (res.success) {
        triggerToast(`❌ Đã từ chối hồ sơ và gửi thông báo tới sinh viên!`);
        setShowKYCModal(false);
        await loadParticipants();
      } else {
        setError(res.message || 'Từ chối hồ sơ thất bại');
      }
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Lock / Unlock / Status Toggle
  const handleStatusChange = async () => {
    if (!statusConfirm) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await participantAPI.updateStatus(statusConfirm.id, statusConfirm.targetStatus);
      if (res.success) {
        triggerToast(`Đã cập nhật trạng thái tài khoản sinh viên thành: ${statusConfirm.targetStatus}`);
        setStatusConfirm(null);
        await loadParticipants();
      } else {
        setError(res.message || 'Cập nhật trạng thái thất bại');
      }
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Add Form
  const openAdd = () => {
    setForm(emptyForm);
    setEditingParticipant(null);
    setError(null);
    setShowEditModal(true);
  };

  // Open Edit Form
  const openEdit = (user: ParticipantRow) => {
    setForm({
      account_type: user.account_type,
      username: user.student_id || user.username || '',
      full_name: user.full_name || '',
      email: user.email || '',
      phone_number: user.phone_number || user.phone || '',
      university_name: user.university_name || UNIVERSITIES[0],
      faculty_name: user.faculty_name || '',
      class_name: user.class_name || '',
      password: '',
      status: user.status,
    });
    setEditingParticipant(user.id);
    setError(null);
    setShowEditModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanUsername = form.username.trim();
    if (!cleanUsername) {
      setError('Mã số sinh viên (MSSV) hoặc Tên đăng nhập là bắt buộc');
      return;
    }

    if (!form.full_name.trim()) {
      setError('Họ và tên là bắt buộc');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      let result;

      const payload: Partial<ParticipantRow> & { password?: string } = {
        account_type: form.account_type,
        username: cleanUsername,
        student_id: cleanUsername,
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        phone_number: form.phone_number.trim() || undefined,
        university_name: form.university_name,
        class_name: form.class_name.trim() || undefined,
        faculty_name: form.faculty_name.trim() || undefined,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      };

      if (editingParticipant) {
        result = await participantAPI.update(editingParticipant, payload);
      } else {
        result = await participantAPI.create({
          ...payload,
          password: form.password || '123456',
        });
      }

      if (result.success) {
        triggerToast(result.message || 'Lưu thông tin sinh viên thành công');
        setShowEditModal(false);
        await loadParticipants();
      } else {
        setError(result.message || 'Lỗi khi lưu dữ liệu');
      }
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setIsSaving(true);
      setError(null);
      const result = await participantAPI.remove(deleteConfirm);

      if (result.success) {
        triggerToast('Đã xóa hồ sơ sinh viên thành công');
        setDeleteConfirm(null);
        await loadParticipants();
      } else {
        setError(result.message || 'Lỗi khi xóa người dùng');
      }
    } catch (err) {
      setError('Lỗi: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="participant-manager">
      {/* Toast Thông báo kết quả thao tác */}
      {successToast && (
        <div className="toast-notification success-toast">
          <span className="toast-icon">✓</span>
          <span className="toast-message">{successToast}</span>
        </div>
      )}

      {/* Banner lỗi */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
          <button className="btn-retry" onClick={loadParticipants}>
            🔄 Thử lại
          </button>
        </div>
      )}

      {/* Toolbar Tìm kiếm & Bộ lọc */}
      <div className="manager-toolbar cyber-toolbar">
        <div className="toolbar-top-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm MSSV, Họ tên, Email, Số điện thoại..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <button className="btn-add cyber-btn-primary" onClick={openAdd} disabled={isSaving}>
            <span>+</span> Thêm Sinh Viên Mới
          </button>
        </div>

        {/* Filters Row */}
        <div className="toolbar-filter-row">
          {/* Status Pills */}
          <div className="filter-pills-group">
            <button
              className={`filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => { setFilterStatus('all'); setPage(1); }}
            >
              Tất Cả ({pagination.total})
            </button>
            <button
              className={`filter-pill pill-pending ${filterStatus === 'pending' ? 'active' : ''}`}
              onClick={() => { setFilterStatus('pending'); setPage(1); }}
            >
              ⏳ Chờ Duyệt KYC
            </button>
            <button
              className={`filter-pill pill-approved ${filterStatus === 'approved' ? 'active' : ''}`}
              onClick={() => { setFilterStatus('approved'); setPage(1); }}
            >
              ✅ Đã Duyệt
            </button>
            <button
              className={`filter-pill pill-rejected ${filterStatus === 'rejected' ? 'active' : ''}`}
              onClick={() => { setFilterStatus('rejected'); setPage(1); }}
            >
              ❌ Bị Từ Chối
            </button>
          </div>

          {/* Dropdown Filters */}
          <div className="filter-dropdowns">
            <select
              className="filter-select"
              value={filterAccountType}
              onChange={(e) => { setFilterAccountType(e.target.value as any); setPage(1); }}
            >
              <option value="all">Tất cả loại tài khoản</option>
              <option value="internal">Sinh viên DUT (Nội bộ)</option>
              <option value="external">Sinh viên ngoài trường / Tự do</option>
            </select>

            <select
              className="filter-select"
              value={filterFaculty}
              onChange={(e) => { setFilterFaculty(e.target.value); setPage(1); }}
            >
              <option value="all">Tất cả Khoa / Viện</option>
              {faculties.map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="table-container">
          <div className="skeleton-table">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-cell avatar-col" />
                <div className="skeleton-cell text-col" />
                <div className="skeleton-cell text-col" />
                <div className="skeleton-cell badge-col" />
                <div className="skeleton-cell action-col" />
              </div>
            ))}
          </div>
        </div>
      ) : participants.length === 0 ? (
        /* Empty State */
        <div className="empty-state-card">
          <div className="empty-icon">📁</div>
          <h3>Không tìm thấy sinh viên nào</h3>
          <p>Không có hồ sơ sinh viên nào phù hợp với bộ lọc hiện tại. Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc.</p>
          {(search || filterStatus !== 'all' || filterAccountType !== 'all' || filterFaculty !== 'all') && (
            <button
              className="btn-reset-filter"
              onClick={() => {
                setSearch('');
                setFilterStatus('all');
                setFilterAccountType('all');
                setFilterFaculty('all');
                setPage(1);
              }}
            >
              ↺ Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sinh Viên &amp; Liên Hệ</th>
                  <th>Trường &amp; MSSV</th>
                  <th>Khoa &amp; Lớp</th>
                  <th>Trạng Thái KYC</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((user) => {
                  const isPending = user.status === 'pending';
                  return (
                    <tr key={user.id} className={`table-row row-${user.status}`}>
                      <td>
                        <div className="participant-cell">
                          <div className="participant-avatar">{getAvatarLetter(user.full_name)}</div>
                          <div className="participant-info">
                            <span className="participant-name">{user.full_name}</span>
                            <span className="participant-contact">
                              ✉️ {user.email || 'Chưa có email'}
                            </span>
                            {user.phone_number && (
                              <span className="participant-phone">📞 {user.phone_number}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="uni-cell">
                          <span className="uni-name">
                            🎓 {user.university_name || 'Đại học Bách Khoa (DUT)'}
                          </span>
                          <span className="mssv-badge">
                            MSSV: <strong>{user.student_id || user.username || 'Chưa có'}</strong>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="academic-cell">
                          <span className="academic-faculty">{user.faculty_name || 'Đang cập nhật'}</span>
                          {user.class_name && <span className="academic-class">Lớp: {user.class_name}</span>}
                        </div>
                      </td>
                      <td>
                        {user.status === 'approved' && (
                          <span className="status-badge status-approved">
                            ✓ Đã Duyệt
                          </span>
                        )}
                        {user.status === 'pending' && (
                          <span className="status-badge status-pending">
                            ⏳ Chờ Duyệt
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="status-badge status-rejected" title={user.rejection_reason || ''}>
                            ✕ Từ Chối
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-btns">
                          {/* QUY TẮC: Nút ký duyệt CHỈ hiển thị khi account ở dạng pending */}
                          {isPending ? (
                            <button
                              className="btn-action btn-review-active"
                              onClick={() => openKYCModal(user)}
                              title="Kiểm duyệt ảnh thẻ sinh viên"
                            >
                              🔍 Kiểm Duyệt
                            </button>
                          ) : (
                            <button
                              className="btn-action btn-view"
                              onClick={() => openKYCModal(user)}
                              title="Xem hồ sơ & ảnh KYC"
                            >
                              👁️ Xem Hồ Sơ
                            </button>
                          )}

                          <button
                            className="btn-action btn-edit"
                            onClick={() => openEdit(user)}
                            title="Sửa thông tin"
                            disabled={isSaving}
                          >
                            ✏️ Sửa
                          </button>

                          {/* Khóa / Mở khóa nhanh */}
                          {user.status === 'approved' ? (
                            <button
                              className="btn-action btn-lock"
                              onClick={() => setStatusConfirm({ id: user.id, targetStatus: 'rejected', name: user.full_name })}
                              title="Khóa tài khoản sinh viên vi phạm"
                              disabled={isSaving}
                            >
                              🔒 Khóa
                            </button>
                          ) : user.status === 'rejected' ? (
                            <button
                              className="btn-action btn-unlock"
                              onClick={() => setStatusConfirm({ id: user.id, targetStatus: 'approved', name: user.full_name })}
                              title="Mở khóa tài khoản"
                              disabled={isSaving}
                            >
                              🔓 Mở
                            </button>
                          ) : null}

                          <button
                            className="btn-action btn-delete"
                            onClick={() => setDeleteConfirm(user.id)}
                            title="Xóa hồ sơ"
                            disabled={isSaving}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="mobile-card-list">
            {participants.map((user) => {
              const isPending = user.status === 'pending';
              return (
                <div key={user.id} className={`mobile-participant-card card-${user.status}`}>
                  <div className="card-top">
                    <div className="card-avatar">{getAvatarLetter(user.full_name)}</div>
                    <div className="card-title-info">
                      <h4 className="card-name">{user.full_name}</h4>
                      <span className="card-mssv">MSSV: {user.student_id || user.username || 'N/A'}</span>
                    </div>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status === 'approved' && '✓ Đã Duyệt'}
                      {user.status === 'pending' && '⏳ Chờ Duyệt'}
                      {user.status === 'rejected' && '✕ Từ Chối'}
                    </span>
                  </div>

                  <div className="card-details">
                    <div className="card-detail-item">
                      <span className="detail-label">Trường:</span>
                      <span className="detail-val">{user.university_name || 'DUT'}</span>
                    </div>
                    <div className="card-detail-item">
                      <span className="detail-label">Khoa/Lớp:</span>
                      <span className="detail-val">{user.faculty_name || 'N/A'} {user.class_name ? `(${user.class_name})` : ''}</span>
                    </div>
                    <div className="card-detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-val">{user.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    {isPending ? (
                      <button className="btn-action btn-review-active full-width" onClick={() => openKYCModal(user)}>
                        🔍 Kiểm Duyệt KYC
                      </button>
                    ) : (
                      <button className="btn-action btn-view" onClick={() => openKYCModal(user)}>
                        👁️ Xem Hồ Sơ
                      </button>
                    )}
                    <button className="btn-action btn-edit" onClick={() => openEdit(user)}>✏️ Sửa</button>
                    <button className="btn-action btn-delete" onClick={() => setDeleteConfirm(user.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phân trang */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                ← Trước
              </button>
              <span>Trang {page} / {pagination.pages} (Tổng {pagination.total} sinh viên)</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages || loading}
              >
                Sau →
              </button>
            </div>
          )}

          <div className="table-footer">
            Đang hiển thị {participants.length} / {pagination.total} sinh viên
          </div>
        </>
      )}

      {/* ================= MODAL KIỂM DUYỆT THẺ SINH VIÊN (KYC MODAL) ================= */}
      <ParticipantKYCModal
        participant={selectedParticipant}
        isOpen={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        onApprove={handleApproveKYC}
        onReject={handleRejectKYC}
        isSaving={isSaving}
      />

      {/* ================= MODAL THÊM / SỬA SINH VIÊN ================= */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingParticipant ? '✏️ Chỉnh Sửa Sinh Viên' : '➕ Thêm Sinh Viên Mới'}</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmitForm}>
              <div className="form-row">
                <div className="form-group">
                  <label>Mã Sinh Viên (MSSV) *</label>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                    placeholder="VD: 102230123"
                    disabled={isSaving}
                  />
                </div>
                <div className="form-group">
                  <label>Họ và Tên *</label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="VD: Nguyễn Văn A"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email Liên Hệ</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="sinhvien@dut.udn.vn"
                    disabled={isSaving}
                  />
                </div>
                <div className="form-group">
                  <label>Số Điện Thoại</label>
                  <input
                    value={form.phone_number}
                    onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
                    placeholder="0905123456"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Trường Đại Học */}
              <div className="form-group">
                <label>Trường Đại Học</label>
                <select
                  value={form.university_name}
                  onChange={(e) => setForm((p) => ({ ...p, university_name: e.target.value }))}
                  disabled={isSaving}
                >
                  {UNIVERSITIES.map((uni) => (
                    <option key={uni} value={uni}>{uni}</option>
                  ))}
                </select>
              </div>

              {/* Khoa và Lớp */}
              <div className="form-row">
                <div className="form-group">
                  <label>Khoa / Viện</label>
                  <select
                    value={form.faculty_name}
                    onChange={(e) => setForm((p) => ({ ...p, faculty_name: e.target.value }))}
                    disabled={isSaving}
                  >
                    <option value="">-- Chọn Khoa / Viện --</option>
                    {faculties.map((fac) => (
                      <option key={fac} value={fac}>{fac}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Lớp Sinh Hoạt</label>
                  <input
                    value={form.class_name}
                    onChange={(e) => setForm((p) => ({ ...p, class_name: e.target.value }))}
                    placeholder="VD: 23TCLC_DT1"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Trạng thái duyệt nếu đang edit */}
              {editingParticipant && (
                <div className="form-group">
                  <label>Trạng Thái KYC</label>
                  <select
                    value={form.status || 'pending'}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ParticipantStatus }))}
                    disabled={isSaving}
                  >
                    <option value="pending">⏳ Chờ Duyệt (Pending)</option>
                    <option value="approved">✅ Đã Phê Duyệt (Approved)</option>
                    <option value="rejected">❌ Bị Từ Chối (Rejected)</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Mật Khẩu {editingParticipant ? '(Để trống nếu giữ nguyên)' : '*'}</label>
                <input
                  type="password"
                  required={!editingParticipant}
                  value={form.password || ''}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder={editingParticipant ? 'Nhập mật khẩu mới nếu muốn đổi' : 'Nhập mật khẩu (ít nhất 6 ký tự)'}
                  disabled={isSaving}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)} disabled={isSaving}>
                  Hủy
                </button>
                <button type="submit" className="btn-save" disabled={isSaving}>
                  {isSaving ? '⏳ Đang lưu...' : editingParticipant ? 'Cập Nhật' : 'Thêm Sinh Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL XÁC NHẬN KHÓA / ĐỔI TRẠNG THÁI ================= */}
      {statusConfirm && (
        <div className="modal-overlay" onClick={() => setStatusConfirm(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">{statusConfirm.targetStatus === 'rejected' ? '🔒' : '🔓'}</div>
            <h3>
              {statusConfirm.targetStatus === 'rejected' ? 'Khóa Tài Khoản Sinh Viên' : 'Mở Khóa Tài Khoản Sinh Viên'}
            </h3>
            <p>
              Bạn có chắc chắn muốn {statusConfirm.targetStatus === 'rejected' ? 'khóa' : 'mở khóa'} tài khoản của{' '}
              <strong>{statusConfirm.name}</strong> không?
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setStatusConfirm(null)} disabled={isSaving}>Hủy</button>
              <button
                className={`btn-delete-confirm ${statusConfirm.targetStatus === 'rejected' ? 'btn-danger' : 'btn-success'}`}
                onClick={handleStatusChange}
                disabled={isSaving}
              >
                {isSaving ? '⏳ Đang cập nhật...' : 'Xác Nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL XÁC NHẬN XÓA ================= */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3>Xác Nhận Xóa Hồ Sơ Sinh Viên</h3>
            <p>Hành động này sẽ xóa vĩnh viễn dữ liệu người dùng khỏi hệ thống và không thể khôi phục. Bạn có chắc chắn không?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)} disabled={isSaving}>Hủy</button>
              <button className="btn-delete-confirm btn-danger" onClick={handleDelete} disabled={isSaving}>
                {isSaving ? '⏳ Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
