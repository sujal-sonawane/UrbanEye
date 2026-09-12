import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Bus, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Activity,
  Zap,
  Gauge,
  Radio,
  ExternalLink
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { KPICard } from '../components/common/KPICard';
import { SectionHeader } from '../components/common/SectionHeader';
import { AlertCard } from '../components/common/AlertCard';
import { KPICardSkeleton, CardSkeleton, Skeleton } from '../components/common/Skeleton';
import { MapLibreMap } from '../components/gis/MapLibreMap';
import { useEventStore } from '../store/useEventStore';
import { useFilterStore } from '../store/useFilterStore';
import { useFleetStore } from '../store/useFleetStore';
import { useTrafficStreamStore } from '../store/useTrafficStreamStore';
import { TabType } from '../components/layout/Sidebar';
import { getEventTypeLabel, cn } from '../lib/utils';
import { useCorroboratedEvents } from '../store/corroborationSelectors';
import { usePrioritizedEvents } from '../store/priorityEngine';
import { calculateRoadHealth, getCalculatedPuneWards, getWardHealthStatus } from '../store/analyticsSelectors';

import { PunePriorityCorridorsCard } from '../components/common/PunePriorityCorridorsCard';
import { SEEDED_PUNE_PRIORITY_ROUTES } from '../services/puneRoutes';
import { calculateSensingCoverage, useFilteredPmpmlFleet } from '../utils/puneRouteMatcher';
import { PUNE_DEMO_HOTSPOTS_SUMMARY } from '../services/puneTrafficHotspots';

interface CommandCenterProps {
  onNavigate: (tab: TabType) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onNavigate }) => {
  const { events: rawEvents, kpis, setSelectedEvent, isLoading: isEventsLoading } = useEventStore();
  const corroboratedEvents = useCorroboratedEvents(rawEvents);
  const events = usePrioritizedEvents(corroboratedEvents);
  const { wards, fleet, isLoading: isFleetLoading, feedStatus, lastUpdateTimestamp } = useFleetStore();
  const { smoothedSnapshot } = useTrafficStreamStore();
  const isLoading = isEventsLoading || isFleetLoading;

  // Real-time ticking for "Updated Xs ago"
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(timer);
  }, []);

  const { 
    searchQuery, 
    selectedEventTypes, 
    selectedSeverities, 
    selectedWard, 
    selectedRoute,
    onlyPunePriorityRoutes,
    setWard,
    onlyCorroborated 
  } = useFilterStore();

  const PUNE_ROUTE_IDS = SEEDED_PUNE_PRIORITY_ROUTES.map(r => r.route_id);

  // Filter events according to global filter state
  const filteredEvents = events.filter((e) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = e.event_id.toLowerCase().includes(q);
      const matchLoc = e.location_name?.toLowerCase().includes(q);
      const matchBus = e.bus_id.toLowerCase().includes(q);
      const matchRoute = e.route_id.toLowerCase().includes(q);
      if (!matchId && !matchLoc && !matchBus && !matchRoute) return false;
    }
    if (!selectedEventTypes.includes(e.event_type)) return false;
    if (!selectedSeverities.includes(e.severity)) return false;
    if (selectedWard !== 'ALL' && e.ward_id !== selectedWard) return false;
    if (selectedRoute !== 'ALL') {
      const eRoute = (e.route_id || '').toLowerCase();
      if (!eRoute.includes(selectedRoute.toLowerCase())) return false;
    }
    if (onlyPunePriorityRoutes) {
      const isPune = PUNE_ROUTE_IDS.some(id => (e.route_id || '').toLowerCase().includes(id.toLowerCase()));
      if (!isPune) return false;
    }
    if (onlyCorroborated && e.corroboration_count < 2) return false;
    return true;
  });

  // Top Priority Actions
  const topPriorities = events.slice(0, 4);

  // Live alert feed
  const liveAlerts = filteredEvents.slice(0, 6);

  const displayWards = useMemo(() => {
    if (wards && wards.length > 0) return wards;
    return getCalculatedPuneWards(events);
  }, [wards, events]);

  // Derived City Road Health Score & Top Defect Burden Ward
  const cityRoadHealth = useMemo(() => calculateRoadHealth(events), [events]);
  const cityHealthStatus = getWardHealthStatus(cityRoadHealth);
  const lowestWard = useMemo(() => {
    if (!displayWards || displayWards.length === 0) return null;
    return displayWards.reduce((prev, curr) => (curr.health_score < prev.health_score ? curr : prev), displayWards[0]);
  }, [displayWards]);

  const criticalCount = events.filter((e) => e.severity === 'CRITICAL' && e.status !== 'RESOLVED').length;
  
  // Real PMPML Fleet calculations — Centrally Filtered to 7 Priority Corridors
  const monitoredFleet = useFilteredPmpmlFleet(fleet);
  const isLiveFeedActive = feedStatus === 'LIVE' || feedStatus === 'STALE';
  const monitoredActiveCount = monitoredFleet.filter((b) => b.status === 'ACTIVE').length;
  const nearDepotCount = monitoredFleet.filter((b) => b.near_depot).length;
  const runningCount = monitoredFleet.filter((b) => !b.near_depot).length;

  const secondsAgo = lastUpdateTimestamp ? Math.max(0, Math.floor((now - lastUpdateTimestamp) / 1000)) : null;

  let fleetStatusValue = 'PMPML LIVE';
  let fleetStatusUnit = '';
  let fleetStatusTrendLabel = secondsAgo != null ? `Updated ${secondsAgo}s ago` : 'Real-time Telemetry';
  let fleetVariant: 'default' | 'warning' | 'critical' = 'default';

  if (feedStatus === 'LIVE') {
    fleetStatusValue = 'PMPML LIVE';
    fleetStatusTrendLabel = secondsAgo != null ? `Updated ${secondsAgo}s ago` : 'Real-time Telemetry';
    fleetVariant = 'default';
  } else if (feedStatus === 'STALE') {
    fleetStatusValue = 'PMPML FEED STALE';
    fleetStatusTrendLabel = secondsAgo != null ? `Last update ${secondsAgo}s ago` : 'Delayed Feed';
    fleetVariant = 'warning';
  } else {
    fleetStatusValue = 'PMPML LIVE FEED UNAVAILABLE';
    fleetStatusTrendLabel = 'Upstream Offline';
    fleetVariant = 'critical';
  }

  // Data-driven Sensing Coverage calculation across 7 Priority Corridors
  const { 
    coveredCount: coveredCorridorsCount, 
    totalCorridors, 
    coveragePct: sensingCoveragePct, 
    activeCorridorIds 
  } = calculateSensingCoverage(monitoredFleet);

  const sensingCoverageValue = isLiveFeedActive && monitoredFleet.length > 0 ? `${coveredCorridorsCount} / ${totalCorridors}` : '0 / 7';
  const sensingCoverageUnit = 'Corridors Active';
  const sensingCoverageTrend = isLiveFeedActive && monitoredFleet.length > 0 
    ? `${sensingCoveragePct}% Sensing (${activeCorridorIds.join(', ')})` 
    : 'PMPML feed unavailable';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Urban Operations Command Center"
        subtitle="Centralized AI Sensing & Fleet Telemetry Surveillance Platform"
        badge="REAL-TIME TELEMETRY"
        badgeColor="emerald"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('alert-center')}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-600/20"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Triage Priority Queue ({criticalCount})
            </button>
            <button
              onClick={() => window.open('/gis/fullscreen', '_blank')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Open Dedicated Fullscreen GIS Map in New Browser Tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              FULL GIS VIEW
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            title="Fleet Status"
            value={fleetStatusValue}
            unit={fleetStatusUnit}
            icon={Radio}
            variant={fleetVariant}
            trend={{ value: fleetStatusTrendLabel, isPositive: feedStatus === 'LIVE', label: '' }}
            onClick={() => onNavigate('fleet')}
          />

          <KPICard
            title="Active Buses"
            value={isLiveFeedActive && monitoredFleet.length > 0 ? `${monitoredActiveCount} PMPML` : "0 PMPML"}
            unit="buses"
            icon={Bus}
            variant={isLiveFeedActive && monitoredFleet.length > 0 ? "default" : "warning"}
            trend={{ 
              value: isLiveFeedActive && monitoredFleet.length > 0 ? `${monitoredFleet.length} Monitored` : 'Feed Offline', 
              isPositive: isLiveFeedActive && monitoredFleet.length > 0, 
              label: isLiveFeedActive && monitoredFleet.length > 0 ? `${runningCount} running` : '' 
            }}
            onClick={() => onNavigate('fleet')}
          />

          <KPICard
            title="Sensing Coverage"
            value={sensingCoverageValue}
            unit={sensingCoverageUnit}
            icon={Radio}
            variant="info"
            trend={{ 
              value: sensingCoverageTrend, 
              isPositive: isLiveFeedActive && coveredCorridorsCount > 0, 
              label: '' 
            }}
            onClick={() => onNavigate('live-gis')}
          />

          <KPICard
            title="AI Events (Demo)"
            value={kpis.hazards_24h}
            unit="Mock Data"
            icon={Activity}
            variant="warning"
            trend={{ value: 'Simulated', isPositive: false, label: 'Sensors' }}
            onClick={() => onNavigate('road-intelligence')}
          />

          <KPICard
            title="Traffic Hotspots"
            value={`${PUNE_DEMO_HOTSPOTS_SUMMARY.totalHotspots} Hotspots`}
            unit="(DEMO)"
            icon={TrendingUp}
            variant="warning"
            trend={{ value: `${PUNE_DEMO_HOTSPOTS_SUMMARY.averageSpeedKmh} km/h`, isPositive: false, label: 'Avg Speed' }}
            onClick={() => onNavigate('traffic-analytics')}
          />

          <KPICard
            title="Critical Alerts"
            value={criticalCount}
            unit="Urgent"
            icon={ShieldAlert}
            variant="critical"
            trend={{ value: 'Action Required', isPositive: false, label: '' }}
            onClick={() => onNavigate('alert-center')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate('road-intelligence')}
          className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-4 backdrop-blur-md flex items-center justify-between hover:border-slate-700 transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Road Health Index
              </span>
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold border", cityHealthStatus.badgeClass)}>
                {cityRoadHealth}/100
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1">
              Top load in <strong className="text-amber-400">{lowestWard?.ward_name || 'Central Pune'}</strong> ({lowestWard?.active_hazards || 0} defects)
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('traffic-analytics')}
          className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-4 backdrop-blur-md flex items-center justify-between hover:border-slate-700 transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Traffic Status
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                TRAFFIC ANALYSIS — DEMO
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-1 line-clamp-1">
              Condition: <strong className={cn(
                "font-mono font-bold",
                smoothedSnapshot.traffic_state === 'HEAVY' ? 'text-rose-400' :
                smoothedSnapshot.traffic_state === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {smoothedSnapshot.traffic_state} CONGESTION ({smoothedSnapshot.density_score}% DENSITY)
              </strong>
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2">
              <span>{smoothedSnapshot.total_vehicles} Vehicles Detected</span> • <span>{smoothedSnapshot.cars} cars, {smoothedSnapshot.bikes} bikes, {smoothedSnapshot.buses} buses</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('fleet')}
          className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-4 backdrop-blur-md flex items-center justify-between hover:border-slate-700 transition-all cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Fleet Status
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                feedStatus === 'LIVE' ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                feedStatus === 'STALE' ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                "bg-slate-800 text-slate-400 border-slate-700"
              )}>
                {isLiveFeedActive && fleet.length > 0 ? `${fleet.length} BUSES ONLINE` : 'OFFLINE'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1">
              <strong className="text-emerald-400 font-mono">{sensingCoveragePct}%</strong> Sensing coverage across 7 priority corridors
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2 font-mono">
              <span className="text-emerald-400 font-semibold">{runningCount} Running</span> • <span className="text-slate-400">{nearDepotCount} In Depot</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
            <Bus className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-4 backdrop-blur-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                AI Pipeline Status
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1">
              Edge Vision Ingest • <strong className="text-blue-400 font-mono">Active Telemetry</strong>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
        </div>
      </div>

      <PunePriorityCorridorsCard />

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                Top Priority Municipal Actions
              </h2>
            </div>
          </div>
          <button
            onClick={() => onNavigate('alert-center')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            Open Alert Triage <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {isLoading ? (
            <><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
          ) : (
            topPriorities.map((evt, idx) => (
              <div
                key={evt.event_id}
                onClick={() => setSelectedEvent(evt)}
                className="group relative rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      #{idx + 1} Rank
                    </span>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold font-mono border", 
                        evt.priority_level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                        'bg-blue-500/10 text-blue-400 border-blue-500/20')}>
                        {evt.priority_level}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 font-semibold block">
                      {getEventTypeLabel(evt.event_type)}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-100 mt-0.5 line-clamp-2">
                      {evt.location_name || `Hazard on Route ${evt.route_id}`}
                    </h3>
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400 font-medium leading-relaxed">
                    Detected by <span className="font-mono text-slate-300">{evt.bus_id}</span> on route <span className="font-mono text-slate-300">{evt.route_id}</span>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-900 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px] font-mono">
                    Urgency Score: <strong className="text-amber-400 font-bold">{evt.priority_score}/100</strong>
                  </span>
                  <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium text-[11px]">
                    Inspect <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <SectionHeader
            title="Geospatial Fleet & Hazard Incident Map"
            description="Real-time PMPML fleet telemetry, detected potholes, waterlogging, and congestion nodes"
            action={
              <button
                onClick={() => window.open('/gis/fullscreen', '_blank')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                Expand GIS View <ExternalLink className="w-3.5 h-3.5" />
              </button>
            }
          />
          <MapLibreMap
            events={filteredEvents}
            fleet={monitoredFleet}
            className="w-full h-[520px]"
            showLayerControls={true}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Ward Road Health Index
                  </h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                    PMC DEMO DATA
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Road quality & defect scoring derived from active alerts</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded">
                6 Zones
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {isLoading && displayWards.length === 0 ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : (
                displayWards.map((w, idx) => {
                  const isSelected = selectedWard === w.ward_id;
                  const statusInfo = getWardHealthStatus(w.health_score);
                  return (
                    <div
                      key={w.ward_id}
                      onClick={() => setWard(isSelected ? 'ALL' : w.ward_id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-[11px] text-slate-500 font-bold w-3 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-200 truncate">
                            {w.ward_name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline shrink-0">
                            ({w.active_hazards} issues)
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden xs:block">
                            <div
                              className={`h-full ${statusInfo.barClass} transition-all duration-500`}
                              style={{ width: `${w.health_score}%` }}
                            />
                          </div>
                          <span className={`font-mono font-bold text-xs ${statusInfo.color} min-w-[24px] text-right`}>
                            {w.health_score}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Live Alert Stream Panel */}
          <div className="space-y-3">
            <SectionHeader
              title="Real-Time Alert Stream (Demo)"
              count={liveAlerts.length}
              description="Continuous sensor feed across all 4 AI event types"
              action={
                <button
                  onClick={() => onNavigate('alert-center')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  All Alerts <ArrowRight className="w-3.5 h-3.5" />
                </button>
              }
            />

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : liveAlerts.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs font-mono">
                  No alerts matching active filter parameters.
                </div>
              ) : (
                liveAlerts.map((evt) => (
                  <AlertCard
                    key={evt.event_id}
                    event={evt}
                    showConfidence={true}
                    onClick={() => setSelectedEvent(evt)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
