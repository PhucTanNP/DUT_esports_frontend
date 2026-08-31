'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { authAPI } from '../../services/auth.service';
import { participantAPI } from '../../services/participant.service';
import type { SafeUser } from '../../types';
import '../../styles/StatusPages.css';

export default function PendingApprovalPage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('student_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SafeUser;
        setUser(parsed);

        // Nếu user đã được duyệt, chuyển thẳng về trang chủ
        if (parsed.status === 'approved') {
          window.location.href = '/';
        } else if (parsed.status === 'rejected') {
          window.location.href = '/rejected-info';
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Kiểm tra lại trạng thái xét duyệt từ server
  const handleCheckStatus = async () => {
    setIsChecking(true);
    setRefreshMessage(null);
    try {
      const res = await participantAPI.getMyProfile();
      if (res.success && res.data) {
        const updated = res.data as SafeUser;
        setUser(updated);
        localStorage.setItem('student_user', JSON.stringify(updated));

        if (updated.status === 'approved') {
          setRefreshMessage('🎉 Chúc mừng! Hồ sơ của bạn đã được Admin phê duyệt.');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else if (updated.status === 'rejected') {
          window.location.href = '/rejected-info';
        } else {
          setRefreshMessage('⏳ Hồ sơ vẫn đang trong hàng đợi chờ Ban Tổ Chức kiểm duyệt.');
        }
      } else {
        setRefreshMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    } catch (err) {
      setRefreshMessage('Lỗi kiểm tra: ' + (err as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    window.location.href = '/';
  };

  return (
    <div className="status-page-wrapper">
      <Header user={user} onLogoutClick={handleLogout} />

      <main className="status-container">
        <div className="status-card status-card-pending">
          {/* Icon đồng hồ cát xoay / loading phát sáng */}
          <div className="status-icon-pending-wrap">
            <span className="status-icon-pending" role="img" aria-label="Hourglass">
              ⏳
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="status-badge status-badge-pending">
              <span className="status-badge-dot" />
              Đang Chờ Xét Duyệt
            </div>

            <h1 className="status-title">Hồ Sơ Đang Chờ Phê Duyệt</h1>

            {/* Thông báo theo yêu cầu */}
            <div className="status-desc-highlight">
              📬 <strong>Đăng ký của bạn đang chờ Admin xét duyệt.</strong>
              <br />
              Vui lòng quay lại sau hoặc kiểm tra Email để nhận thông báo mới nhất từ Ban Tổ Chức.
            </div>
          </div>

          {/* Tóm tắt thông tin tài khoản */}
          {user && (
            <div className="status-details-box">
              <div className="status-details-title">
                <span>📋</span>
                <span>Thông tin hồ sơ đăng ký</span>
              </div>

              <div className="status-info-grid">
                <div className="status-info-item">
                  <span className="status-info-label">Họ và tên</span>
                  <span className="status-info-value">{user.full_name || 'N/A'}</span>
                </div>

                <div className="status-info-item">
                  <span className="status-info-label">Mã sinh viên (MSSV)</span>
                  <span className="status-info-value">{user.student_id || user.username || 'N/A'}</span>
                </div>

                <div className="status-info-item">
                  <span className="status-info-label">Trường / Đơn vị</span>
                  <span className="status-info-value">{user.faculty || user.faculty_name || 'Đại học Bách Khoa - ĐHĐN'}</span>
                </div>

                <div className="status-info-item">
                  <span className="status-info-label">Lớp sinh hoạt</span>
                  <span className="status-info-value">{user.class_name || 'Đang cập nhật'}</span>
                </div>
              </div>
            </div>
          )}

          {refreshMessage && (
            <div
              className="update-alert update-alert-success"
              style={{ marginBottom: '20px', textAlign: 'center', justifyContent: 'center' }}
            >
              {refreshMessage}
            </div>
          )}

          {/* Các nút hành động */}
          <div className="status-actions">
            <button
              type="button"
              className="status-btn status-btn-primary"
              onClick={handleCheckStatus}
              disabled={isChecking}
            >
              {isChecking ? '🔄 Đang kiểm tra trạng thái...' : '🔄 Kiểm tra lại trạng thái duyệt'}
            </button>

            <button
              type="button"
              className="status-btn status-btn-secondary"
              onClick={handleLogout}
            >
              🚪 Đăng xuất tài khoản
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
