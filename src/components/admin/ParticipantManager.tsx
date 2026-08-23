'use client';

import { useEffect, useState } from 'react';
import { participantAPI, type ParticipantRow, UNIVERSITIES } from '../../services/participant.service';
import { getDutFaculties, DUT_FACULTIES } from '../../services/auth.service';
import type { Pagination, ParticipantStatus } from '../../types';
import '../../styles/admin/CTVManager.css';
import '../../styles/admin/ParticipantManager.css';

interface ParticipantForm {
  account_type: 'dut' | 'free' | 'dut_student' | 'external';
  username: string;
  full_name: string;
  email: string;
  phone_number: string;
  university_name: string;
  class_name: string;
  faculty_name: string;
  password?: string;
}

const emptyForm: ParticipantForm = {
  account_type: 'dut_student',
  username: '',
  full_name: '',
  email: '',
  phone_number: '',
  university_name: UNIVERSITIES[0],
  class_name: '',
  faculty_name: '',
  password: '',
};

const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, pages: 1 };

export default function ParticipantManager() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterAccountType, setFilterAccountType] = useState<'all' | 'dut' | 'free' | 'dut_student' | 'external'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewParticipant, setReviewParticipant] = useState<ParticipantRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [editingOriginalType, setEditingOriginalType] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<string[]>([...DUT_FACULTIES]);
  const [form, setForm] = useState<ParticipantForm>(emptyForm);

  // Delete Confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);

  useEffect(() => {
    getDutFaculties().then(setFaculties);
  }, []);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await participantAPI.getAll(search, filterAccountType, filterStatus, page, 10);

      if (result.success) {
        setParticipants(result.data ?? []);
        setPagination(result.pagination ?? EMPTY_PAGINATION);
      } else {
        setError(result.message || 'Lỗi khi tải dữ liệu người dùng');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterAccountType, filterStatus, page]);

  const getAvatarLetter = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'P';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const openReview = (user: ParticipantRow) => {
    setReviewParticipant(user);
    setRejectionReason(user.rejection_reason || 'Ảnh thẻ sinh viên hoặc ảnh chân dung chưa rõ nét, vui lòng chụp lại.');
    setIsRejecting(false);
    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!reviewParticipant) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await participantAPI.review(reviewParticipant.id, 'approve');
      if (res.success) {
        setSuccessMessage(`Đã phê duyệt tài khoản sinh viên ${reviewParticipant.full_name} thành công!`);
        setTimeout(() => setSuccessMessage(null), 3000);
        setShowReviewModal(false);
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

  const handleReject = async () => {
    if (!reviewParticipant) return;
    if (!rejectionReason.trim()) {
      setError('Vui lòng nhập lý do từ chối cụ thể để gửi email thông báo cho sinh viên.');
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const res = await participantAPI.review(reviewParticipant.id, 'reject', rejectionReason.trim());
      if (res.success) {
        setSuccessMessage(`Đã từ chối hồ sơ và gửi email thông báo tới ${reviewParticipant.email || reviewParticipant.full_name}!`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setShowReviewModal(false);
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

  const openAdd = () => {
    setForm(emptyForm);
    setEditingParticipant(null);
    setEditingOriginalType(null);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (user: ParticipantRow) => {
    setForm({
      account_type: user.account_type,
      username: user.student_id || user.username || '',
      full_name: user.full_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      university_name: user.university_name || UNIVERSITIES[0],
      faculty_name: user.faculty_name || '',
      class_name: user.class_name || '',
      password: '',
    });
    setEditingParticipant(user.id);
    setEditingOriginalType(user.account_type);
    setError(null);
    setShowModal(true);
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

      const isDut = form.account_type === 'dut' || form.account_type === 'dut_student';
      const payload: any = {
        account_type: form.account_type as any,
        username: cleanUsername,
        student_id: cleanUsername,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        university_name: form.university_name,
        class_name: form.class_name.trim() || undefined,
        faculty_name: form.faculty_name.trim() || undefined,
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
        setSuccessMessage(result.message || 'Lưu thông tin sinh viên thành công');
        setTimeout(() => setSuccessMessage(null), 3000);
        setShowModal(false);
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
        setSuccessMessage('Đã xóa người dùng thành công');
        setTimeout(() => setSuccessMessage(null), 3000);
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
      {/* Thông báo */}
      {successMessage && <div className="message success-message">✓ {successMessage}</div>}
      {error && <div className="message error-message">✕ {error}</div>}

      {/* Toolbar */}
      <div className="manager-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm Email, MSSV, Họ tên, Số điện thoại, Trường..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Lọc trạng thái kiểm duyệt */}
          <div className="filter-group">
            <button
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => { setFilterStatus('all'); setPage(1); }}
            >
              Tất cả trạng thái
            </button>
            <button
              className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
              style={{ color: '#fbbf24' }}
              onClick={() => { setFilterStatus('pending'); setPage(1); }}
            >
              ⏳ Chờ Duyệt
            </button>
            <button
              className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
              style={{ color: '#4ade80' }}
              onClick={() => { setFilterStatus('approved'); setPage(1); }}
            >
              ✅ Đã Duyệt
            </button>
            <button
              className={`filter-btn ${filterStatus === 'rejected' ? 'active' : ''}`}
              style={{ color: '#f87171' }}
              onClick={() => { setFilterStatus('rejected'); setPage(1); }}
            >
              ❌ Bị Từ Chối
            </button>
          </div>
        </div>

        <button className="btn-add" onClick={openAdd} disabled={isSaving}>
          <span>+</span> Thêm Sinh Viên
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="table-container">
          <div className="loading-spinner">⏳ Đang tải danh sách sinh viên...</div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sinh Viên / Email</th>
                  <th>Trường & MSSV</th>
                  <th>Khoa & Lớp</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Không tìm thấy sinh viên nào phù hợp
                    </td>
                  </tr>
                ) : (
                  participants.map((user) => {
                    return (
                      <tr key={user.id} className="table-row">
                        <td>
                          <div className="participant-cell">
                            <div className="participant-avatar">{getAvatarLetter(user.full_name)}</div>
                            <div className="participant-info">
                              <span className="participant-name">{user.full_name}</span>
                              <span className="participant-mssv">
                                ✉️ {user.email || 'Chưa có email'} {user.phone_number ? `| 📞 ${user.phone_number}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="status-badge status-active">
                              🎓 {user.university_name || 'Đại học Bách Khoa (DUT)'}
                            </span>
                            <small style={{ color: '#94a3b8' }}>
                              MSSV: <strong>{user.student_id || user.username || 'Chưa cập nhật'}</strong>
                            </small>
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
                            <span className="status-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                              ✓ Đã Duyệt
                            </span>
                          )}
                          {user.status === 'pending' && (
                            <span className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                              ⏳ Chờ Duyệt
                            </span>
                          )}
                          {user.status === 'rejected' && (
                            <span className="status-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }} title={user.rejection_reason || ''}>
                              ✕ Từ Chối
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="btn-edit"
                              style={{ background: 'rgba(0, 198, 255, 0.15)', color: '#00c6ff', borderColor: 'rgba(0, 198, 255, 0.4)' }}
                              onClick={() => openReview(user)}
                              title="Kiểm duyệt & xem thẻ sinh viên"
                            >
                              🔍 Kiểm Duyệt
                            </button>
                            <button
                              className="btn-edit"
                              onClick={() => openEdit(user)}
                              title="Sửa thông tin"
                              disabled={isSaving}
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => setDeleteConfirm(user.id)}
                              title="Xóa hồ sơ"
                              disabled={isSaving}
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                ← Trước
              </button>
              <span>Trang {page}/{pagination.pages}</span>
              <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages || loading}>
                Sau →
              </button>
            </div>
          )}

          <div className="table-footer">Hiển thị {participants.length} / {pagination.total} sinh viên</div>
        </>
      )}

      {/* ================= MODAL KIỂM DUYỆT THẺ SINH VIÊN (ADMIN REVIEW - ĐÃ XÓA CCCD) ================= */}
      {showReviewModal && reviewParticipant && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Xét Duyệt Hồ Sơ Sinh Viên: {reviewParticipant.full_name}</h3>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <strong style={{ color: '#94a3b8', fontSize: '12px' }}>EMAIL:</strong>
                <div style={{ fontWeight: 'bold', color: '#ffffff' }}>{reviewParticipant.email || 'N/A'}</div>
              </div>
              <div>
                <strong style={{ color: '#94a3b8', fontSize: '12px' }}>SỐ ĐIỆN THOẠI:</strong>
                <div style={{ fontWeight: 'bold', color: '#ffffff' }}>{reviewParticipant.phone_number || 'N/A'}</div>
              </div>
              <div>
                <strong style={{ color: '#94a3b8', fontSize: '12px' }}>TRƯỜNG ĐẠI HỌC:</strong>
                <div style={{ fontWeight: 'bold', color: '#00c6ff' }}>{reviewParticipant.university_name || 'Đại học Bách Khoa (DUT)'}</div>
              </div>
              <div>
                <strong style={{ color: '#94a3b8', fontSize: '12px' }}>MÃ SINH VIÊN (MSSV):</strong>
                <div style={{ fontWeight: 'bold', color: '#fbbf24', fontSize: '16px' }}>{reviewParticipant.student_id || reviewParticipant.username || 'N/A'}</div>
              </div>
              <div>
                <strong style={{ color: '#94a3b8', fontSize: '12px' }}>KHOA:</strong>
                <div style={{ color: '#e2e8f0' }}>{reviewParticipant.faculty_name || 'N/A'}</div>
              </div>
              <div>
                <strong style={{ color: '#94a3b8', fontSize: '12px' }}>LỚP:</strong>
                <div style={{ color: '#e2e8f0' }}>{reviewParticipant.class_name || 'N/A'}</div>
              </div>
            </div>

            {/* Ảnh xác thực sinh viên (Chỉ hiển thị Thẻ sinh viên & Chân dung cầm thẻ) */}
            <h4 style={{ color: '#00c6ff', margin: '16px 0 10px 0' }}>📷 Ảnh Xác Thực Sinh Viên (Nhấp ảnh để phóng to)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {reviewParticipant.student_card_url ? (
                <div style={{ textAlign: 'center', background: '#0b0e24', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <small style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>🪪 Ảnh Thẻ Sinh Viên</small>
                  <img
                    src={reviewParticipant.student_card_url}
                    alt="Thẻ sinh viên"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => setZoomImage(reviewParticipant.student_card_url!)}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', background: '#0b0e24', padding: '20px', borderRadius: '10px', color: '#64748b' }}>
                  Chưa có ảnh thẻ sinh viên
                </div>
              )}

              {reviewParticipant.selfie_with_student_card_url ? (
                <div style={{ textAlign: 'center', background: '#0b0e24', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <small style={{ color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>🤳 Ảnh Chân Dung Cầm Thẻ SV</small>
                  <img
                    src={reviewParticipant.selfie_with_student_card_url}
                    alt="Selfie cầm thẻ"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => setZoomImage(reviewParticipant.selfie_with_student_card_url!)}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', background: '#0b0e24', padding: '20px', borderRadius: '10px', color: '#64748b' }}>
                  Chưa có ảnh chân dung cầm thẻ
                </div>
              )}
            </div>

            {/* Khung nhập lý do từ chối nếu nhấn Từ chối */}
            {isRejecting && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#f87171', fontWeight: 'bold', marginBottom: '6px' }}>
                  Lý do từ chối (Sẽ được gửi tự động qua email cho sinh viên) *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="VD: Ảnh thẻ sinh viên bị mờ, không nhìn rõ mã số sinh viên và họ tên. Vui lòng chụp lại rõ nét hơn."
                  rows={3}
                  style={{ width: '100%', background: '#0b0e24', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#ffffff', padding: '10px', outline: 'none' }}
                />
              </div>
            )}

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn-cancel" onClick={() => setShowReviewModal(false)} disabled={isSaving}>
                Đóng
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {isRejecting ? (
                  <>
                    <button type="button" className="btn-cancel" onClick={() => setIsRejecting(false)} disabled={isSaving}>
                      Hủy Từ Chối
                    </button>
                    <button
                      type="button"
                      className="btn-delete-confirm"
                      style={{ background: '#ef4444' }}
                      onClick={handleReject}
                      disabled={isSaving}
                    >
                      {isSaving ? '⏳ Đang gửi mail...' : '❌ Xác Nhận Từ Chối & Gửi Email'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-delete-confirm"
                      style={{ background: '#ef4444' }}
                      onClick={() => setIsRejecting(true)}
                      disabled={isSaving}
                    >
                      ❌ Từ Chối Hồ Sơ
                    </button>
                    <button
                      type="button"
                      className="btn-save"
                      style={{ background: '#22c55e' }}
                      onClick={handleApprove}
                      disabled={isSaving}
                    >
                      {isSaving ? '⏳ Đang lưu...' : '✅ Phê Duyệt Hồ Sơ (Approve)'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox phóng to ảnh */}
      {zoomImage && (
        <div className="modal-overlay" onClick={() => setZoomImage(null)}>
          <div style={{ maxWidth: '850px', width: '90%', textAlign: 'center' }}>
            <img src={zoomImage} alt="Giấy tờ phóng to" style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px' }} />
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Sinh Viên */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingParticipant ? '✏️ Chỉnh Sửa Sinh Viên' : '➕ Thêm Sinh Viên Mới'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmitForm}>
              <div className="form-row">
                <div className="form-group">
                  <label>Mã Sinh Viên (MSSV) *</label>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value.replace(/\D/g, '') }))}
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
                  <label>Email Liên Hệ *</label>
                  <input
                    required
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
                  <label>Khoa</label>
                  <input
                    value={form.faculty_name}
                    onChange={(e) => setForm((p) => ({ ...p, faculty_name: e.target.value }))}
                    placeholder="VD: Khoa Công nghệ Thông tin"
                    disabled={isSaving}
                  />
                </div>
                <div className="form-group">
                  <label>Lớp</label>
                  <input
                    value={form.class_name}
                    onChange={(e) => setForm((p) => ({ ...p, class_name: e.target.value }))}
                    placeholder="VD: 23TCLC_DT1"
                    disabled={isSaving}
                  />
                </div>
              </div>

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
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSaving}>Hủy</button>
                <button type="submit" className="btn-save" disabled={isSaving}>
                  {isSaving ? '⏳ Đang lưu...' : editingParticipant ? 'Cập Nhật' : 'Thêm Sinh Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Xóa */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h3>Xác Nhận Xóa Hồ Sơ Sinh Viên</h3>
            <p>Hành động này sẽ xóa vĩnh viễn dữ liệu người dùng khỏi hệ thống và không thể khôi phục. Bạn có chắc chắn không?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)} disabled={isSaving}>Hủy</button>
              <button className="btn-delete-confirm" onClick={handleDelete} disabled={isSaving}>
                {isSaving ? '⏳ Đang xóa...' : 'Xóa Sinh Viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
