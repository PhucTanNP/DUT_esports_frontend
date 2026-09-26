/**
 * =============================================================================
 * DUT ESPORTS — TWO-STAGE GEOLOCATION ENGINE
 * Tối ưu hóa đặc thù cho Safari trên iPhone 11 & các dòng iOS cũ / Zalo Webview
 * =============================================================================
 */

import { isIosDevice, isSafariBrowser, isZaloInApp } from './device';

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  source: 'high_accuracy_gps' | 'low_accuracy_cell_wifi' | 'cached' | 'http_lan_fallback' | 'manual_pinpoint';
  isHttpFallback?: boolean;
  fallbackReason?: string;
  isManualPinpoint?: boolean;
}

export interface GeolocationDiagnosis {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'INSECURE_ORIGIN' | 'UNSUPPORTED' | 'UNKNOWN';
  message: string;
  guideTitle?: string;
  guideSteps?: string[];
  isIos: boolean;
  isZalo: boolean;
  isHttps: boolean;
}

/**
 * Tọa độ mặc định: Trường Đại học Bách Khoa - ĐH Đà Nẵng (DUT)
 * Dùng làm vị trí fallback khi điểm danh trên kết nối HTTP / Mạng LAN bị trình duyệt chặn GPS.
 */
export const DUT_CAMPUS_COORDINATES = {
  latitude: 16.0748,
  longitude: 108.1499,
  accuracy: 250,
};

/**
 * Sinh tọa độ fallback chế độ HTTP / Mạng LAN
 */
export function getHttpLanFallbackLocation(reason?: string): LocationResult {
  return {
    latitude: DUT_CAMPUS_COORDINATES.latitude,
    longitude: DUT_CAMPUS_COORDINATES.longitude,
    accuracy: DUT_CAMPUS_COORDINATES.accuracy,
    source: 'http_lan_fallback',
    isHttpFallback: true,
    fallbackReason:
      reason || 'Check-in chế độ HTTP (Mạng LAN): Đã ghi nhận tọa độ khu vực giải đấu DUT kèm Mã máy & IP thiết bị.',
  };
}

/**
 * Tạo kết quả tọa độ từ thao tác chấm / ghim vị trí chuẩn xác trên bản đồ Leaflet
 */
export function createManualPinpointLocation(latitude: number, longitude: number, accuracy: number = 3.0): LocationResult {
  return {
    latitude,
    longitude,
    accuracy,
    source: 'manual_pinpoint',
    isManualPinpoint: true,
    fallbackReason: `Đã chấm vị trí trực tiếp trên bản đồ Leaflet (Sai số: ±${accuracy.toFixed(1)}m)`,
  };
}

/**
 * Kiểm tra kết nối an toàn (HTTPS hoặc localhost).
 */
export function isSecureContextForGeolocation(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]'
  );
}

export interface HighPrecisionGpsOptions {
  /** Sai số mục tiêu tối đa mong muốn (mặc định: 4.0 mét) */
  targetAccuracyMeters?: number;
  /** Thời gian tối đa cho chip GPS hội tụ vệ tinh (mặc định: 15000ms / 15 giây) */
  maxWaitMs?: number;
  /** Cho phép fallback sang DUT campus nếu hoàn toàn không có GPS (mặc định: false) */
  allowFallback?: boolean;
  /** Callback cập nhật tiến trình dò vệ tinh & sai số theo thời gian thực */
  onProgress?: (progress: {
    accuracy: number;
    latitude: number;
    longitude: number;
    sampleCount: number;
    isTargetReached: boolean;
  }) => void;
}

/**
 * Thuật toán bắt GPS Vệ Tinh Đa Mẫu Độ Chính Xác Cao (< 4 mét):
 * - Sử dụng watchPosition để chip GNSS (GPS L1/L5, GLONASS) trên thiết bị có đủ thời gian hội tụ.
 * - Lọc và chọn mẫu có accuracy <= targetAccuracyMeters (mặc định: 4m).
 * - Nếu đạt ngưỡng mục tiêu: Lập tức dừng dò và trả về kết quả chính xác nhất.
 * - Nếu hết thời gian chờ (15s): Trả về mẫu có độ chính xác cao nhất (accuracy nhỏ nhất) thu thập được.
 */
export async function getHighPrecisionLocation(
  options?: HighPrecisionGpsOptions,
): Promise<LocationResult> {
  const targetAcc = options?.targetAccuracyMeters ?? 4.0;
  const maxWait = options?.maxWaitMs ?? 15000;
  const isSecure = isSecureContextForGeolocation();

  if (typeof window === 'undefined' || !navigator.geolocation) {
    if (options?.allowFallback) {
      return getHttpLanFallbackLocation('Trình duyệt không hỗ trợ Geolocation API.');
    }
    throw {
      code: 'UNSUPPORTED',
      message: 'Trình duyệt không hỗ trợ định vị GPS.',
      isIos: isIosDevice(),
      isZalo: isZaloInApp(),
      isHttps: isSecure,
    } as GeolocationDiagnosis;
  }

  return new Promise<LocationResult>((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null;
    let sampleCount = 0;
    let isSettled = false;
    let watchId: number | null = null;
    let timeoutId: any = null;

    const cleanup = () => {
      isSettled = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };

    timeoutId = setTimeout(() => {
      if (isSettled) return;
      cleanup();

      if (bestPosition) {
        console.info(`GPS converged with best accuracy: ±${bestPosition.coords.accuracy}m`);
        resolve({
          latitude: bestPosition.coords.latitude,
          longitude: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy,
          altitude: bestPosition.coords.altitude,
          heading: bestPosition.coords.heading,
          speed: bestPosition.coords.speed,
          source: bestPosition.coords.accuracy <= 5 ? 'high_accuracy_gps' : 'low_accuracy_cell_wifi',
        });
      } else {
        if (options?.allowFallback) {
          resolve(getHttpLanFallbackLocation('Hết thời gian dò tín hiệu GPS vệ tinh.'));
        } else {
          reject(
            diagnoseGeolocationError({
              code: 3,
              message: 'Không bắt được tín hiệu GPS vệ tinh trong thời gian quy định (Quá 15 giây).',
            }),
          );
        }
      }
    }, maxWait);

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isSettled) return;
          sampleCount++;
          const acc = pos.coords.accuracy;

          if (!bestPosition || acc < bestPosition.coords.accuracy) {
            bestPosition = pos;
          }

          if (options?.onProgress) {
            options.onProgress({
              accuracy: acc,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              sampleCount,
              isTargetReached: acc <= targetAcc,
            });
          }

          // Khi độ chính xác đạt chuẩn dưới 4 mét (hoặc mục tiêu): CHỐT NGAY
          if (acc <= targetAcc) {
            cleanup();
            console.info(`🎯 Target accuracy reached: ±${acc}m (< ${targetAcc}m)`);
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: acc,
              altitude: pos.coords.altitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              source: 'high_accuracy_gps',
            });
          }
        },
        (err) => {
          console.warn('GPS stream error:', err?.message || err);
          if (err.code === 1 && !bestPosition) {
            // Permission denied
            cleanup();
            if (options?.allowFallback) {
              resolve(getHttpLanFallbackLocation('Quyền truy cập vị trí bị từ chối.'));
            } else {
              reject(diagnoseGeolocationError(err));
            }
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: maxWait,
        },
      );
    } catch (e: any) {
      cleanup();
      if (options?.allowFallback) {
        resolve(getHttpLanFallbackLocation(e?.message));
      } else {
        reject(diagnoseGeolocationError(e));
      }
    }
  });
}

export interface LocationRequestOptions {
  /** Cho phép tự động fallback sang chế độ HTTP LAN nếu bị chặn GPS (Mặc định: true) */
  allowHttpFallback?: boolean;
}

/**
 * Engine định vị GPS Vệ Tinh chuẩn xác (mục tiêu sai số < 4 mét)
 * - Tự động stream dữ liệu vị trí liên tục từ chip GPS (GNSS) đến khi đạt sai số dưới 4 mét.
 * - Hỗ trợ fallback có kiểm soát nếu hoàn toàn không có tín hiệu GPS.
 */
export async function requestDeviceLocationWithFallback(
  options?: LocationRequestOptions & {
    targetAccuracyMeters?: number;
    onProgress?: HighPrecisionGpsOptions['onProgress'];
  },
): Promise<LocationResult> {
  const allowHttp = options?.allowHttpFallback !== false;

  try {
    return await getHighPrecisionLocation({
      targetAccuracyMeters: options?.targetAccuracyMeters ?? 4.0,
      maxWaitMs: 14000,
      allowFallback: allowHttp,
      onProgress: options?.onProgress,
    });
  } catch (err: any) {
    if (allowHttp) {
      return getHttpLanFallbackLocation(err?.message);
    }
    throw diagnoseGeolocationError(err);
  }
}

/**
 * Chẩn đoán chi tiết lỗi định vị và cung cấp hướng dẫn bật lại vị trí cho iPhone / Safari
 */
export function diagnoseGeolocationError(err: any): GeolocationDiagnosis {
  const isIos = isIosDevice();
  const isSafari = isSafariBrowser();
  const isZalo = isZaloInApp();
  const isHttps = isSecureContextForGeolocation();

  // 1. Nếu đã là GeolocationDiagnosis hoàn chỉnh (có guideSteps)
  if (
    err &&
    typeof err === 'object' &&
    typeof err.code === 'string' &&
    Array.isArray(err.guideSteps)
  ) {
    return err as GeolocationDiagnosis;
  }

  // 2. Trích xuất code và message an toàn (kể cả GeolocationPositionError có prototype getters)
  const errCode = typeof err?.code === 'number' ? err.code : 0;
  const rawCodeStr = typeof err?.code === 'string' ? err.code : '';
  const errMsg = typeof err?.message === 'string' ? err.message : String(err || '');

  const isDenied =
    errCode === 1 ||
    rawCodeStr === 'PERMISSION_DENIED' ||
    /denied|permission/i.test(errMsg);

  const isUnavailable =
    errCode === 2 ||
    rawCodeStr === 'POSITION_UNAVAILABLE' ||
    /unavailable|not available/i.test(errMsg);

  const isTimeout =
    errCode === 3 ||
    rawCodeStr === 'TIMEOUT' ||
    /timeout/i.test(errMsg);

  if (isDenied) {
    let steps: string[] = [];

    if (isZalo) {
      steps = [
        '1. Nhấn vào biểu tượng dấu 3 chấm "..." ở góc trên bên phải Zalo.',
        '2. Chọn "Mở bằng trình duyệt" (Safari).',
        '3. Khi Safari hỏi "Trang web muốn sử dụng vị trí hiện tại của bạn", hãy bấm "Cho phép" (Allow).',
      ];
    } else if (isIos && isSafari) {
      steps = [
        '1. Nhấn vào biểu tượng chữ "aA" (hoặc biểu tượng ổ khóa / cài đặt) ở bên trái thanh địa chỉ Safari.',
        '2. Chọn "Cài đặt trang web" (Website Settings).',
        '3. Tìm mục "Vị trí" (Location) -> Đổi từ "Từ chối" (Deny) sang "Hỏi" (Ask) hoặc "Cho phép" (Allow).',
        '4. Nếu vẫn không được: Vào "Cài đặt máy iPhone" -> "Quyền riêng tư & Bảo mật" -> "Dịch vụ định vị" -> Đảm bảo đã BẬT và mục "Trang web Safari" là "Khi dùng ứng dụng".',
      ];
    } else {
      steps = [
        '1. Nhấn vào biểu tượng ổ khóa hoặc cài đặt trang web bên cạnh thanh địa chỉ trình duyệt.',
        '2. Bật lại quyền truy cập Vị trí (Location) thành "Cho phép" (Allow).',
        '3. Tải lại trang web và thử lại.',
      ];
    }

    return {
      code: 'PERMISSION_DENIED',
      message: 'Quyền truy cập Vị trí (GPS) đã bị từ chối trên trình duyệt.',
      guideTitle: isIos ? 'Cách bật lại Vị trí trên iPhone / Safari:' : 'Cách cấp lại quyền Vị trí:',
      guideSteps: steps,
      isIos,
      isZalo,
      isHttps,
    };
  }

  if (isUnavailable) {
    return {
      code: 'POSITION_UNAVAILABLE',
      message: 'Không thể xác định vị trí hiện tại của thiết bị (Mất tín hiệu GPS hoặc đang ở vùng kín).',
      guideTitle: 'Gợi ý xử lý:',
      guideSteps: [
        '1. Đảm bảo điện thoại của bạn đã bật Định vị (Dịch vụ vị trí) trong Cài đặt.',
        '2. Nếu đang ở tầng hầm hoặc phòng kín, hãy di chuyển lại gần cửa sổ hoặc bật kết nối Wi-Fi để hỗ trợ định vị.',
        '3. Nhấn nút "Thử lại vị trí" hoặc bấm "Bỏ qua GPS & Điểm danh bằng Mã máy" bên dưới.',
      ],
      isIos,
      isZalo,
      isHttps,
    };
  }

  if (isTimeout) {
    return {
      code: 'TIMEOUT',
      message: 'Quá thời gian chờ phản hồi tọa độ từ chip GPS thiết bị.',
      guideTitle: 'Gợi ý xử lý:',
      guideSteps: [
        '1. Thiết bị iPhone mất nhiều thời gian hơn bình thường để dò vệ tinh GPS.',
        '2. Bật Wi-Fi (không cần kết nối mạng Wi-Fi, chỉ cần bật) để iOS hỗ trợ định vị tam giác sóng.',
        '3. Nhấn "Thử lại" hoặc bấm "Bỏ qua GPS & Điểm danh bằng Mã máy" bên dưới.',
      ],
      isIos,
      isZalo,
      isHttps,
    };
  }

  return {
    code: 'UNKNOWN',
    message: errMsg || 'Lỗi không xác định khi lấy vị trí.',
    guideTitle: 'Gợi ý xử lý:',
    guideSteps: [
      '1. Kiểm tra lại kết nối mạng của bạn.',
      '2. Nhấn nút "Thử lại vị trí" hoặc bấm nút "Bỏ qua GPS & Điểm danh bằng Mã máy/IP" bên dưới.',
    ],
    isIos,
    isZalo,
    isHttps,
  };
}
