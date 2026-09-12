import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading operational intelligence...',
  className,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 p-2 text-slate-400', className)}>
        <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
        <span className="text-[11px] font-mono tracking-wide">{message}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-slate-400 gap-3', className)}>
      <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
      <p className="text-xs font-mono tracking-wide">{message}</p>
    </div>
  );
};

