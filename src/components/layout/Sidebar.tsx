import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  TrendingUp, 
  AlertTriangle, 
  Bell, 
  Bus, 
  Radio, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEventStore } from '../../store/useEventStore';
import { useFleetStore } from '../../store/useFleetStore';

export type TabType = 
  | 'command-center' 
  | 'live-gis' 
  | 'traffic-analytics' 
  | 'road-intelligence' 
  | 'alert-center' 
  | 'fleet';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { events } = useEventStore();
  const { fleet } = useFleetStore();

  const activeFleetCount = fleet.filter((b) => b.status === 'ACTIVE').length;
  const totalFleetCount = fleet.length;
  const avgFps = fleet.length > 0 
    ? (fleet.reduce((a, b) => a + (b.ai_fps || 0), 0) / fleet.length).toFixed(1) 
    : '0.0';

  const criticalAlertsCount = events.filter((e) => e.severity === 'CRITICAL' && e.status !== 'RESOLVED').length;
  const pendingHazardsCount = events.filter((e) => e.status === 'PENDING' || e.status === 'CORROBORATED').length;

  const navItems = [
    {
      id: 'command-center' as TabType,
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'live-gis' as TabType,
      label: 'Live GIS',
      icon: Map,
      badge: 'LIVE',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'traffic-analytics' as TabType,
      label: 'Traffic Analytics',
      icon: TrendingUp,
      badge: undefined,
    },
    {
      id: 'road-intelligence' as TabType,
      label: 'Road Intelligence',
      icon: AlertTriangle,
      badge: pendingHazardsCount > 0 ? String(pendingHazardsCount) : undefined,
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'alert-center' as TabType,
      label: 'Alert Center',
      icon: Bell,
      badge: criticalAlertsCount > 0 ? String(criticalAlertsCount) : undefined,
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      id: 'fleet' as TabType,
      label: 'Fleet',
      icon: Bus,
      badge: String(activeFleetCount),
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
  ];

  return (
    <aside
      className={cn(
        'relative flex flex-col justify-between border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 z-30',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shadow-inner">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-wider text-white font-mono block">URBANEYE</span>
                <span className="text-[10px] text-slate-400 font-mono tracking-tighter">AI FLEET INTELLIGENCE</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden lg:block"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="p-3 space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative',
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent'
                )}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}

                {!isCollapsed && item.badge && (
                  <span
                    className={cn(
                      'ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border',
                      item.badgeColor || 'text-slate-300 bg-slate-800 border-slate-700'
                    )}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Active Indicator Accent Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Diagnostics */}
      <div className="p-3 border-t border-slate-800">
        {!isCollapsed ? (
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">AI Pipeline</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-300 font-mono flex items-center justify-between">
              <span>Avg FPS</span>
              <span className="text-blue-400 font-bold">{avgFps} FPS</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-300 font-mono flex items-center justify-between">
              <span>Active Buses</span>
              <span className="text-emerald-400 font-bold">{activeFleetCount}/{totalFleetCount}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="System Online" />
          </div>
        )}
      </div>
    </aside>
  );
};
