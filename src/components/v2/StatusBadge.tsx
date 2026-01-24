import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-info/10 text-info border-info/20',
  muted: 'bg-muted text-muted-foreground border-muted',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export default function StatusBadge({
  variant = 'default',
  children,
  icon: Icon,
  className,
  size = 'md',
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}
