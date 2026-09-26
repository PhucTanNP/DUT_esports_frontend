/**
 * Utility hỗ trợ xử lý và định dạng ngày giờ cho hệ thống.
 */

/**
 * Định dạng ngày giờ chuẩn: HH:mm DD/MM/YYYY (ví dụ: 14:30 25/08/2026)
 */
export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'N/A';

  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return 'N/A';

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return 'N/A';
  }
}

/**
 * Tính ngày giờ hết hạn (mặc định = rejected_at + 3 ngày)
 */
export function getExpiryDate(rejectedAt?: string | Date | null, daysToAdd = 3): Date | null {
  if (!rejectedAt) {
    // Fallback nếu chưa có rejected_at: tính từ thời điểm hiện tại
    return new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  try {
    const base = typeof rejectedAt === 'string' ? new Date(rejectedAt) : rejectedAt;
    if (isNaN(base.getTime())) {
      return new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    }
    return new Date(base.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  } catch {
    return new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
  }
}

/**
 * Lấy chuỗi định dạng ngày giờ hết hạn (HH:mm DD/MM/YYYY)
 */
export function formatExpiryTime(rejectedAt?: string | Date | null, daysToAdd = 3): string {
  const expiry = getExpiryDate(rejectedAt, daysToAdd);
  return formatDateTime(expiry);
}

/**
 * Tính thời gian còn lại trước khi hết hạn
 */
export function getTimeRemaining(expiryDateInput?: Date | string | null): {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  text: string;
} {
  if (!expiryDateInput) {
    return { days: 0, hours: 0, minutes: 0, isExpired: false, text: '3 ngày' };
  }

  const exp = typeof expiryDateInput === 'string' ? new Date(expiryDateInput) : expiryDateInput;
  const now = new Date();
  const diff = exp.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, text: 'Đã hết hạn' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let text = '';
  if (days > 0) text += `${days} ngày `;
  if (hours > 0 || days > 0) text += `${hours} giờ `;
  text += `${minutes} phút`;

  return { days, hours, minutes, isExpired: false, text: text.trim() };
}

/**
 * Chuyển ISO string từ backend (ví dụ: "2026-09-02T03:47:00.000Z")
 * thành chuỗi định dạng cho <input type="datetime-local"> ở giờ địa phương (YYYY-MM-DDTHH:mm).
 * Ngăn ngừa triệt để lỗi lệch 7 tiếng khi hiển thị trong form Admin/CTV.
 */
export function toDatetimeLocalValue(isoStr?: string | Date | null): string {
  if (!isoStr) return '';
  const d = typeof isoStr === 'string' ? new Date(isoStr) : isoStr;
  if (isNaN(d.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Chuyển chuỗi datetime-local ("YYYY-MM-DDTHH:mm" theo giờ địa phương)
 * thành ISO string chuẩn UTC (với đuôi Z) để gửi lên backend lưu vào CSDL.
 */
export function toISOStringFromLocal(localStr?: string | null): string {
  if (!localStr) return '';
  if (localStr.endsWith('Z') || localStr.includes('+')) return localStr;

  const d = new Date(localStr);
  return isNaN(d.getTime()) ? localStr : d.toISOString();
}
