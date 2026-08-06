// Khai báo module cho các file CSS được import side-effect (import './x.css')
// Cần thiết vì TypeScript 6.x bật `noUncheckedSideEffectImports` theo mặc định,
// và Next.js không ship sẵn type declaration cho file *.css (chỉ có *.module.css).
declare module '*.css';

// Hỗ trợ CSS Modules nếu dự án dùng sau này
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
