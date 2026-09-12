import React from 'react';
import { cn } from '../../lib/utils';
import { EventStatus, SeverityLevel } from '../../types/events';

interface StatusBadgeProps {
  status?: EventStatus | 'ONLINE' | 'OFFLINE' | 'STREAMING' | 'MAINTENANCE' | 'RECORDING_ONLY' | 'DEGRADED';
  severity?: SeverityLevel;
  text?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  severity,
  text,
  size = 'md',
  pulse = false,
  className,
}) => {
  let colorStyles = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';
  const label = text || (status === 'RECORDING_ONLY' ? 'REC ONLY' : status) || severity || 'UNKNOWN';

  if (severity) {
    switch (severity) {
      case 'CRITICAL':
        colorStyles = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
        dotColor = 'bg-rose-500';
        break;
      case 'HIGH':
        colorStyles = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
        dotColor = 'bg-orange-500';
        break;
      case 'MEDIUM':
        colorStyles = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        dotColor = 'bg-amber-400';
        break;
      case 'LOW':
        colorStyles = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        dotColor = 'bg-emerald-400';
        break;
    }
  } else if (status) {
    switch (status) {
      case 'CORROBORATED':
        colorStyles = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
        dotColor = 'bg-blue-400';
        break;
      case 'DISPATCHED':
      case 'IN_PROGRESS':
        colorStyles = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
        dotColor = 'bg-purple-400';
        break;
      case 'RESOLVED':
      case 'ONLINE':
      case 'STREAMING':
        colorStyles = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        dotColor = 'bg-emerald-400';
        break;
      case 'PENDING':
      case 'RECORDING_ONLY':
        colorStyles = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        dotColor = 'bg-amber-400';
        break;
      case 'OFFLINE':
      case 'MAINTENANCE':
      case 'DEGRADED':
        colorStyles = 'bg-slate-500/15 text-slate-400 border-slate-500/30';
        dotColor = 'bg-slate-400';
        break;
      case 'DISMISSED':
        colorStyles = 'bg-zinc-800 text-zinc-500 border-zinc-700';
        dotColor = 'bg-zinc-500';
        break;
    }
  }

  const sizeStyles = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase',
        sizeStyles,
        colorStyles,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full inline-block',
          dotColor,
          pulse && 'animate-ping'
        )}
      />
      {label}
    </span>
  );
};
