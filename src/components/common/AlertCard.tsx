import React from 'react';
import { AlertTriangle, MapPin, Bus, Clock, ShieldCheck, ChevronRight, Activity, Cpu } from 'lucide-react';
import { UrbanEyeEvent } from '../../types/events';
import { StatusBadge } from './StatusBadge';
import { formatRelativeTime, cn } from '../../lib/utils';

interface AlertCardProps {
  event: UrbanEyeEvent;
  onClick?: () => void;
  onDispatch?: (event: UrbanEyeEvent) => void;
  compact?: boolean;
  showConfidence?: boolean;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  event,
  onClick,
  compact = false,
  showConfidence = true,
}) => {
  const getEventIcon = () => {
    switch (event.event_type) {
      case 'POTHOLE':
        return <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0"><AlertTriangle className="w-4 h-4" /></div>;
      case 'WATERLOGGING':
        return <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0"><Activity className="w-4 h-4" /></div>;
      case 'DAMAGED_SIGN':
        return <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0"><AlertTriangle className="w-4 h-4" /></div>;
      case 'TRAFFIC':
        return <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0"><Bus className="w-4 h-4" /></div>;
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5 backdrop-blur-md transition-all duration-200 hover:border-slate-700 hover:bg-slate-900 cursor-pointer',
        event.severity === 'CRITICAL' && 'border-rose-900/40 bg-rose-950/10 hover:border-rose-800/60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {getEventIcon()}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-semibold text-slate-200">
                {event.event_id}
              </span>
              <StatusBadge severity={event.severity} size="sm" />
              <StatusBadge status={event.status} size="sm" />
              {showConfidence && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  <Cpu className="w-3 h-3" />
                  {(event.confidence * 100).toFixed(0)}% Conf
                </span>
              )}
              {event.corroboration_count > 1 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  {event.corroboration_count} Buses
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-slate-100 mt-1 truncate">
              {event.location_name || `${event.event_type} on Route ${event.route_id}`}
            </p>

            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {event.ward_name || event.ward_id || 'Ward Not Assigned'}
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Bus className="w-3.5 h-3.5 text-slate-500" />
                {event.bus_id} (Rt: {event.route_id})
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>
          </div>
        </div>

        {/* Priority Score & Expand */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">
              Priority
            </span>
            <span
              className={cn(
                'font-mono text-sm font-bold',
                (event as any).priority_level === 'CRITICAL' || event.priority_score >= 80
                  ? 'text-rose-400'
                  : (event as any).priority_level === 'HIGH' || event.priority_score >= 60
                  ? 'text-amber-400'
                  : (event as any).priority_level === 'MEDIUM'
                  ? 'text-blue-400'
                  : 'text-emerald-400'
              )}
            >
              {(event as any).priority_level || event.priority_score.toFixed(1)}
            </span>
            {(event as any).priority_level && (
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                {event.priority_score} pts
              </span>
            )}
          </div>

          {!compact && (
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all mt-2" />
          )}
        </div>
      </div>
    </div>
  );
};
