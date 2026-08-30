import { cn } from '@/lib/utils';
import './ui.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  success: 'badge--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
  info: 'badge--info',
  neutral: 'badge--neutral',
};

/**
 * Badge trạng thái — dùng cho status của tournament/registration/user.
 *
 * <Badge variant="success">Đang hoạt động</Badge>
 */
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return <span className={cn('badge', variantClass[variant], className)}>{children}</span>;
}

/** Map TournamentStatus -> variant Badge (tiện dùng cho bảng giải đấu). */
export function statusToVariant(status: string): BadgeVariant {
  switch (status) {
    case 'approved':
    case 'active':
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}
