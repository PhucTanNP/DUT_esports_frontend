/**
 * Type definitions for Vietnamese Administrative Units & Address Module
 * Cập nhật theo Nghị quyết sắp xếp đơn vị hành chính và QĐ 19/2025/QĐ-TTg (hiệu lực 01/07/2025)
 */

export interface Ward {
  code: string;
  name: string;
}

export interface Province {
  code: string;
  tms_code: string;
  name: string;
  wards: Ward[];
}

export interface AddressValue {
  province_code: string;
  ward_code: string;
  detailed_address: string;
  formatted_address?: string;
  province_name?: string;
  ward_name?: string;
}

export interface AddressErrors {
  province?: string;
  ward?: string;
  detailed?: string;
}
