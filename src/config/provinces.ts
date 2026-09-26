/**
 * Danh mục 34 Đơn vị hành chính cấp tỉnh mới của Việt Nam
 * Cập nhật chuẩn xác theo Nghị quyết sắp xếp đơn vị hành chính & Quyết định 19/2025/QĐ-TTg (hiệu lực 01/07/2025)
 * Nguồn dữ liệu đối chiếu: cac_phuong_xa_sau_sat_nhap.csv
 *
 * Mặc định Tỉnh/Thành phố: 'Thành phố Đà Nẵng' (Mã: 21)
 * Mặc định Phường/Xã: 'Phường Liên Chiểu' (Mã: 50109010)
 */

import {
  DEFAULT_PROVINCE_CODE,
  DEFAULT_WARD_CODE,
  DEFAULT_PROVINCE_NAME,
  DEFAULT_WARD_NAME,
  getProvinces,
  formatAddress,
  parseAddressString,
} from '../utils/address';

export const DEFAULT_PROVINCE = DEFAULT_PROVINCE_NAME;
export const DEFAULT_WARD = DEFAULT_WARD_NAME;

// 34 Tỉnh/Thành phố mới (Đà Nẵng đứng đầu)
export const VIETNAM_34_PROVINCES: readonly string[] = getProvinces().map((p) => p.name);

/**
 * Ghép 3 trường địa chỉ thành 1 chuỗi duy nhất để lưu CSDL và hiển thị
 * Định dạng chuẩn: "{Địa điểm cụ thể}, {Phường/Xã}, {Tỉnh/Thành phố}"
 */
export function formatFullLocation(
  specific?: string | null,
  ward?: string | null,
  province?: string | null
): string {
  const parts = [
    specific?.trim(),
    ward?.trim() || DEFAULT_WARD,
    province?.trim() || DEFAULT_PROVINCE,
  ].filter(Boolean) as string[];

  return parts.join(', ');
}

/**
 * Phân tích chuỗi địa chỉ cũ thành 3 thành phần: địa điểm cụ thể, phường/xã, tỉnh/thành phố
 */
export function parseLocation(fullLocation?: string | null): {
  specific: string;
  ward: string;
  province: string;
  province_code?: string;
  ward_code?: string;
} {
  const parsed = parseAddressString(fullLocation);
  return {
    specific: parsed.detailed_address,
    ward: parsed.ward_name || DEFAULT_WARD,
    province: parsed.province_name || DEFAULT_PROVINCE,
    province_code: parsed.province_code || DEFAULT_PROVINCE_CODE,
    ward_code: parsed.ward_code || DEFAULT_WARD_CODE,
  };
}

export {
  DEFAULT_PROVINCE_CODE,
  DEFAULT_WARD_CODE,
  formatAddress,
  parseAddressString,
};
