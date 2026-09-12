import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return isoString;
  }
}

export function getSeverityBadgeClasses(severity: string) {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'HIGH':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'MEDIUM':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'LOW':
    default:
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }
}

export function getEventTypeLabel(type: string): string {
  switch (type) {
    case 'POTHOLE':
      return 'Pothole';
    case 'WATERLOGGING':
      return 'Waterlogging';
    case 'DAMAGED_SIGN':
      return 'Damaged Sign';
    case 'TRAFFIC':
      return 'Traffic Bottleneck';
    default:
      return type;
  }
}
