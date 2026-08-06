import { cn } from '@/lib/utils';
import './ui.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = {
  sm: 'spinner--sm',
  md: 'spinner--md',
  lg: 'spinner--lg',
};

/** Spinner loading đơn giản. */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <span role="status" aria-label="Đang tải" className={cn('spinner', sizeClass[size], className)} />;
}
