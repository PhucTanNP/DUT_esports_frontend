import type { ApiResponse, SafeUser } from '../types';
import { apiRequest, API_BASE, getAuthHeader, removeAuthToken, setAuthToken } from './http';

// Re-export token helpers để component import trực tiếp từ service này
export { getAuthToken, removeAuthToken } from './http';

export const extractUserFromResponse = (response: ApiResponse<unknown>): SafeUser | null => {
  const payload = response as ApiResponse<unknown>;
  const candidates: unknown[] = [
    payload.user,
    (payload.data as { user?: SafeUser } | undefined)?.user,
    (payload.data as { participant?: SafeUser } | undefined)?.participant,
    (payload.data as { student?: SafeUser } | undefined)?.student,
    (payload.data as { profile?: SafeUser } | undefined)?.profile,
    payload.data,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;

    const maybeUser = candidate as Partial<SafeUser>;
    if (maybeUser.full_name || maybeUser.student_id || maybeUser.id || maybeUser.username || maybeUser.role) {
      return maybeUser as SafeUser;
    }
  }

  return null;
};

const persistStudentUser = (user: SafeUser | null) => {
  if (!user || typeof window === 'undefined') return;
  const role = user?.role?.toLowerCase();
  if (role === 'admin' || role === 'ctv') {
    sessionStorage.setItem('student_user', JSON.stringify(user));
    localStorage.removeItem('student_user');
  } else {
    localStorage.setItem('student_user', JSON.stringify(user));
  }
};

const persistAdminUser = (user: SafeUser | null, response?: ApiResponse<unknown>) => {
  const role = user?.role?.toLowerCase();
  const isAdminOrCtv = role === 'admin' || role === 'ctv' || response?.redirectTo === 'admin-dashboard' || response?.redirectTo === '/admin';
  if (isAdminOrCtv && typeof window !== 'undefined') {
    const adminObj = user ?? (response as any)?.user ?? (response as any)?.data ?? {};
    // Admin/CTV chỉ lưu trong sessionStorage để khi thoát web sẽ tự động đăng xuất
    sessionStorage.setItem('admin_user', JSON.stringify(adminObj));
    localStorage.removeItem('admin_user');
  }
};

/**
 * Trả về route tương ứng theo trạng thái duyệt hồ sơ của thí sinh:
 * - status === 'approved' -> '/' (cho phép vào dashboard / trang chủ)
 * - status === 'pending'  -> '/pending-approval' (chờ duyệt)
 * - status === 'rejected' -> '/rejected-info' (bị từ chối)
 */
export const getParticipantRouteByStatus = (status?: string | null, role?: string | null): string => {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === 'admin' || normalizedRole === 'ctv') {
    return '/admin';
  }

  const normalizedStatus = status?.toLowerCase();
  if (normalizedStatus === 'pending') {
    return '/pending-approval';
  }
  if (normalizedStatus === 'rejected') {
    return '/rejected-info';
  }
  return '/';
};

export const getRedirectUrl = (response: ApiResponse<unknown>, user?: SafeUser | null): string | null => {
  if (response.redirectTo === 'admin-dashboard' || response.redirectTo === '/admin') {
    return '/admin';
  }
  if (response.redirectTo) {
    return response.redirectTo.startsWith('/') ? response.redirectTo : `/${response.redirectTo}`;
  }
  const role = user?.role?.toLowerCase();
  if (role === 'admin' || role === 'ctv') {
    return '/admin';
  }

  // Điều hướng dựa theo trạng thái đăng ký của thí sinh
  if (user?.status) {
    return getParticipantRouteByStatus(user.status, user.role);
  }

  return null;
};

const extractTokenFromResponse = (response: ApiResponse<unknown>): string | null => {
  const payload = response as ApiResponse<any>;
  if (typeof payload.token === 'string' && payload.token) return payload.token;
  const data = payload.data as any;
  if (!data) return null;
  return data.token || data.access_token || data.accessToken || data.auth_token || null;
};

export const authAPI = {
  async login(username: string, password: string): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email: username,
        identifier: username,
        password,
      }),
    });
    const user = extractUserFromResponse(response);
    const token = extractTokenFromResponse(response);
    if (response.success) {
      const role = user?.role?.toLowerCase();
      const isAdminOrCtv = role === 'admin' || role === 'ctv' || response.redirectTo === 'admin-dashboard' || response.redirectTo === '/admin';
      if (token) {
        setAuthToken(token, isAdminOrCtv);
      }
      if (isAdminOrCtv) {
        persistAdminUser(user, response);
        persistStudentUser(user);
      } else {
        persistStudentUser(user);
      }
    }
    return response;
  },

  logout(): void {
    removeAuthToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_user');
      localStorage.removeItem('student_user');
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('student_user');
      sessionStorage.removeItem('auth_token');
    }
  },

  async getCurrentUser(): Promise<ApiResponse<SafeUser>> {
    return apiRequest<SafeUser>('/auth/me', { headers: getAuthHeader() });
  },

  async getCurrentStudentProfile(): Promise<ApiResponse<SafeUser>> {
    try {
      // Gọi ĐÚNG đường dẫn dành cho participant (Nhớ đảm bảo backend cũng khai báo đúng URL này)
      const response = await apiRequest<unknown>('/auth/participant/me', { headers: getAuthHeader() });

      // Nếu API trả về lỗi (ví dụ 401, 403, 404)
      if ((response as any).success === false) {
        return response as ApiResponse<SafeUser>;
      }

      const user = extractUserFromResponse(response as ApiResponse<unknown>);
      if (user) {
        persistStudentUser(user);
        return { ...(response as object), success: true, user } as ApiResponse<SafeUser>;
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin profile:", error);
    }

    return { success: false, message: 'Không thể lấy thông tin người dùng từ hệ thống.' };
  },
  async register(email: string, password: string, full_name: string): Promise<ApiResponse<SafeUser>> {
    return apiRequest<SafeUser>('/auth/register', {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ email, password, full_name }),
    });
  },

  async freeRegister(data: {
    username: string;
    password: string;
    full_name: string;
  }): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/free/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // Không tự động đăng nhập khi đăng ký để quay lại đăng nhập
    return response;
  },

  /** Đăng nhập tài khoản tự do bằng tên đăng nhập + mật khẩu. */
  async freeLogin(username: string, password: string): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/free/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const user = extractUserFromResponse(response);
    if (response.success) {
      const role = user?.role?.toLowerCase();
      const isAdminOrCtv = role === 'admin' || role === 'ctv';
      const token = extractTokenFromResponse(response);
      if (token) setAuthToken(token, isAdminOrCtv);
      if (isAdminOrCtv) {
        persistAdminUser(user, response);
      } else {
        persistStudentUser(user);
      }
    }
    return response;
  },

  // ===========================
  // SINH VIÊN DUT (mã số sinh viên)
  // ===========================

  /** Đăng ký tài khoản sinh viên DUT. */
  async studentRegister(data: {
    student_id: string;
    password: string;
    full_name: string;
    class_name: string;
    faculty_name: string;
  }): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/dut/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // Không tự động đăng nhập khi đăng ký để quay lại đăng nhập
    return response;
  },

  /** Đăng nhập sinh viên bằng MSSV + mật khẩu. */
  async studentLogin(student_id: string, password: string): Promise<ApiResponse<SafeUser>> {
    const response = await apiRequest<SafeUser>('/auth/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, password }),
    });
    const user = extractUserFromResponse(response);
    if (response.success) {
      const role = user?.role?.toLowerCase();
      const isAdminOrCtv = role === 'admin' || role === 'ctv';
      const token = extractTokenFromResponse(response);
      if (token) setAuthToken(token, isAdminOrCtv);
      if (isAdminOrCtv) {
        persistAdminUser(user, response);
      } else {
        persistStudentUser(user);
      }
    }
    return response;
  },
};

/** Danh sách 9 khoa chính thức từ backend. */
export const DUT_FACULTIES = [
  'Khoa Điện tử và Trí tuệ nhân tạo',
  'Khoa Cơ khí Giao thông và Năng lượng',
  'Khoa Hóa, Môi trường và Khoa học Sự sống',
  'Khoa Xây dựng',
  'Khoa Điện',
  'Khoa Cơ khí',
  'Khoa Công nghệ Thông tin',
  'Khoa Quản lý Dự án và Công nghiệp',
  'Khoa Kiến trúc',
] as const;

/** Fetch danh sách khoa từ backend (fallback sang danh sách hardcode). */
export async function getDutFaculties(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/dut/faculties`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data as string[];
    }
  } catch {
    // ignore network errors – use hardcoded fallback
  }
  return [...DUT_FACULTIES];
}
