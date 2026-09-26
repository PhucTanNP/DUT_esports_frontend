'use client';

import React, { useEffect, useState } from 'react';
import { organizerAPI } from '../../services/organizer.service';
import type {
  OrganizerRole,
  OrganizerType,
  SafeUser,
  Tournament,
  TournamentOrganizer,
} from '../../types';
import '../../styles/admin/TournamentOrganizersTab.css';

interface Props {
  tournament: Tournament;
  onClose?: () => void;
}

const ROLE_LABELS: Record<OrganizerRole, { label: string; icon: string }> = {
  lead_organizer: { label: 'Trưởng Ban Tổ Chức', icon: '👑' },
  co_organizer: { label: 'Đồng Trưởng Ban', icon: '🤝' },
  referee: { label: 'Trọng Tài Thi Đấu', icon: '⚖️' },
  seasonal_staff: { label: 'CTV Thời Vụ (Điểm Danh / Điều Phối)', icon: '📋' },
  support_staff: { label: 'Ban Kỹ Thuật & Hỗ Trợ', icon: '🛠️' },
};

export default function TournamentOrganizersTab({ tournament, onClose: _onClose }: Props) {
  const [organizers, setOrganizers] = useState<TournamentOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetType, setTargetType] = useState<OrganizerType>('seasonal');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<SafeUser[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<SafeUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrganizerRole>('seasonal_staff');
  const [customTitle, setCustomTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit modal state
  const [editingOrganizer, setEditingOrganizer] = useState<TournamentOrganizer | null>(null);
  const [editRole, setEditRole] = useState<OrganizerRole>('seasonal_staff');
  const [editCustomTitle, setEditCustomTitle] = useState('');

  const loadOrganizers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await organizerAPI.getByTournament(tournament.id);
      if (res.success && res.data) {
        setOrganizers(res.data);
      } else {
        setError(res.message || 'Không thể tải danh sách Ban Tổ Chức');
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizers();
  }, [tournament.id]);

  // Search candidates when query or targetType changes
  useEffect(() => {
    if (!showAddModal) return;
    const timer = setTimeout(async () => {
      try {
        if (targetType === 'permanent') {
          const res = await organizerAPI.getCandidateUsers(candidateQuery);
          if (res.success && res.data) setCandidates(res.data);
        } else {
          const res = await organizerAPI.getCandidateParticipants(candidateQuery);
          if (res.success && res.data) setCandidates(res.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [candidateQuery, targetType, showAddModal]);

  const handleOpenAdd = (defaultType: OrganizerType = 'seasonal') => {
    setTargetType(defaultType);
    setSelectedRole(defaultType === 'permanent' ? 'co_organizer' : 'seasonal_staff');
    setCustomTitle(defaultType === 'seasonal' ? 'CTV Điểm danh & Điều phối' : 'Đồng Trưởng BTC');
    setSelectedCandidate(null);
    setCandidateQuery('');
    setModalError(null);
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) {
      setModalError('Vui lòng chọn một người từ danh sách tìm kiếm');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);

      const payload = {
        organizer_type: targetType,
        user_id: targetType === 'permanent' ? selectedCandidate.id : undefined,
        participant_id: targetType === 'seasonal' ? selectedCandidate.id : undefined,
        role: selectedRole,
        custom_title: customTitle.trim() || undefined,
      };

      const res = await organizerAPI.add(tournament.id, payload);
      if (res.success) {
        setShowAddModal(false);
        loadOrganizers();
      } else {
        setModalError(res.message || 'Lỗi khi gán thành viên');
      }
    } catch (err) {
      setModalError('Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (org: TournamentOrganizer) => {
    setEditingOrganizer(org);
    setEditRole(org.role);
    setEditCustomTitle(org.custom_title || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrganizer) return;

    try {
      setIsSubmitting(true);
      const res = await organizerAPI.update(tournament.id, editingOrganizer.id, {
        role: editRole,
        custom_title: editCustomTitle,
      });
      if (res.success) {
        setEditingOrganizer(null);
        loadOrganizers();
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể cập nhật'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (organizerId: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi Ban Tổ Chức giải này?`)) return;

    try {
      const res = await organizerAPI.remove(tournament.id, organizerId);
      if (res.success) {
        loadOrganizers();
      } else {
        alert('❌ Lỗi: ' + (res.message || 'Không thể xóa'));
      }
    } catch (err) {
      alert('❌ Lỗi: ' + (err as Error).message);
    }
  };

  return (
    <div className="to-tab-container">
      <div className="to-header">
        <div className="to-title">
          <h3>
            <span>🛡️</span> Ban Tổ Chức Giải Đấu: {tournament.name}
          </h3>
          <p>Phân quyền điều hành cho CTV Thường trực và Sinh viên làm CTV Thời vụ (cấp E-Certificate BTC).</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="to-btn-add" onClick={() => handleOpenAdd('seasonal')}>
            <span>🎓</span> Gán CTV Thời Vụ (Sinh Viên)
          </button>
          <button className="to-btn-add" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }} onClick={() => handleOpenAdd('permanent')}>
            <span>👥</span> Gán CTV Thường Trực
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>⚠️ {error}</div>}

      {loading ? (
        <div className="to-empty">⏳ Đang tải danh sách Ban Tổ Chức...</div>
      ) : organizers.length === 0 ? (
        <div className="to-empty">
          <p>Chưa có thành viên nào trong Ban Tổ Chức của giải đấu này.</p>
          <button className="to-btn-add" style={{ marginTop: '12px' }} onClick={() => handleOpenAdd('seasonal')}>
            ➕ Gán Thành Viên Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="to-table-wrapper">
          <table className="to-table">
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
                const displayName = isSeasonal ? org.participant_name : org.user_name;
                const emailOrMssv = isSeasonal ? `MSSV: ${org.student_id || 'N/A'}` : org.user_email;
                const roleConfig = ROLE_LABELS[org.role] || { label: org.role, icon: '📌' };

                return (
                  <tr key={org.id}>
                    <td>
                      <div className="to-person-info">
                        <div className={`to-avatar ${isSeasonal ? 'seasonal' : ''}`}>
                          {displayName?.charAt(0).toUpperCase() || (isSeasonal ? 'S' : 'U')}
                        </div>
                        <div className="to-names">
                          <span className="to-name">{displayName || 'Chưa cập nhật tên'}</span>
                          <span className="to-subinfo">{emailOrMssv}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`to-badge-type ${org.organizer_type}`}>
                        {org.organizer_type === 'permanent' ? 'CTV Thường Trực' : 'CTV Thời Vụ (SV)'}
                      </span>
                    </td>
                    <td>
                      <div className="to-role-block">
                        <span className="to-role-name">
                          {roleConfig.icon} {roleConfig.label}
                        </span>
                        {org.custom_title && (
                          <span className="to-custom-title">"{org.custom_title}"</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        {org.assigned_by_name || 'Hệ thống'}
                      </span>
                    </td>
                    <td>
                      <div className="to-actions">
                        <button
                          className="to-btn-icon"
                          title="Chỉnh sửa vai trò"
                          onClick={() => handleEditOpen(org)}
                        >
                          ✏️
                        </button>
                        <button
                          className="to-btn-icon delete"
                          title="Xóa khỏi BTC"
                          onClick={() => handleDelete(org.id, displayName || 'thành viên')}
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
      )}

      {/* Modal Thêm Thành Viên BTC */}
      {showAddModal && (
        <div className="to-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="to-modal" onClick={(e) => e.stopPropagation()}>
            <div className="to-modal-header">
              <h4>➕ Gán Thành Viên Ban Tổ Chức</h4>
              <button className="to-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit} className="to-modal-body">
              {/* Type Switcher */}
              <div className="to-tab-switcher">
                <button
                  type="button"
                  className={targetType === 'seasonal' ? 'active' : ''}
                  onClick={() => {
                    setTargetType('seasonal');
                    setSelectedCandidate(null);
                    setSelectedRole('seasonal_staff');
                    setCustomTitle('CTV Điểm danh & Điều phối');
                  }}
                >
                  🎓 CTV Thời Vụ (Sinh Viên)
                </button>
                <button
                  type="button"
                  className={targetType === 'permanent' ? 'active' : ''}
                  onClick={() => {
                    setTargetType('permanent');
                    setSelectedCandidate(null);
                    setSelectedRole('co_organizer');
                    setCustomTitle('Đồng Trưởng BTC');
                  }}
                >
                  👥 CTV Thường Trực (Users)
                </button>
              </div>

              {/* Search candidate input */}
              <div className="to-form-group">
                <label>
                  {targetType === 'seasonal'
                    ? '🔍 Tìm kiếm Sinh viên đã KYC (MSSV / Họ tên):'
                    : '🔍 Tìm kiếm CTV Thường trực (Tên / Email):'}
                </label>
                <input
                  type="text"
                  className="to-input"
                  placeholder={targetType === 'seasonal' ? 'VD: 102220..., Nguyễn Văn A...' : 'VD: ctv1, email@...'}
                  value={candidateQuery}
                  onChange={(e) => setCandidateQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Candidates list box */}
              <div className="to-candidate-list">
                {candidates.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {candidateQuery ? 'Không tìm thấy kết quả phù hợp' : 'Đang tải danh sách gợi ý...'}
                  </div>
                ) : (
                  candidates.map((c) => {
                    const isSel = selectedCandidate?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`to-candidate-item ${isSel ? 'selected' : ''}`}
                        onClick={() => setSelectedCandidate(c)}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#ffffff' }}>{c.full_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {targetType === 'seasonal' ? `MSSV: ${c.student_id || 'N/A'} • ${c.faculty_name || ''}` : c.email}
                          </div>
                        </div>
                        {isSel && <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>✓ Đã chọn</span>}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Role selection */}
              <div className="to-form-group">
                <label>Vai Trò Trong Giải Đấu:</label>
                <select
                  className="to-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as OrganizerRole)}
                >
                  {targetType === 'permanent' ? (
                    <>
                      <option value="lead_organizer">👑 Trưởng Ban Tổ Chức</option>
                      <option value="co_organizer">🤝 Đồng Trưởng Ban</option>
                      <option value="referee">⚖️ Trọng Tài</option>
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

              {/* Custom Title */}
              <div className="to-form-group">
                <label>Chức Danh Tùy Biến (Hiển thị trên Giấy chứng nhận BTC):</label>
                <input
                  type="text"
                  className="to-input"
                  placeholder="VD: CTV Điểm danh & Điều phối phòng máy"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>

              {modalError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ {modalError}</div>}

              <div className="to-modal-footer">
                <button type="button" className="to-btn-cancel" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="to-btn-save" disabled={!selectedCandidate || isSubmitting}>
                  {isSubmitting ? '⏳ Đang lưu...' : '✅ Xác Nhận Gán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa Thành Viên BTC */}
      {editingOrganizer && (
        <div className="to-modal-overlay" onClick={() => setEditingOrganizer(null)}>
          <div className="to-modal" onClick={(e) => e.stopPropagation()}>
            <div className="to-modal-header">
              <h4>✏️ Chỉnh Sửa Vai Trò Thành Viên BTC</h4>
              <button className="to-modal-close" onClick={() => setEditingOrganizer(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="to-modal-body">
              <div className="to-form-group">
                <label>Thành viên:</label>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>
                  {editingOrganizer.organizer_type === 'seasonal'
                    ? editingOrganizer.participant_name
                    : editingOrganizer.user_name}
                </div>
              </div>

              <div className="to-form-group">
                <label>Vai Trò:</label>
                <select
                  className="to-select"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as OrganizerRole)}
                >
                  <option value="lead_organizer">👑 Trưởng Ban Tổ Chức</option>
                  <option value="co_organizer">🤝 Đồng Trưởng Ban</option>
                  <option value="referee">⚖️ Trọng Tài</option>
                  <option value="seasonal_staff">📋 CTV Thời Vụ</option>
                  <option value="support_staff">🛠️ Ban Hỗ Trợ</option>
                </select>
              </div>

              <div className="to-form-group">
                <label>Chức Danh Tùy Biến:</label>
                <input
                  type="text"
                  className="to-input"
                  value={editCustomTitle}
                  onChange={(e) => setEditCustomTitle(e.target.value)}
                />
              </div>

              <div className="to-modal-footer">
                <button type="button" className="to-btn-cancel" onClick={() => setEditingOrganizer(null)}>
                  Hủy
                </button>
                <button type="submit" className="to-btn-save" disabled={isSubmitting}>
                  {isSubmitting ? '⏳ Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
