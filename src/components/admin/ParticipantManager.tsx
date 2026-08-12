'use client';

import { useEffect, useState } from 'react';
import { participantAPI, type ParticipantRow } from '../../services/participant.service';
import type { Pagination } from '../../types';
import '../../styles/admin/CTVManager.css';
import '../../styles/admin/ParticipantManager.css';

const DUT_FACULTY_MAP: Record<string, string> = {
  '101': 'Khoa Cơ Khí',
  '102': 'Khoa Công Nghệ Thông Tin',
  '103': 'Khoa Cơ Khí Giao Thông',
  '104': 'Khoa Công Nghệ Nhiệt - Điện Lạnh',
  '105': 'Khoa Điện',
  '106': 'Khoa Điện Tử - Viễn Thông',
  '107': 'Khoa Hóa',
  '109': 'Khoa Xây Dựng Cầu Đường',
  '110': 'Khoa Xây Dựng Dân Dụng & Công Nghiệp',
  '111': 'Khoa Xây Dựng Công Trình Thủy',
  '117': 'Khoa Môi Trường',
  '118': 'Khoa Quản Lý Dự Án',
  '121': 'Khoa Kiến Trúc',
  '123': 'Khoa Khoa Học Công Nghệ Tiên Tiến',
};

interface ParticipantForm {
  account_type: 'dut' | 'free';
  username: string;
  full_name: string;
  class_name: string;
  faculty_name: string;
  password?: string;
}

const emptyForm: ParticipantForm = {
  account_type: 'dut',
  username: '',
  full_name: '',
  class_name: '',
  faculty_name: '',
  password: '',
};

const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: 10, pages: 1 };

export default function ParticipantManager() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterAccountType, setFilterAccountType] = useState<'all' | 'dut' | 'free'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [form, setForm] = useState<ParticipantForm>(emptyForm);

  // Delete Confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await participantAPI.getAll(search, filterAccountType, page, 10);

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
    void (async () => {
      await loadParticipants();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterAccountType, page]);

  const getAvatarLetter = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'P';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingParticipant(null);
    setShowModal(true);
  };

  const openEdit = (user: ParticipantRow) => {
    setForm({
      account_type: user.account_type,
      username: user.username ?? '',
      full_name: user.full_name ?? '',
      faculty_name: user.faculty_name ?? '',
      class_name: user.class_name ?? '',
      password: '',
    });
    setEditingParticipant(user.id);
    setShowModal(true);
  };

  // Tự động nhận diện Khoa khi gõ MSSV (3 số đầu)
  const detectedFaculty = form.account_type === 'dut' && form.username.trim().length >= 3
    ? DUT_FACULTY_MAP[form.username.trim().slice(0, 3)] || null
    : null;

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanUsername = form.username.trim();

    if (!cleanUsername) {
      setError(form.account_type === 'dut' ? 'Mã số sinh viên (MSSV) là bắt buộc' : 'Tên đăng nhập là bắt buộc');
      return;
    }

    if (!form.full_name.trim()) {
      setError('Họ và tên là bắt buộc');
      return;
    }

    // Validation cho Sinh Viên DUT
    if (form.account_type === 'dut') {
      if (!/^\d{9}$/.test(cleanUsername)) {
        setError('MSSV không hợp lệ (phải bao gồm đúng 9 chữ số)');
        return;
      }

      const prefix = cleanUsername.slice(0, 3);
      if (!DUT_FACULTY_MAP[prefix]) {
        setError(`3 số đầu MSSV (${prefix}) không thuộc Khoa nào trong hệ thống DUT`);
        return;
      }
    }

    if (!editingParticipant && (!form.password || form.password.length < 6)) {
      setError('Mật khẩu khi tạo mới là bắt buộc và phải có ít nhất 6 ký tự');
      return;
    }

    if (editingParticipant && form.password && form.password.length < 6) {
      setError('Mật khẩu cập nhật phải có ít nhất 6 ký tự');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      let result;

      const payload = {
        account_type: form.account_type,
        username: cleanUsername,
        full_name: form.full_name.trim(),
        ...(form.account_type === 'dut' ? {
          class_name: form.class_name.trim() || undefined,
          faculty_name: detectedFaculty || form.faculty_name.trim() || undefined,
        } : {}),
        ...(form.password ? { password: form.password } : {}),
      };

      if (editingParticipant) {
        result = await participantAPI.update(editingParticipant, payload);
      } else {
        result = await participantAPI.create({
          ...payload,
          password: form.password!,
        });
      }

      if (result.success) {
        setSuccessMessage(result.message || 'Lưu thông tin người dùng thành công');
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
              placeholder="Tìm kiếm MSSV, Tên đăng nhập, Họ tên, Khoa, Lớp..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="filter-group">
            <button
              className={`filter-btn ${filterAccountType === 'all' ? 'active' : ''}`}
              onClick={() => { setFilterAccountType('all'); setPage(1); }}
            >
              Tất cả <span className="filter-count">{pagination.total}</span>
            </button>
            <button
              className={`filter-btn ${filterAccountType === 'dut' ? 'active' : ''}`}
              onClick={() => { setFilterAccountType('dut'); setPage(1); }}
            >
              🎓 Sinh viên DUT
            </button>
            <button
              className={`filter-btn ${filterAccountType === 'free' ? 'active' : ''}`}
              onClick={() => { setFilterAccountType('free'); setPage(1); }}
            >
              🌐 Tài khoản tự do
            </button>
          </div>
        </div>
        <button className="btn-add" onClick={openAdd} disabled={isSaving}>
          <span>+</span> Thêm Người Dùng
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="table-container">
          <div className="loading-spinner">⏳ Đang tải danh sách người dùng...</div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người Dùng / Tên Đăng Nhập</th>
                  <th>Loại Tài Khoản</th>
                  <th>Khoa & Lớp</th>
                  <th>Ngày Tạo</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Không tìm thấy người dùng nào phù hợp
                    </td>
                  </tr>
                ) : (
                  participants.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td>
                        <div className="participant-cell">
                          <div className="participant-avatar">{getAvatarLetter(user.full_name)}</div>
                          <div className="participant-info">
                            <span className="participant-name">{user.full_name}</span>
                            <span className="participant-mssv">🆔 {user.username}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {user.account_type === 'dut' ? (
                          <span className="status-badge status-active">🎓 Sinh viên DUT</span>
                        ) : (
                          <span className="status-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}>
                            🌐 Tự do
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="academic-cell">
                          <span className="academic-faculty">{user.faculty_name || 'Không thuộc DUT'}</span>
                          {user.class_name && <span className="academic-class">Lớp: {user.class_name}</span>}
                        </div>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <div className="action-btns">
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
                  ))
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

          <div className="table-footer">Hiển thị {participants.length} / {pagination.total} người dùng</div>
        </>
      )}

      {/* Modal Thêm / Sửa Người Dùng */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingParticipant ? '✏️ Chỉnh Sửa Người Dùng' : '➕ Thêm Người Dùng Mới'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmitForm}>
              <div className="form-row">
                <div className="form-group">
                  <label>Loại Tài Khoản *</label>
                  <select
                    value={form.account_type}
                    onChange={(e) => setForm((p) => ({ ...p, account_type: e.target.value as 'dut' | 'free' }))}
                    disabled={isSaving}
                  >
                    <option value="dut">Sinh viên DUT (DUT Account)</option>
                    <option value="free">Tài khoản tự do (Free Account)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{form.account_type === 'dut' ? 'Mã Số Sinh Viên (MSSV) * (Đúng 9 số)' : 'Tên Đăng Nhập (Username) *'}</label>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                    placeholder={form.account_type === 'dut' ? 'VD: 102210123' : 'VD: user123'}
                    maxLength={form.account_type === 'dut' ? 9 : 32}
                    disabled={isSaving}
                  />
                  {form.account_type === 'dut' && form.username.trim().length >= 3 && (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: detectedFaculty ? '#10B981' : '#EF4444' }}>
                      {detectedFaculty ? `✓ ${detectedFaculty}` : `✕ Mã khoa (${form.username.trim().slice(0, 3)}) không thuộc DUT`}
                    </div>
                  )}
                </div>
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

              {/* Chỉ hiển thị Khoa và Lớp đối với Tài khoản Sinh viên DUT */}
              {form.account_type === 'dut' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Khoa (Tự động nhận diện từ 3 số đầu MSSV)</label>
                    <input
                      value={detectedFaculty || form.faculty_name}
                      onChange={(e) => setForm((p) => ({ ...p, faculty_name: e.target.value }))}
                      placeholder="Tự động điền theo MSSV"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Lớp (class_name)</label>
                    <input
                      value={form.class_name}
                      onChange={(e) => setForm((p) => ({ ...p, class_name: e.target.value }))}
                      placeholder="VD: 21TCLC_DT"
                      disabled={isSaving}
                    />
                  </div>
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
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSaving}>Hủy</button>
                <button type="submit" className="btn-save" disabled={isSaving}>
                  {isSaving ? '⏳ Đang lưu...' : editingParticipant ? 'Cập Nhật' : 'Thêm Người Dùng'}
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
            <h3>Xác Nhận Xóa Hồ Sơ Người Dùng</h3>
            <p>Hành động này sẽ xóa vĩnh viễn dữ liệu người dùng khỏi bảng participants và không thể khôi phục. Bạn có chắc chắn không?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)} disabled={isSaving}>Hủy</button>
              <button className="btn-delete-confirm" onClick={handleDelete} disabled={isSaving}>
                {isSaving ? '⏳ Đang xóa...' : 'Xóa Người Dùng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
