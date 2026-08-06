import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware bảo vệ route — chạy ở EDGE/server trước khi render.
 *
 * ⚠️ TRẠNG THÁI HIỆN TẠI: file này chỉ "đi qua" (passthrough) để không
 * phá luồng đăng nhập hiện tại (app đang lưu token ở localStorage).
 *
 * KÍCH HOẠT (sau khi làm Phần 9 trong docs/FRONTEND_ARCHITECTURE.md):
 * - auth-store đồng bộ token ra cookie (tên: auth_token)
 * - Bỏ comment khối logic bên dưới, xoá return passthrough.
 */
export function middleware(request: NextRequest) {
  // ===== PASSTHROUGH (tạm thời) =====
  void request; // request chưa dùng tới — middleware đang ở chế độ passthrough
  return NextResponse.next();

  // ===== BẬT KHI CHUYỂN SANG COOKIE-BASED AUTH =====
  // const token = request.cookies.get('auth_token')?.value;
  // const { pathname } = request.nextUrl;
  //
  // // Trang admin: bắt buộc có token
  // if (pathname.startsWith('/admin') && !token) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = '/admin';
  //   return NextResponse.redirect(url);
  // }
  //
  // return NextResponse.next();
}

/** Chỉ chạy middleware cho các route cần bảo vệ — tối ưu hiệu năng. */
export const config = {
  matcher: ['/admin/:path*'],
};
