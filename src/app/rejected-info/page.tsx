'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { authAPI } from '../../services/auth.service';
import type { SafeUser } from '../../types';
import { formatExpiryTime, getExpiryDate, getTimeRemaining } from '../../utils/date';
import '../../styles/StatusPages.css';

export default function RejectedInfoPage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [remainingText, setRemainingText] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const raw = localStorage.getItem('student_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SafeUser;
        setUser(parsed);

        if (parsed.status === 'approved') {
          window.location.href = '/';
        } else if (parsed.status === 'pending') {
          window.location.href = '/pending-approval';
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Cập nhật countdown thời gian còn lại
  useEffect(() => {
    const updateCountdown = () => {
      const expiry = getExpiryDate(user?.rejected_at || user?.updated_at, 3);
      const remaining = getTimeRemaining(expiry);
      setRemainingText(remaining.text);
      setIsExpired(remaining.isExpired);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // cập nhật mỗi phút
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    authAPI.logout();
    window.location.href = '/';
  };

  const formattedExpiry = formatExpiryTime(user?.rejected_at || user?.updated_at, 3);

  return (
    <div className="status-page-wrapper">
      <Header user={user} onLogoutClick={handleLogout} />

      <main className="status-container">
        <div className="status-card status-card-rejected">
          {/* Icon Cảnh báo lỗi */}
          <div className="status-icon-rejected-wrap">
            <span className="status-icon-rejected" role="img" aria-label="Warning">
              🚨
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="status-badge status-badge-rejected">
              <span className="status-badge-dot" />
              Đã Bị Từ Chối
            </div>

            {/* Text: Hồ sơ đăng ký của bạn đã bị từ chối */}
            <h1 className="status-title">Hồ sơ đăng ký của bạn đã bị từ chối.</h1>
          </div>

          {/* Hiển thị lý do từ chối: Lý do: [rejection_reason] */}
          <div className="status-reason-box">
            <div className="status-reason-header">
              <span>⚠️</span>
              <span>Lý do từ chối xét duyệt:</span>
            </div>
            <div className="status-reason-text">
              {user?.rejection_reason || 'Thông tin hoặc hình ảnh xác thực sinh viên chưa hợp lệ hoặc bị mờ. Vui lòng tải lại ảnh mới rõ nét.'}
            </div>
          </div>

          {/* CẢNH BÁO MÀU ĐỎ: XÓA VĨNH VIỄN SAU 3 NGÀY */}
          <div className="status-danger-alert">
            <div className="status-danger-alert-title">
              <span>⏰</span>
              <span>CẢNH BÁO THỜI HẠN LƯU TRỮ HỒ SƠ</span>
            </div>
            <p className="status-danger-alert-text">
              Cảnh báo: Hồ sơ đăng ký của bạn sẽ bị xóa vĩnh viễn vào lúc{' '}
              <span className="status-danger-alert-time">{formattedExpiry}</span> nếu không cập nhật lại thông tin.
            </p>

            <div className="status-countdown-tag">
              <span>⏳</span>
              <span>Thời gian còn lại: <strong>{remainingText || '3 ngày'}</strong></span>
            </div>
          </div>

          {/* Tóm tắt thông tin hồ sơ cũ */}
          {user && (
            <div className="status-details-box" style={{ marginBottom: '20px' }}>
              <div className="status-details-title">
                <span>👤</span>
                <span>Thông tin tài khoản</span>
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
                  <span className="status-info-label">Email tài khoản</span>
                  <span className="status-info-value">{user.email || 'N/A'}</span>
                </div>

                <div className="status-info-item">
                  <span className="status-info-label">Trường</span>
                  <span className="status-info-value">{user.faculty || user.faculty_name || 'Đại học Bách Khoa - ĐHĐN'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Nút hành động: Cập nhật lại thông tin -> /update-registration */}
          <div className="status-actions">
            <Link href="/update-registration" className="status-btn status-btn-primary">
              ✏️ Cập nhật lại thông tin
            </Link>

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
