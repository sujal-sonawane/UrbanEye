import React from 'react';
import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  title: string;
  count?: number;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          {count !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-medium border border-slate-700">
              {count}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
