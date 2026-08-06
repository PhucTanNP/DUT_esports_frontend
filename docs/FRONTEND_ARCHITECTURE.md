# FRONTEND ARCHITECTURE — Hướng dẫn implement từng phần

> Tài liệu này hướng dẫn xây dựng kiến trúc FE chuyên nghiệp cho **DUT Esports** theo chuẩn mà các dự án lớn đang dùng: **feature-based structure + TanStack Query + Zustand + route protection + ESLint/Prettier**.
>
> Toàn bộ file "khung" đã được tạo sẵn trong repo. Bạn làm theo từng Phần bên dưới để **migrate code cũ sang cấu trúc mới** — mỗi phần độc lập, làm tới đâu chạy tới đó.

---

## Mục lục

- [1. Cây thư mục mục tiêu](#1-cây-thư-mục-mục-tiêu)
- [2. Roadmap triển khai](#2-roadmap-triển-khai)
- [3. Phần 1: Cài đặt dependencies](#phần-1-cài-đặt-dependencies)
- [4. Phần 2: Cấu hình cơ bản (alias, ESLint, Prettier)](#phần-2-cấu-hình-cơ-bản)
- [5. Phần 3: Lớp nền `lib/`](#phần-3-lớp-nền-lib)
- [6. Phần 4: Providers](#phần-4-providers)
- [7. Phần 5: State management — Zustand stores](#phần-5-state-management--zustand-stores)
- [8. Phần 6: Hooks dùng chung](#phần-6-hooks-dùng-chung)
- [9. Phần 7: UI components dùng chung (`components/ui`)](#phần-7-ui-components-dùng-chung)
- [10. Phần 8: Feature-based structure](#phần-8-feature-based-structure)
- [11. Phần 9: Bảo vệ route (AuthGuard + middleware)](#phần-9-bảo-vệ-route)
- [12. Phần 10: Form + validation (react-hook-form + zod)](#phần-10-form--validation)
- [13. Phần 11: Checklist dọn dẹp code cũ](#phần-11-checklist-dọn-dẹp-code-cũ)
- [14. Phần 12: Best practices](#phần-12-best-practices)
- [15. FAQ](#faq)

---

## 1. Cây thư mục mục tiêu

```
frontend/
├── .env.example                  # biến môi trường mẫu
├── .prettierrc / .prettierignore
├── eslint.config.mjs             # ESLint flat config
├── middleware.ts                 # bảo vệ route phía server (edge)
├── tsconfig.json                 # alias @/* -> ./src/*
├── docs/
│   └── FRONTEND_ARCHITECTURE.md  # tài liệu này
└── src/
    ├── app/                      # App Router (route groups xem Phần 9)
    │   ├── (public)/             # nhóm route công khai
    │   └── (admin)/              # nhóm route admin (có layout riêng)
    ├── components/
    │   ├── layout/               # Header, Footer
    │   └── ui/                   # UI primitives tái sử dụng (Button, Input...)
    ├── features/                 # ★ feature-based — trái tim của cấu trúc
    │   ├── auth/                 # api/ hooks/ components/ types.ts
    │   ├── tournaments/
    │   └── admin/
    ├── hooks/                    # hooks dùng chung (useDebounce, usePagination)
    ├── lib/                      # hạ tầng (api-client, query-client, auth, utils)
    ├── providers/                # gom provider (AppProviders, QueryProvider)
    ├── stores/                   # Zustand (auth-store, ui-store)
    ├── styles/                   # CSS thuần hiện có
    ├── types/                    # domain types dùng chung
    └── utils/                    # format, parse...
```

---

## 2. Roadmap triển khai

| Giai đoạn | Việc cần làm | Ảnh hưởng |
|---|---|---|
| **A** | Cài deps + config (Phần 1–2) | Không đổi code, app vẫn chạy |
| **B** | Tạo `lib/`, `providers/`, `stores/`, `hooks/` (Phần 3–6) | Chỉ thêm file mới, không đụng code cũ |
| **C** | Tạo `components/ui` (Phần 7) | Chỉ thêm file mới |
| **D** | Migrate từng feature (Phần 8) | Đổi dần từng màn hình |
| **E** | Route protection (Phần 9) | Đổi cấu trúc `app/` |
| **F** | Forms + dọn dẹp (Phần 10–11) | Xoá code cũ, chuẩn hoá |

> 💡 **Nguyên tắc vàng:** mỗi bước nhỏ đều phải `npm run typecheck` + `npm run dev` chạy được trước khi sang bước kế.

---

## Phần 1: Cài đặt dependencies

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools zustand
npm install react-hook-form zod @hookform/resolvers
npm install -D eslint eslint-config-next eslint-config-prettier prettier
```

**Vì sao chọn:**
- `@tanstack/react-query` — quản lý **server state**: cache, loading, retry, invalidation.
- `zustand` — quản lý **client state**: auth, UI (sidebar, toast).
- `react-hook-form + zod` — form + validation type-safe.
- `eslint-config-prettier` — tắt rule ESLint xung đột Prettier.

---

## Phần 2: Cấu hình cơ bản

### 2.1. Path alias — `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    // ...
    "paths": {
      "@/*": ["./src/*"]   // thay vì "./*" — trỏ đúng vào src/
    }
  }
}
```

Từ nay import bằng `@/` thay cho đường dẫn tương đối dài:

```ts
// CŨ
import { apiRequest } from '../../services/http';
// MỚI
import { apiClient } from '@/lib/api-client';
```

### 2.2. ESLint — `eslint.config.mjs`

Flat config (chuẩn ESLint 9 / Next 15). File đã tạo sẵn:

```js
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
```

Chạy: `npm run lint` / `npm run lint:fix`.

### 2.3. Prettier — `.prettierrc`

```json
{ "semi": true, "singleQuote": true, "tabWidth": 2, "printWidth": 100 }
```

Chạy: `npm run format` / `npm run format:check`.

---

## Phần 3: Lớp nền `lib/`

Thư mục `src/lib/` chứa **hạ tầng dùng chung**, không phụ thuộc vào feature nào.

### 3.1. `lib/api-client.ts` — thay thế `services/http.ts`

File đã tạo sẵn. Điểm mạnh so với bản cũ:

| Tính năng | `services/http.ts` (cũ) | `lib/api-client.ts` (mới) |
|---|---|---|
| Base URL | `API_BASE` cứng | `NEXT_PUBLIC_API_BASE` |
| Token | đọc trực tiếp `localStorage` | **token getter** (khớp Zustand store) |
| Lỗi | không ném, trả về object | **ném `ApiError`** (có status + data) |
| FormData | tự xử lý | tự bỏ `Content-Type` khi là FormData |
| Endpoint public | không hỗ trợ | option `public: true` |

Cách dùng:

```ts
import { apiClient, apiGet } from '@/lib/api-client';

const res = await apiClient<Tournament[]>('/tournaments');
const detail = await apiGet<Tournament>(`/tournaments/${id}`); // lấy thẳng data
```

> ⚠️ **Chưa xoá `services/http.ts`** — nó vẫn được component cũ dùng. Xoá khi hoàn tất Phần 11.

### 3.2. `lib/query-client.ts` — cấu hình TanStack Query

```ts
export function getQueryClient() { /* 1 instance dùng chung */ }
```

Cấu hình quan trọng: `staleTime: 30_000` (dữ liệu mới trong 30s), `refetchOnWindowFocus: false`.

### 3.3. `lib/auth.ts` — auth phía server

Dùng cho middleware / server components: `getServerAuthToken()`, `isAuthenticated()`.

### 3.4. `lib/utils.ts` — helper nhỏ

```ts
export function cn(...inputs: ClassValue[]): string; // nối class có điều kiện
export function sleep(ms: number): Promise<void>;
```

---

## Phần 4: Providers

- `providers/query-provider.tsx` — bọc `QueryClientProvider` + DevTools (chỉ dev).
- `providers/app-providers.tsx` — gom tất cả provider.

**Đã wire vào `app/layout.tsx`**:

```tsx
<body>
  <AppProviders>{children}</AppProviders>
</body>
```

Khi thêm provider mới (Theme, Toast, i18n...), chỉ cần thêm vào `AppProviders` — `layout.tsx` không phải đổi.

---

## Phần 5: State management — Zustand stores

### 5.1. `stores/auth-store.ts` — session người dùng

Thay thế việc đọc/ghi `localStorage` thủ công rải rác:

```ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setSession: (user, token) => set({ user, token }),
      clearSession: () => set({ user: null, token: null }),
    }),
    { name: 'auth-store' }, // persist sang localStorage
  ),
);
```

Dùng trong component:

```tsx
const user = useAuthStore((s) => s.user);
const token = useAuthStore((s) => s.token);
```

> 🔑 **Mẹo:** file này tự gọi `setTokenGetter()` ở cuối để `api-client` lấy token từ store — không cần import vòng.

### 5.2. `stores/ui-store.ts` — state giao diện

```ts
const sidebarOpen = useUiStore((s) => s.sidebarOpen);
const pushToast = useUiStore((s) => s.pushToast);
```

---

## Phần 6: Hooks dùng chung

- `hooks/use-debounce.ts` — debounce search input trước khi gọi API.
- `hooks/use-pagination.ts` — page/limit + `getPageCount()`.

Ví dụ kết hợp:

```tsx
const [search, setSearch] = useState('');
const debounced = useDebounce(search, 400);
const { page, setPage, reset } = usePagination(10);
```

---

## Phần 7: UI components dùng chung

Thư mục `components/ui/` chứa **UI primitives** (chuẩn shadcn/ui), import gọn qua barrel:

```tsx
import { Button, Input, Spinner, Badge, statusToVariant } from '@/components/ui';
```

```tsx
<Button variant="danger" loading onClick={handleDelete}>Xoá</Button>
<Button variant="primary" size="sm">Lưu</Button>

<Input label="Email" error={errors.email?.message} {...register('email')} />

<Badge variant={statusToVariant(tournament.status)}>{tournament.status}</Badge>
```

Style dùng **CSS thuần** trong `ui.css` (khớp hệ thống style hiện tại, không cần Tailwind). Muốn nâng cấp lên Tailwind thì đây là nơi duy nhất phải đổi.

> Khi cần component mới (Modal, Table, Select...), tạo trong `components/ui/` và export từ `index.ts`.

---

## Phần 8: Feature-based structure

**Nguyên tắc:** mỗi feature là 1 thư mục tự chứa mọi thứ của nó:

```
features/<tên>/
├── api/          # gọi API (thay services/*.service.ts)
├── hooks/        # useQuery/useMutation của feature (thay useEffect + useState)
├── components/   # component riêng của feature
└── types.ts      # type riêng của feature
```

### 8.1. Feature `auth` (đã tạo sẵn)

| File | Vai trò |
|---|---|
| `api/auth-api.ts` | login, register, studentLogin, me |
| `hooks/use-auth.ts` | `useMe`, `useLogin`, `useStudentLogin`, `useLogout` |
| `components/AuthGuard.tsx` | bảo vệ route phía client |
| `components/LoginForm.tsx` | form mẫu RHF + zod |
| `types.ts` | payload types |

**Migrate bước 1 — AdminLogin dùng hook mới:**

```tsx
// AdminLogin.tsx — bỏ useState loading/error, bỏ gọi authAPI trực tiếp
import { useLogin } from '@/features/auth/hooks/use-auth';

const login = useLogin();

const onSubmit = async (values: { email: string; password: string }) => {
  const res = await login.mutateAsync(values); // tự lưu session qua onSuccess
  onLoginSuccess(res.user!);
};
```

**Migrate bước 2 — StudentAuth tương tự** với `useStudentLogin` / `useStudentRegister`.

### 8.2. Feature `tournaments` (đã tạo sẵn)

| File | Vai trò |
|---|---|
| `api/tournament-api.ts` | CRUD giải đấu |
| `api/registration-api.ts` | đăng ký tham gia |
| `hooks/use-tournaments.ts` | `useTournaments`, `useTournament`, `useCreateRegistration`, `useUpdateTournament`... |
| `types.ts` | payload + query types |

**Migrate — HomePage bỏ useEffect, dùng hook:**

```tsx
// HomePage.tsx (sau migrate)
const { data, isLoading, isError } = useTournaments({ status: 'approved' });
```

`useQuery` tự lo loading/error/cache — xoá được toàn bộ `useEffect + useState + try/catch`.

**Migrate — TournamentDetail:**

```tsx
const { data, isLoading } = useTournament(id);
const createRegistration = useCreateRegistration();
```

### 8.3. Feature `admin` (đã tạo sẵn)

| File | Vai trò |
|---|---|
| `api/admin-api.ts` | stats + users + ctvs CRUD |
| `hooks/use-stats.ts` | `useStats()` — tự refresh 30s |
| `hooks/use-users.ts` | `useUsers`, `useCreateUser`, `useUpdateUser`, `useToggleUserStatus`, `useDeleteUser` |
| `hooks/use-ctvs.ts` | tương tự cho CTV |

**Migrate — UserManagement/CTVManager:**

```tsx
const { data, isLoading } = useUsers({ search, role, page, limit: 10 });
const createUser = useCreateUser();
const toggleStatus = useToggleUserStatus();
const deleteUser = useDeleteUser();
```

`onSuccess` trong mutation tự `invalidateQueries` → danh sách tự refresh, không cần `loadUsers()` gọi lại tay.

> 💡 **Lợi ích lớn nhất của Query:** `UserManagement` và `CTVManager` trước đây trùng ~200 dòng logic fetch. Giờ chỉ còn khai báo hook + render — phần CRUD đã được chuẩn hoá.

---

## Phần 9: Bảo vệ route

### 9.1. Route groups trong `app/`

```
src/app/
├── (public)/            # route công khai
│   ├── page.tsx         # di chuyển từ app/page.tsx
│   └── tournament/[id]/page.tsx
├── (admin)/             # route admin
│   ├── layout.tsx       # mới — bọc AuthGuard
│   └── page.tsx         # di chuyển từ app/admin/page.tsx
└── layout.tsx           # giữ nguyên (root layout)
```

Route group `(...)` không ảnh hưởng URL — chỉ nhóm layout/guard.

`app/(admin)/layout.tsx`:

```tsx
import { AuthGuard } from '@/features/auth/components/AuthGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['admin', 'ctv']}>
      {children}
    </AuthGuard>
  );
}
```

Sau đó **xoá logic kiểm tra đăng nhập trong `AdminDashboard.tsx`** (isLoggedIn, checkAuth, handleLogout...) — AuthGuard lo phần đó.

### 9.2. Kích hoạt `middleware.ts` (bảo mật tầng server)

Middleware chạy trước khi render — chặn được cả khi JS chưa tải. **Điều kiện tiên quyết: token phải nằm trong cookie** (localStorage middleware không đọc được).

**Bước A — auth-store đồng bộ token ra cookie:**

```ts
// stores/auth-store.ts — thêm vào setSession/clearSession
import { setCookie, deleteCookie } from 'cookies-next'; // cài thêm: npm i cookies-next

setCookie('auth_token', token, { maxAge: 60 * 60 * 24 * 7, path: '/' });
deleteCookie('auth_token');
```

**Bước B — bật logic trong `middleware.ts`** (bỏ comment khối đã viết sẵn):

```ts
const token = request.cookies.get('auth_token')?.value;
if (pathname.startsWith('/admin') && !token) {
  const url = request.nextUrl.clone();
  url.pathname = '/admin';
  return NextResponse.redirect(url);
}
```

> ⚠️ **Thứ tự đúng:** làm 9.1 (AuthGuard) trước, chạy ổn rồi mới kích hoạt middleware. Bật middleware trước khi có cookie là khoá trắng luồng đăng nhập hiện tại.

---

## Phần 10: Form + validation

File mẫu đã có: `features/auth/components/LoginForm.tsx`.

Quy ước cho **mọi form** trong dự án (đăng ký sinh viên, tạo giải đấu, modal thêm user...):

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});
type Values = z.infer<typeof schema>;

export function MyForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<Values>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit((v) => /* gọi mutation */)} noValidate>
      <Input label="Email" error={errors.email?.message} {...register('email')} />
      <Button type="submit" loading={isSubmitting}>Gửi</Button>
    </form>
  );
}
```

**Lợi ích:** schema zod = 1 nguồn duy nhất cho validation + type; hiển thị lỗi tự động; `noValidate` tắt validation trình duyệt để dùng lỗi của chúng ta.

---

## Phần 11: Checklist dọn dẹp code cũ

Khi mọi feature đã migrate xong:

- [ ] **Xoá `src/services/`** — đã thay bằng `features/*/api/`.
- [ ] **Xoá `src/screens/`** — đã chuyển vào `features/` hoặc `components/`.
- [ ] **Xoá `src/App.css`** nếu chỉ phục vụ layout cũ (đã import trong `layout.tsx`).
- [ ] **`app/admin/page.tsx`** chuyển vào route group `(admin)/`.
- [ ] **`AdminDashboard.tsx`** bỏ logic auth (AuthGuard lo), giữ phần menu/sidebar.
- [ ] **Kiểm tra `services/http.ts`** không còn ai import → xoá.
- [ ] Chạy `npm run typecheck && npm run lint && npm run format` sạch lỗi.
- [ ] Chạy `npm run build` thành công.

---

## Phần 12: Best practices

**Đặt tên**
- File: `kebab-case` (`use-tournaments.ts`, `admin-api.ts`).
- Component: `PascalCase` (`AuthGuard`, `LoginForm`).
- Hook: prefix `use` + tên dữ liệu (`useTournaments`, `useLogin`).
- Query key: tập trung theo feature (`tournamentKeys`, `adminKeys`, `authKeys`) — tránh chuỗi rải rác, dễ `invalidateQueries`.

**Quy tắc 1 file 1 trách nhiệm**
- Component không gọi API trực tiếp → qua hook.
- Hook không tự lưu localStorage → qua store.
- Store không gọi API → qua api-layer.

**Server vs Client**
- Component nào cần state/hook → thêm `'use client'`.
- Component nào tĩnh → giữ server component (tận dụng RSC).

**Commit**
- Mỗi Phần trong tài liệu này = 1 commit riêng, message mô tả rõ (VD: `feat(admin): migrate UserManagement to useUsers hooks`).

---

## FAQ

**Q1: Có bắt buộc làm hết không?**
Không. Cấu trúc mới song song với code cũ. Bạn có thể migrate dần — app luôn chạy được.

**Q2: Query vs Store — khi nào dùng cái nào?**
- Dữ liệu từ **server** (danh sách, chi tiết, stats) → **TanStack Query**.
- Dữ liệu **client** (session, sidebar, toast) → **Zustand**.

**Q3: CSS thuần hay Tailwind?**
Hiện tại dùng CSS thuần cho khớp dự án. Muốn Tailwind: thêm `tailwindcss` + PostCSS, sửa `ui.css` → dùng class Tailwind trong `components/ui`. Các component khác không bị ảnh hưởng.

**Q4: Middleware chặn ở server thì có cần AuthGuard nữa không?**
Có. Middleware chặn nhanh (server), AuthGuard lo UX (redirect, spinner, kiểm tra role chi tiết).

**Q5: `react-query-devtools` có nên để production không?**
Không — đã tự ẩn qua `process.env.NODE_ENV === 'development'`.

---

*Cập nhật: 2026-08-06 — DUT Esports Frontend v2*
