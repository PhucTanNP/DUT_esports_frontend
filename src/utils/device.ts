/**
 * =============================================================================
 * DUT ESPORTS — DEVICE FINGERPRINT & TELEMETRY UTILITY
 * Quản lý mã máy duy nhất (Device Fingerprint) và thông tin thiết bị điểm danh
 * =============================================================================
 */

export interface DeviceTelemetry {
  deviceId: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
  language: string;
  timezone: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connectionType?: string;
  isIos: boolean;
  isSafari: boolean;
  isZalo: boolean;
  isHttp?: boolean;
  protocol?: string;
  collectedAt: string;
}

const STORAGE_KEY = 'dut_esports_device_id';

/**
 * Lấy hoặc sinh mới mã máy (Device ID) duy nhất lưu trong localStorage.
 * Định dạng: DUT-DEV-<timestamp36>-<randomHex>
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'DUT-DEV-SERVER';

  try {
    let devId = localStorage.getItem(STORAGE_KEY);
    if (!devId) {
      const timePart = Date.now().toString(36).toUpperCase();
      const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      devId = `DUT-DEV-${timePart}-${randPart}`;
      localStorage.setItem(STORAGE_KEY, devId);
    }
    return devId;
  } catch {
    return `DUT-DEV-EPHEMERAL-${Date.now()}`;
  }
}

/**
 * Kiểm tra thiết bị có phải iPhone / iPad / iPod không
 */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Kiểm tra trình duyệt Safari trên iOS/macOS
 */
export function isSafariBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|Android/.test(ua);
}

/**
 * Kiểm tra trình duyệt nhúng Zalo (Zalo In-App Browser)
 */
export function isZaloInApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Zalo/i.test(navigator.userAgent);
}

/**
 * Thu thập dữ liệu thông số máy và môi trường trình duyệt
 */
export function collectDeviceTelemetry(): DeviceTelemetry {
  const deviceId = getOrCreateDeviceId();

  if (typeof window === 'undefined') {
    return {
      deviceId,
      platform: 'unknown',
      userAgent: 'server',
      screenResolution: '0x0',
      language: 'vi-VN',
      timezone: 'Asia/Ho_Chi_Minh',
      isIos: false,
      isSafari: false,
      isZalo: false,
      collectedAt: new Date().toISOString(),
    };
  }

  const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0} (@${window.devicePixelRatio || 1}x)`;
  const nav = navigator as any;

  return {
    deviceId,
    platform: nav.userAgentData?.platform || nav.platform || 'Unknown',
    userAgent: nav.userAgent || '',
    screenResolution: screenRes,
    language: nav.language || 'vi-VN',
    timezone: Intl?.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Ho_Chi_Minh',
    hardwareConcurrency: nav.hardwareConcurrency || undefined,
    deviceMemory: nav.deviceMemory || undefined,
    connectionType: nav.connection?.effectiveType || undefined,
    isIos: isIosDevice(),
    isSafari: isSafariBrowser(),
    isZalo: isZaloInApp(),
    isHttp: typeof window !== 'undefined' ? window.location.protocol === 'http:' : false,
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'http:',
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Trả về chuỗi JSON thông tin thiết bị để lưu vào database
 */
export function getDeviceInfoString(): string {
  return JSON.stringify(collectDeviceTelemetry());
}
