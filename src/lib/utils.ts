import { clsx, type ClassValue } from 'clsx';

/** Nối class name có điều kiện — chuẩn shadcn/ui. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Delay — dùng cho debounce, demo loading... */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
