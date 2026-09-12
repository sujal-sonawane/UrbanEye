import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: string | number;
    isPositive: boolean;
    label: string;
  };
  variant?: 'default' | 'critical' | 'warning' | 'info' | 'success';
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  variant = 'default',
  subtitle,
  className,
  onClick,
}) => {
  const variantStyles = {
    default: 'border-slate-800 bg-slate-900/90 text-slate-100 hover:border-slate-700',
    critical: 'border-rose-900/50 bg-rose-950/20 text-rose-100 hover:border-rose-700/50',
    warning: 'border-amber-900/50 bg-amber-950/20 text-amber-100 hover:border-amber-700/50',
    info: 'border-blue-900/50 bg-blue-950/20 text-blue-100 hover:border-blue-700/50',
    success: 'border-emerald-900/50 bg-emerald-950/20 text-emerald-100 hover:border-emerald-700/50',
  };

  const iconColors = {
    default: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    critical: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    info: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-xl border p-4 backdrop-blur-md transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold tracking-tight">{value}</span>
            {unit && <span className="text-xs text-slate-400">{unit}</span>}
          </div>
        </div>
        <div className={cn('p-2.5 rounded-lg border', iconColors[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {trend.value} <span className="text-slate-400 ml-1">{trend.label}</span>
            </span>
          )}
          {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
