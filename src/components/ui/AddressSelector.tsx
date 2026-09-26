'use client';

import React, { useMemo } from 'react';
import type { AddressValue, AddressErrors } from '../../types/address';
import {
  getProvinces,
  getWardsByProvince,
  getProvinceByCode,
  getWardByCode,
  formatAddress,
  DEFAULT_PROVINCE_CODE,
} from '../../utils/address';
import '../../styles/AddressSelector.css';

export interface AddressSelectorProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  errors?: AddressErrors;
  required?: boolean;
  disabled?: boolean;
  showPreview?: boolean;
  title?: string;
  className?: string;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  value,
  onChange,
  errors,
  required = true,
  disabled = false,
  showPreview = true,
  title = '📍 Địa Điểm Tổ Chức Thi Đấu',
  className = '',
}) => {
  const provinces = useMemo(() => getProvinces(), []);

  // Lấy danh sách phường/xã/đặc khu phụ thuộc động theo Tỉnh/TP đã chọn
  const availableWards = useMemo(() => {
    return getWardsByProvince(value.province_code);
  }, [value.province_code]);

  // Xử lý khi người dùng thay đổi Tỉnh / Thành phố
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvinceCode = e.target.value;
    const prov = getProvinceByCode(newProvinceCode);
    const provName = prov?.name || '';

    // YÊU CẦU: Tự động reset trường Phường/Xã khi thay đổi Tỉnh/TP
    const updated: AddressValue = {
      province_code: newProvinceCode,
      ward_code: '', // Reset
      province_name: provName,
      ward_name: '',
      detailed_address: value.detailed_address,
      formatted_address: formatAddress({
        province_code: newProvinceCode,
        ward_code: '',
        province_name: provName,
        ward_name: '',
        detailed_address: value.detailed_address,
      }),
    };

    onChange(updated);
  };

  // Xử lý khi người dùng chọn Phường / Xã / Đặc khu
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newWardCode = e.target.value;
    const ward = getWardByCode(value.province_code, newWardCode);
    const wardName = ward?.name || '';

    const updated: AddressValue = {
      ...value,
      ward_code: newWardCode,
      ward_name: wardName,
      formatted_address: formatAddress({
        ...value,
        ward_code: newWardCode,
        ward_name: wardName,
      }),
    };

    onChange(updated);
  };

  // Xử lý khi người dùng nhập Địa chỉ cụ thể
  const handleDetailedAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDetailed = e.target.value;

    const updated: AddressValue = {
      ...value,
      detailed_address: newDetailed,
      formatted_address: formatAddress({
        ...value,
        detailed_address: newDetailed,
      }),
    };

    onChange(updated);
  };

  const isWardDisabled = disabled || !value.province_code;
  const currentFormatted = formatAddress(value);

  return (
    <div className={`address-selector-container ${className}`}>
      <div className="address-selector-header">
        <div className="address-selector-title">
          {title} {required && <span className="required-star">*</span>}
        </div>
        <div className="address-selector-badge">
          34 Tỉnh & 3.321 Xã/Đặc khu (01/07/2025)
        </div>
      </div>

      <div className="address-selector-grid">
        {/* 1. Tỉnh / Thành phố */}
        <div className="address-form-group">
          <label className="address-label" htmlFor="address-province-select">
            Tỉnh / Thành phố {required && <span className="required-star">*</span>}
          </label>
          <select
            id="address-province-select"
            className="address-select"
            value={value.province_code || ''}
            onChange={handleProvinceChange}
            disabled={disabled}
            required={required}
          >
            <option value="">-- Chọn Tỉnh / Thành phố --</option>
            {provinces.map((prov) => (
              <option key={prov.code} value={prov.code}>
                {prov.name} {prov.code === DEFAULT_PROVINCE_CODE ? '(DUT Default)' : ''}
              </option>
            ))}
          </select>
          <span className="address-hint">34 Đơn vị hành chính cấp tỉnh</span>
          {errors?.province && <span className="address-error">{errors.province}</span>}
        </div>

        {/* 2. Phường / Xã / Đặc khu (Cascading Dropdown) */}
        <div className="address-form-group">
          <label className="address-label" htmlFor="address-ward-select">
            Phường / Xã / Đặc khu {required && <span className="required-star">*</span>}
          </label>
          <select
            id="address-ward-select"
            className="address-select"
            value={value.ward_code || ''}
            onChange={handleWardChange}
            disabled={isWardDisabled}
            required={required}
          >
            {!value.province_code ? (
              <option value="">-- Vui lòng chọn Tỉnh / TP trước --</option>
            ) : (
              <>
                <option value="">-- Chọn Phường / Xã / Đặc khu --</option>
                {availableWards.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </>
            )}
          </select>
          <span className="address-hint">
            {isWardDisabled
              ? 'Chọn Tỉnh/TP để mở danh sách'
              : `${availableWards.length} Phường/Xã/Đặc khu`}
          </span>
          {errors?.ward && <span className="address-error">{errors.ward}</span>}
        </div>

        {/* 3. Địa chỉ cụ thể */}
        <div className="address-form-group">
          <label className="address-label" htmlFor="address-detailed-input">
            Địa chỉ cụ thể {required && <span className="required-star">*</span>}
          </label>
          <input
            id="address-detailed-input"
            type="text"
            className="address-input"
            value={value.detailed_address || ''}
            onChange={handleDetailedAddressChange}
            placeholder="Số nhà, tên đường, hội trường, phòng máy..."
            disabled={disabled}
            required={required}
          />
          <span className="address-hint">VD: Hội trường F - 54 Nguyễn Lương Bằng</span>
          {errors?.detailed && <span className="address-error">{errors.detailed}</span>}
        </div>
      </div>

      {/* Live Preview Banner */}
      {showPreview && (
        <div className="address-preview-banner">
          <span className="address-preview-label">
            👁️ Chuỗi địa chỉ hoàn chỉnh lưu CSDL:
          </span>
          <span
            className={`address-preview-value ${
              !value.detailed_address?.trim() ? 'empty' : ''
            }`}
          >
            {value.detailed_address?.trim()
              ? currentFormatted
              : currentFormatted
              ? `(Chưa nhập địa chỉ cụ thể), ${value.ward_name || ''}, ${value.province_name || ''}`
              : '(Chưa chọn đủ thông tin địa chỉ)'}
          </span>
        </div>
      )}
    </div>
  );
};

export default AddressSelector;
