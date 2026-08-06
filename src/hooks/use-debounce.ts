'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce giá trị — dùng cho search input trước khi gọi API.
 *
 * const [search, setSearch] = useState('');
 * const debounced = useDebounce(search, 400);
 * // gọi API khi debounced thay đổi
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
