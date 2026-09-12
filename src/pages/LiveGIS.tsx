import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { MapLibreMap } from '../components/gis/MapLibreMap';
import { GlobalFilterBar } from '../components/common/GlobalFilterBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useEventStore } from '../store/useEventStore';
import { useCorroboratedEvents } from '../store/corroborationSelectors';
import { usePrioritizedEvents } from '../store/priorityEngine';
import { useFleetStore } from '../store/useFleetStore';
import { useFilterStore } from '../store/useFilterStore';
import { Crosshair, Inbox } from 'lucide-react';
import { getEventTypeLabel } from '../lib/utils';
import { getCalculatedPuneWards, getWardHealthStatus } from '../store/analyticsSelectors';
import { useFilteredPmpmlFleet } from '../utils/puneRouteMatcher';

import { PunePriorityCorridorsCard } from '../components/common/PunePriorityCorridorsCard';
import { SEEDED_PUNE_PRIORITY_ROUTES } from '../services/puneRoutes';

export const LiveGIS: React.FC = () => {
  const { events: rawEvents, setSelectedEvent, isLoading: isEventsLoading, connectionStatus } = useEventStore();
  const corroboratedEvents = useCorroboratedEvents(rawEvents);
  const events = usePrioritizedEvents(corroboratedEvents);
  const { wards, fleet, isLoading: isFleetLoading, feedStatus } = useFleetStore();
  const monitoredFleet = useFilteredPmpmlFleet(fleet);
  const isLoading = isEventsLoading || isFleetLoading;

  const displayWards = useMemo(() => {
    if (wards && wards.length > 0) return wards;
    return getCalculatedPuneWards(events);
  }, [wards, events]);
  const { 
    selectedWard, 
    setWard, 
    selectedEventTypes, 
    selectedSeverities, 
    onlyCorroborated, 
    searchQuery,
    selectedRoute,
    onlyPunePriorityRoutes,
    setRoute
  } = useFilterStore();
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  const PUNE_ROUTE_IDS = SEEDED_PUNE_PRIORITY_ROUTES.map(r => r.route_id);

  const filteredEvents = events.filter((e) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = e.event_id.toLowerCase().includes(q);
      const matchLoc = e.location_name?.toLowerCase().includes(q);
      const matchBus = e.bus_id.toLowerCase().includes(q);
      const matchRoute = e.route_id.toLowerCase().includes(q);
      const matchType = e.event_type.toLowerCase().includes(q);
      if (!matchId && !matchLoc && !matchBus && !matchRoute && !matchType) return false;
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

  const handleSelectEvent = (evt: typeof events[0]) => {
    setSelectedEvent(evt);
    setFocusLocation([evt.longitude, evt.latitude]);
  };

  const handleSelectPuneRoute = (rt: typeof SEEDED_PUNE_PRIORITY_ROUTES[0]) => {
    setRoute(rt.route_id);
    if (rt.coordinates && rt.coordinates.length > 0) {
      const midIdx = Math.floor(rt.coordinates.length / 2);
      setFocusLocation(rt.coordinates[midIdx]);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live GIS Geospatial Intelligence"
        subtitle="Spatio-Temporal Clustering & Multi-Bus Sensing Map"
        badge="MAPLIBRE VECTOR ENGINE"
        badgeColor="blue"
      />

      <GlobalFilterBar />

      {/* Pune Priority Monitoring Corridors Bar */}
      <PunePriorityCorridorsCard onSelectRoute={handleSelectPuneRoute} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Map Viewport (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <MapLibreMap
            events={filteredEvents}
            fleet={monitoredFleet}
            className="w-full h-[640px]"
            showLayerControls={true}
            focusLocation={focusLocation}
          />
        </div>

        {/* Right Geospatial Summary & Ward Index (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Ward Road Health Index Panel */}
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

          {/* Active Spatially Clustered Detections */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Visible Detections ({filteredEvents.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Click to zoom & inspect</span>
            </div>

            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : connectionStatus === 'LIVE' && feedStatus !== 'LIVE' ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  <EmptyState
                    icon={Inbox}
                    title="PMPML LIVE FEED UNAVAILABLE"
                    description="Real-time alerts cannot be generated without active telemetry."
                    className="border-0 bg-transparent p-4"
                  />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  <EmptyState
                    icon={Inbox}
                    title="No visible detections"
                    description="Try relaxing filter criteria or selecting another ward."
                    className="border-0 bg-transparent p-4"
                  />
                </div>
              ) : (
                filteredEvents.map((evt) => (
                  <div
                    key={evt.event_id}
                    onClick={() => handleSelectEvent(evt)}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs transition-all flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] text-white font-semibold group-hover:text-blue-400">
                          {evt.event_id}
                        </span>
                        <StatusBadge severity={evt.severity} size="sm" />
                        {evt.corroboration_count > 1 && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {evt.corroboration_count}x Bus
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 truncate mt-1">
                        {evt.location_name || `${getEventTypeLabel(evt.event_type)} on Rt ${evt.route_id}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-slate-300">
                        {evt.priority_score.toFixed(0)} pts
                      </span>
                      <Crosshair className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

