# DUT Esports — Frontend

Nền tảng tổ chức & theo dõi giải đấu Esports — **CLB Thể thao điện tử DUT ESPORTS, Đại học Bách khoa Đà Nẵng**.

Stack: **Next.js 15 (App Router) · React 19 · TypeScript** · TanStack Query · Zustand · react-hook-form + zod · CSS thuần

## Bắt đầu nhanh

```bash
npm install

# sao chép biến môi trường mẫu
cp .env.example .env.local   # Windows: copy .env.example .env.local

npm run dev                  # http://localhost:3000
```

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | chạy dev server |
| `npm run build` | build production |
| `npm run start` | chạy bản build |
| `npm run typecheck` | kiểm tra TypeScript |
| `npm run lint` / `lint:fix` | kiểm tra / tự sửa ESLint |
| `npm run format` / `format:check` | format / kiểm tra Prettier |

## Biến môi trường

Xem `.env.example`:

- `NEXT_PUBLIC_API_BASE` — base URL API backend (VD: `http://localhost:5000/api`)
- `NEXT_PUBLIC_API_ORIGIN` — origin backend (logo game, banner upload)

## Cấu trúc thư mục

```
src/
├── app/              # App Router
├── components/
│   ├── layout/       # Header, Footer
│   └── ui/           # UI primitives dùng chung (Button, Input, Badge...)
├── features/         # ★ feature-based: auth, tournaments, admin
│   └── <feature>/    #   api/ · hooks/ · components/ · types.ts
├── hooks/            # hooks dùng chung (useDebounce, usePagination)
├── lib/              # hạ tầng (api-client, query-client, auth)
├── providers/        # gom provider toàn app
├── stores/           # Zustand (auth, ui)
├── types/            # domain types dùng chung
└── utils/            # format, parse...
```

> 📖 **Hướng dẫn kiến trúc chi tiết + cách migrate code cũ từng phần:** xem [`docs/FRONTEND_ARCHITECTURE.md`](docs/FRONTEND_ARCHITECTURE.md).

## Backend

Xem thư mục `../Web-giai-dau/backend` (Node.js + Express + PostgreSQL) — hướng dẫn setup trong `Web-giai-dau/README.md`.
