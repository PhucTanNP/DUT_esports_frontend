import { z } from 'zod';
import type { Province, Ward, AddressValue } from '../types/address';
import administrativeUnitsRaw from '../data/administrative-units.json';

// Type assertion for the imported JSON
export const ADMINISTRATIVE_UNITS: Province[] = administrativeUnitsRaw as Province[];

// Default values for DUT ESPORTS (Đại học Bách Khoa - ĐH Đà Nẵng, Liên Chiểu)
export const DEFAULT_PROVINCE_CODE = '21'; // Thành phố Đà Nẵng
export const DEFAULT_WARD_CODE = '50109010'; // Phường Liên Chiểu
export const DEFAULT_PROVINCE_NAME = 'Thành phố Đà Nẵng';
export const DEFAULT_WARD_NAME = 'Phường Liên Chiểu';

/**
 * Zod Schema for Address validation
 * Enforces:
 * - province_code: non-empty string
 * - ward_code: non-empty string
 * - detailed_address: non-empty trimmed string
 */
export const AddressSchema = z.object({
  province_code: z.string().trim().min(1, 'Vui lòng chọn Tỉnh / Thành phố'),
  ward_code: z.string().trim().min(1, 'Vui lòng chọn Phường / Xã / Đặc khu'),
  detailed_address: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập địa chỉ cụ thể (số nhà, đường, hội trường, phòng máy...)')
    .max(255, 'Địa chỉ cụ thể không được vượt quá 255 ký tự'),
});

/**
 * Lấy danh sách 34 Tỉnh/Thành phố mới.
 * Tự động đưa Đà Nẵng lên đầu danh sách để ưu tiên trải nghiệm sinh viên DUT.
 */
export function getProvinces(): Province[] {
  const daNang = ADMINISTRATIVE_UNITS.find((p) => p.code === DEFAULT_PROVINCE_CODE);
  const others = ADMINISTRATIVE_UNITS.filter((p) => p.code !== DEFAULT_PROVINCE_CODE);
  return daNang ? [daNang, ...others] : [...ADMINISTRATIVE_UNITS];
}

/**
 * Tìm Tỉnh/Thành phố theo mã (hỗ trợ cả mã BNV 2 chữ số và mã TMS 3 chữ số)
 */
export function getProvinceByCode(code?: string | null): Province | undefined {
  if (!code) return undefined;
  const cleanCode = code.trim();
  return ADMINISTRATIVE_UNITS.find(
    (p) => p.code === cleanCode || p.tms_code === cleanCode || p.code === cleanCode.padStart(2, '0')
  );
}

/**
 * Tìm Tỉnh/Thành phố theo tên (hỗ trợ tìm kiếm gần đúng, bỏ qua chữ "Tỉnh", "Thành phố", "TP", "Tp")
 */
export function getProvinceByName(name?: string | null): Province | undefined {
  if (!name) return undefined;
  const normalizedInput = normalizeLocationName(name);

  // Exact or contains match
  return ADMINISTRATIVE_UNITS.find((p) => {
    const normProv = normalizeLocationName(p.name);
    return (
      normProv === normalizedInput ||
      normProv.includes(normalizedInput) ||
      normalizedInput.includes(normProv)
    );
  });
}

/**
 * Lấy danh sách Phường / Xã / Đặc khu theo mã Tỉnh/Thành phố
 */
export function getWardsByProvince(provinceCode?: string | null): Ward[] {
  if (!provinceCode) return [];
  const province = getProvinceByCode(provinceCode);
  return province ? province.wards : [];
}

/**
 * Tìm Phường/Xã/Đặc khu theo mã trong một Tỉnh
 */
export function getWardByCode(provinceCode?: string | null, wardCode?: string | null): Ward | undefined {
  if (!provinceCode || !wardCode) return undefined;
  const wards = getWardsByProvince(provinceCode);
  return wards.find((w) => w.code === wardCode.trim());
}

/**
 * Sinh chuỗi địa chỉ hoàn chỉnh theo chuẩn 3 cấp:
 * "{detailed_address}, {ward_name}, {province_name}"
 */
export function formatAddress(addr: Partial<AddressValue>): string {
  const detailed = addr.detailed_address?.trim() || '';
  
  let provinceName = addr.province_name?.trim();
  let wardName = addr.ward_name?.trim();

  // If names are not provided directly, lookup from codes
  if (addr.province_code) {
    const prov = getProvinceByCode(addr.province_code);
    if (prov) {
      provinceName = prov.name;
      if (addr.ward_code) {
        const ward = prov.wards.find((w) => w.code === addr.ward_code?.trim());
        if (ward) {
          wardName = ward.name;
        }
      }
    }
  }

  // Fallback defaults if still empty
  provinceName = provinceName || DEFAULT_PROVINCE_NAME;
  wardName = wardName || DEFAULT_WARD_NAME;

  const parts = [detailed, wardName, provinceName].filter(Boolean);
  return parts.join(', ');
}

/**
 * Phân tích ngược chuỗi địa chỉ (legacy text hoặc chuỗi chuẩn) thành Object AddressValue
 */
export function parseAddressString(rawString?: string | null): AddressValue {
  if (!rawString || !rawString.trim()) {
    return {
      province_code: DEFAULT_PROVINCE_CODE,
      ward_code: DEFAULT_WARD_CODE,
      detailed_address: '',
      province_name: DEFAULT_PROVINCE_NAME,
      ward_name: DEFAULT_WARD_NAME,
      formatted_address: '',
    };
  }

  const raw = rawString.trim();
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);

  // Default fallback
  let resolvedProvince = getProvinceByCode(DEFAULT_PROVINCE_CODE);
  let resolvedWard: Ward | undefined = resolvedProvince?.wards.find((w) => w.code === DEFAULT_WARD_CODE);
  let resolvedDetailed = raw;

  if (parts.length >= 3) {
    // Expected structure: [detailed..., ward, province]
    const provincePart = parts[parts.length - 1];
    const wardPart = parts[parts.length - 2];
    const detailedParts = parts.slice(0, parts.length - 2);

    const matchedProv = getProvinceByName(provincePart);
    if (matchedProv) {
      resolvedProvince = matchedProv;
      // Search ward inside this province
      const normWard = normalizeLocationName(wardPart);
      const matchedWard = matchedProv.wards.find((w) => {
        const nw = normalizeLocationName(w.name);
        return nw === normWard || nw.includes(normWard) || normWard.includes(nw);
      });

      if (matchedWard) {
        resolvedWard = matchedWard;
      } else {
        // Fallback to first ward if not found
        resolvedWard = matchedProv.wards[0];
      }
      resolvedDetailed = detailedParts.join(', ');
    }
  } else if (parts.length === 2) {
    // Might be [detailed, province] or [ward, province]
    const provincePart = parts[1];
    const matchedProv = getProvinceByName(provincePart);
    if (matchedProv) {
      resolvedProvince = matchedProv;
      resolvedWard = matchedProv.wards[0];
      resolvedDetailed = parts[0];
    }
  }

  const provinceCode = resolvedProvince?.code || DEFAULT_PROVINCE_CODE;
  const wardCode = resolvedWard?.code || DEFAULT_WARD_CODE;
  const provinceName = resolvedProvince?.name || DEFAULT_PROVINCE_NAME;
  const wardName = resolvedWard?.name || DEFAULT_WARD_NAME;

  return {
    province_code: provinceCode,
    ward_code: wardCode,
    detailed_address: resolvedDetailed,
    province_name: provinceName,
    ward_name: wardName,
    formatted_address: formatAddress({
      province_code: provinceCode,
      ward_code: wardCode,
      detailed_address: resolvedDetailed,
      province_name: provinceName,
      ward_name: wardName,
    }),
  };
}

/**
 * Chuẩn hóa chuỗi địa danh để so khớp (bỏ dấu tiếng Việt, viết thường, bỏ tiền tố cấp bậc)
 */
function normalizeLocationName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\b(tinh|thanh pho|tp|quan|huyen|thi xa|phuong|xa|dac khu)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
