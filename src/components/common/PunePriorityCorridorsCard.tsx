import React from 'react';
import { RouteCorridorAnalytics, PunePriorityRoute } from '../../types/events';
import { calculatePuneRouteAnalytics } from '../../store/routeSelectors';
import { useEventStore } from '../../store/useEventStore';
import { useFilterStore } from '../../store/useFilterStore';
import { useFleetStore } from '../../store/useFleetStore';
import { Navigation, Zap, Bus, Radio, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PunePriorityCorridorsCardProps {
  onSelectRoute?: (route: PunePriorityRoute) => void;
  className?: string;
}

export const PunePriorityCorridorsCard: React.FC<PunePriorityCorridorsCardProps> = ({
  onSelectRoute,
  className,
}) => {
  const { events } = useEventStore();
  const { fleet } = useFleetStore();
  const { selectedRoute, setRoute, setJurisdiction, onlyPunePriorityRoutes, setOnlyPunePriorityRoutes } = useFilterStore();

  const routeAnalytics: RouteCorridorAnalytics[] = React.useMemo(() => {
    return calculatePuneRouteAnalytics(events);
  }, [events]);

  // Compute live bus count per corridor
  const busCountByRoute = React.useMemo(() => {
    const counts = new Map<string, number>();
    routeAnalytics.forEach(r => counts.set(r.route_id, 0));

    fleet.forEach(b => {
      const rawRoute = (b.route_number || b.route_id || '').trim();
      // Match against priority routes
      for (const rt of routeAnalytics) {
        if (rawRoute.toLowerCase() === rt.route_id.toLowerCase() || rawRoute.startsWith(rt.route_id)) {
          counts.set(rt.route_id, (counts.get(rt.route_id) || 0) + 1);
          break;
        }
      }
    });

    return counts;
  }, [fleet, routeAnalytics]);

  // Priority route set
  const priorityRouteIdSet = React.useMemo(() => {
    return new Set(routeAnalytics.map(r => r.route_id.toLowerCase()));
  }, [routeAnalytics]);

  // Count buses in "Other PMPML routes"
  const otherRoutesCount = React.useMemo(() => {
    return fleet.filter(b => {
      const rawRoute = (b.route_number || b.route_id || '').trim().toLowerCase();
      let matched = false;
      for (const pid of priorityRouteIdSet) {
        if (rawRoute === pid || rawRoute.startsWith(pid)) {
          matched = true;
          break;
        }
      }
      return !matched;
    }).length;
  }, [fleet, priorityRouteIdSet]);

  // Calculate sensing coverage:
  // corridors with at least 1 active bus / total monitored corridors * 100
  const corridorsWithActiveBus = React.useMemo(() => {
    let count = 0;
    routeAnalytics.forEach(r => {
      if ((busCountByRoute.get(r.route_id) || 0) > 0) {
        count++;
      }
    });
    return count;
  }, [routeAnalytics, busCountByRoute]);

  const totalMonitoredCorridors = routeAnalytics.length || 7;
  const sensingCoveragePct = Math.round((corridorsWithActiveBus / totalMonitoredCorridors) * 100);

  const handleRouteClick = (rt: RouteCorridorAnalytics) => {
    if (selectedRoute === rt.route_id) {
      setRoute('ALL');
    } else {
      setRoute(rt.route_id);
      setJurisdiction('PMC_PUNE');
      setOnlyPunePriorityRoutes(true);
    }
    if (onSelectRoute) {
      onSelectRoute(rt);
    }
  };

  return (
    <div className={cn("bg-slate-900/90 border border-slate-800 rounded-xl p-4 backdrop-blur-md space-y-3.5", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              7 Priority Corridors & Sensing Coverage
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              PMC Jurisdiction
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Radio className="w-3 h-3" /> Coverage: {sensingCoveragePct}% ({corridorsWithActiveBus}/{totalMonitoredCorridors} Corridors Active)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time PMPML bus density & AI hazard telemetry across monitored arterial transit corridors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setOnlyPunePriorityRoutes(!onlyPunePriorityRoutes);
              if (!onlyPunePriorityRoutes) setJurisdiction('PMC_PUNE');
            }}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all flex items-center gap-1",
              onlyPunePriorityRoutes
                ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            )}
            title="Toggle map view to focus strictly on Pune priority corridors"
          >
            <Zap className="w-3 h-3" />
            {onlyPunePriorityRoutes ? 'Pune Filter Active' : 'Filter Pune Corridors'}
          </button>
        </div>
      </div>

      {/* Routes Corridor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2.5">
        {routeAnalytics.map((rt, index) => {
          const isSelected = selectedRoute === rt.route_id;
          const liveBusesCount = busCountByRoute.get(rt.route_id) || 0;

          let riskBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
          if (rt.risk_score >= 70) {
            riskBadgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/30";
          } else if (rt.risk_score >= 40) {
            riskBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/30";
          } else if (rt.risk_score > 0) {
            riskBadgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/30";
          }

          return (
            <div
              key={rt.route_id}
              onClick={() => handleRouteClick(rt)}
              className={cn(
                "p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between group",
                isSelected
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-600/10"
                  : "bg-slate-950/70 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80"
              )}
            >
              {/* Route Number & Rank */}
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-bold text-xs text-white group-hover:text-blue-400 transition-colors">
                    Rt {rt.route_id}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 font-semibold">
                    Rank #{index + 1}
                  </span>
                </div>

                {/* Corridor Name / Origin-Destination */}
                <div className="mt-1.5 font-medium text-[11px] text-slate-200 line-clamp-2 leading-tight">
                  {rt.origin} ↔ {rt.destination}
                </div>

                {/* Live Bus Count on Corridor */}
                <div className="mt-2 text-[10px] font-mono">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded font-bold border inline-flex items-center gap-1",
                      liveBusesCount > 0
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : "bg-slate-900 text-slate-500 border-slate-800"
                    )}
                  >
                    <Bus className="w-3 h-3" />
                    {liveBusesCount} {liveBusesCount === 1 ? 'bus active' : 'buses active'}
                  </span>
                </div>

                {/* Leading Issue Type */}
                <div className="mt-2 text-[10px] text-slate-400 font-medium">
                  Leading Issue:
                  <span className="block font-semibold text-slate-300 truncate">
                    {rt.leading_issue_type}
                  </span>
                </div>
              </div>

              {/* Bottom Metrics Strip */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                {/* Event Count */}
                <span className="text-slate-400">
                  {rt.event_count === 0 ? (
                    <span className="text-slate-500">0 Events</span>
                  ) : (
                    <span className="text-slate-200 font-bold">{rt.event_count} Events</span>
                  )}
                </span>

                {/* Risk Score */}
                <span className={cn("px-1.5 py-0.5 rounded font-bold border", riskBadgeClass)}>
                  Risk {rt.risk_score}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Network Sensing Summary Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Sensing Grid:</strong> {corridorsWithActiveBus} of 7 priority corridors currently have active mobile sensing units.
          </span>
        </div>
        <div className="text-slate-400">
          Other PMPML routes: <strong className="text-blue-400 font-bold">{otherRoutesCount} buses active</strong> across Pune metropolitan network.
        </div>
      </div>
    </div>
  );
};
