/** Các hàm format dùng chung toàn app. */

/** dd/mm/yyyy hh:mm — dùng cho timeline, modal detail. */
export const formatDate = (date?: string | null): string =>
  date
    ? new Date(date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

/** dd/mm/yyyy — dùng cho bảng, danh sách. */
export const formatDateShort = (date?: string | null): string =>
  date ? new Date(date).toLocaleDateString('vi-VN') : 'N/A';

/** Định dạng tiền tệ VND. */
export const formatCurrency = (num?: number | null): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num ?? 0);

/** Ngày giờ đầy đủ (locale vi-VN). */
export const formatDateTime = (date?: string | null): string =>
  date ? new Date(date).toLocaleString('vi-VN') : '-';
