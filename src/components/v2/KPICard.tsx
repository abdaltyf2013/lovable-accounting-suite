import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
  className?: string;
  delay?: number;
}

const variantStyles = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  success: {
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  warning: {
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  info: {
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
  },
};

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'primary',
  className,
  delay = 0,
}: KPICardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-card border border-border p-6',
        'transition-all duration-300 hover:shadow-lg hover:border-primary/20',
        className
      )}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', styles.iconBg)}>
            <Icon className={cn('w-6 h-6', styles.iconColor)} />
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1 number-display">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {trend && (
          <div className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium',
            trend.isPositive 
              ? 'bg-success/10 text-success' 
              : 'bg-destructive/10 text-destructive'
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </div>
    </motion.div>
  );
}
