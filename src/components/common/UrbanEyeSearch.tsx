import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Route as RouteIcon, 
  Bus as BusIcon, 
  MapPin, 
  AlertTriangle, 
  Droplets, 
  OctagonAlert, 
  Car, 
  Activity,
  ExternalLink
} from 'lucide-react';
import { useEventStore } from '../../store/useEventStore';
import { useFleetStore } from '../../store/useFleetStore';
import { useFilterStore } from '../../store/useFilterStore';
import { SEEDED_PUNE_PRIORITY_ROUTES } from '../../services/puneRoutes';
import { UrbanEyeEvent, BusTelemetry } from '../../types/events';
import { cn, getEventTypeLabel } from '../../lib/utils';

interface UrbanEyeSearchProps {
  className?: string;
  variant?: 'compact' | 'full';
  placeholder?: string;
}

export const UrbanEyeSearch: React.FC<UrbanEyeSearchProps> = ({
  className = '',
  variant = 'compact',
  placeholder = 'Search buses, routes, events or locations...',
}) => {
  const { events, setSelectedEvent } = useEventStore();
  const { fleet, setSelectedBus } = useFleetStore();
  const { 
    searchQuery: globalSearchQuery, 
    setSearchQuery: setGlobalSearchQuery, 
    setRoute, 
    setFocusLocation,
    selectedJurisdiction,
    onlyPunePriorityRoutes 
  } = useFilterStore();

  const [inputVal, setInputVal] = useState(globalSearchQuery || '');
  const [debouncedVal, setDebouncedVal] = useState(globalSearchQuery || '');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input value (200ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedVal(inputVal.trim());
      setGlobalSearchQuery(inputVal.trim());
    }, 200);

    return () => clearTimeout(handler);
  }, [inputVal, setGlobalSearchQuery]);

  // Sync if global searchQuery is reset externally
  useEffect(() => {
    if (!globalSearchQuery && inputVal) {
      setInputVal('');
      setDebouncedVal('');
    }
  }, [globalSearchQuery, inputVal]);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique locations from events and priority corridors
  const locationsList = useMemo(() => {
    const map = new Map<string, { name: string; coordinates: [number, number]; count: number; routeCount: number }>();

    // From priority corridors
    SEEDED_PUNE_PRIORITY_ROUTES.forEach((rt) => {
      if (rt.origin && rt.coordinates && rt.coordinates.length > 0) {
        const key = rt.origin.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { name: rt.origin, coordinates: rt.coordinates[0], count: 0, routeCount: 1 });
        } else {
          map.get(key)!.routeCount += 1;
        }
      }
      if (rt.destination && rt.coordinates && rt.coordinates.length > 0) {
        const key = rt.destination.toLowerCase();
        const lastCoord = rt.coordinates[rt.coordinates.length - 1];
        if (!map.has(key)) {
          map.set(key, { name: rt.destination, coordinates: lastCoord, count: 0, routeCount: 1 });
        } else {
          map.get(key)!.routeCount += 1;
        }
      }
    });

    // From hazard events
    events.forEach((evt) => {
      if (evt.location_name) {
        const key = evt.location_name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { name: evt.location_name, coordinates: [evt.longitude, evt.latitude], count: 1, routeCount: 0 });
        } else {
          map.get(key)!.count += 1;
        }
      }
    });

    return Array.from(map.values());
  }, [events]);

  // Execute multi-category search against single source of truth
  const searchResults = useMemo(() => {
    const q = debouncedVal.toLowerCase();
    if (!q) {
      return { events: [], routes: [], buses: [], locations: [], total: 0 };
    }

    // 1. MATCH ROUTES
    const matchedRoutes = SEEDED_PUNE_PRIORITY_ROUTES.filter((r) => {
      return (
        r.route_id.toLowerCase().includes(q) ||
        r.route_name.toLowerCase().includes(q) ||
        (r.origin && r.origin.toLowerCase().includes(q)) ||
        (r.destination && r.destination.toLowerCase().includes(q))
      );
    }).slice(0, 5);

    // 2. MATCH BUSES (PMPML Live fleet or Demo simulated fleet)
    const matchedBuses = (fleet || []).filter((b) => {
      const matchId = b.bus_id.toLowerCase().includes(q);
      const matchRoute = (b.route_id && b.route_id.toLowerCase().includes(q)) ||
                         (b.route_number && b.route_number.toLowerCase().includes(q));
      const matchName = b.route_name && b.route_name.toLowerCase().includes(q);
      return matchId || matchRoute || matchName;
    }).slice(0, 6);

    // 3. MATCH EVENTS
    const matchedEvents = events.filter((e) => {
      // Scope filter compliance (Rule 13)
      if (onlyPunePriorityRoutes || selectedJurisdiction === 'PMC_PUNE') {
        const isPuneCorridor = SEEDED_PUNE_PRIORITY_ROUTES.some(
          (pr) => pr.route_id.toLowerCase() === (e.route_id || '').toLowerCase()
        );
        if (!isPuneCorridor && e.jurisdiction && e.jurisdiction !== 'PMC' && e.jurisdiction !== 'PMC_PUNE') return false;
      }

      const matchId = e.event_id.toLowerCase().includes(q);
      const matchType = e.event_type.toLowerCase().includes(q) ||
                        getEventTypeLabel(e.event_type).toLowerCase().includes(q);
      const matchLoc = e.location_name && e.location_name.toLowerCase().includes(q);
      const matchRoute = e.route_id && (e.route_id.toLowerCase().includes(q) || `route ${e.route_id}`.toLowerCase().includes(q));
      const matchBus = e.bus_id && e.bus_id.toLowerCase().includes(q);
      const matchSeverity = e.severity && e.severity.toLowerCase().includes(q);
      const matchStatus = e.status && e.status.toLowerCase().includes(q);

      return matchId || matchType || matchLoc || matchRoute || matchBus || matchSeverity || matchStatus;
    }).slice(0, 6);

    // 4. MATCH LOCATIONS
    const matchedLocations = locationsList.filter((loc) => {
      return loc.name.toLowerCase().includes(q);
    }).slice(0, 5);

    const total = matchedRoutes.length + matchedBuses.length + matchedEvents.length + matchedLocations.length;

    return {
      routes: matchedRoutes,
      buses: matchedBuses,
      events: matchedEvents,
      locations: matchedLocations,
      total,
    };
  }, [debouncedVal, events, fleet, locationsList, onlyPunePriorityRoutes, selectedJurisdiction]);

  // Click Handlers (Rule 4: Reuse existing interactions)
  const handleSelectEvent = (evt: UrbanEyeEvent) => {
    setSelectedEvent(evt);
    setFocusLocation([evt.longitude, evt.latitude]);
    setIsOpen(false);
  };

  const handleSelectBus = (bus: BusTelemetry) => {
    setSelectedBus(bus);
    setFocusLocation([bus.longitude, bus.latitude]);
    setIsOpen(false);
  };

  const handleSelectRoute = (rt: typeof SEEDED_PUNE_PRIORITY_ROUTES[0]) => {
    setRoute(rt.route_id);
    if (rt.coordinates && rt.coordinates.length > 0) {
      const midIdx = Math.floor(rt.coordinates.length / 2);
      setFocusLocation(rt.coordinates[midIdx]);
    }
    setIsOpen(false);
  };

  const handleSelectLocation = (loc: typeof locationsList[0]) => {
    setFocusLocation(loc.coordinates);
    // If there's an event at this location, select the top priority one
    const matchingEvt = events.find(
      (e) => e.location_name && e.location_name.toLowerCase() === loc.name.toLowerCase()
    );
    if (matchingEvt) {
      setSelectedEvent(matchingEvt);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputVal('');
    setDebouncedVal('');
    setGlobalSearchQuery('');
    setFocusLocation(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Helper for Event Type Icon
  const renderEventIcon = (type: string) => {
    switch (type) {
      case 'POTHOLE':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'WATERLOGGING':
        return <Droplets className="w-3.5 h-3.5 text-cyan-400" />;
      case 'DAMAGED_SIGN':
        return <OctagonAlert className="w-3.5 h-3.5 text-amber-400" />;
      case 'TRAFFIC':
        return <Car className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const hasQuery = inputVal.trim().length > 0;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-20 py-2 text-xs text-slate-200 placeholder-slate-500 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner',
            variant === 'compact' ? 'max-w-md' : ''
          )}
        />

        {/* Action controls: Clear + Shortcut Badge */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {hasQuery && (
            <button
              onClick={handleClear}
              aria-label="Clear search"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 border border-slate-700/60 rounded">
            <span className="text-[9px]">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Compact Dropdown Popover */}
      {isOpen && hasQuery && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-xl z-50 max-h-[420px] overflow-y-auto divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-150">
          {searchResults.total === 0 ? (
            /* Global Empty State (Rule 5) */
            <div className="p-6 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-300">
                No matching events, routes, buses, or locations
              </p>
              <p className="text-[11px] text-slate-500">
                Try searching for route &quot;201&quot;, &quot;pothole&quot;, &quot;Hadapsar&quot;, or vehicle &quot;MH12&quot;
              </p>
            </div>
          ) : (
            <>
              {/* Category: ROUTES */}
              {searchResults.routes.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <RouteIcon className="w-3 h-3 text-blue-400" /> Routes
                    </span>
                    <span className="text-slate-500">{searchResults.routes.length} found</span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {searchResults.routes.map((rt) => (
                      <button
                        key={rt.route_id}
                        onClick={() => handleSelectRoute(rt)}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                            Rt {rt.route_id}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                              {rt.route_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Priority Corridor #{rt.priority_rank}{rt.distance_km ? ` • ${rt.distance_km} km` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5 ml-2">
                          Focus <ExternalLink className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: BUSES */}
              {searchResults.buses.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <BusIcon className="w-3 h-3 text-emerald-400" /> Active Buses
                    </span>
                    <span className="text-slate-500">{searchResults.buses.length} tracked</span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {searchResults.buses.map((bus) => (
                      <button
                        key={bus.bus_id}
                        onClick={() => handleSelectBus(bus)}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-xs font-bold text-white shrink-0">
                            {bus.bus_id}
                          </span>
                          <span className="text-[10px] font-mono text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 shrink-0">
                            Rt {bus.route_number || bus.route_id}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {bus.route_name || 'Active Corridor'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            bus.near_depot 
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {bus.near_depot ? 'DEPOT' : 'RUNNING'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: EVENTS */}
              {searchResults.events.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> Hazard & Traffic Incidents
                    </span>
                    <span className="text-slate-500">{searchResults.events.length} found</span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {searchResults.events.map((evt) => (
                      <button
                        key={evt.event_id}
                        onClick={() => handleSelectEvent(evt)}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-md bg-slate-950 border border-slate-800 shrink-0">
                            {renderEventIcon(evt.event_type)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-white">
                                {evt.event_id}
                              </span>
                              <span className={cn(
                                'text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border',
                                evt.severity === 'CRITICAL' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                                evt.severity === 'HIGH' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                                evt.severity === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                                'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              )}>
                                {evt.severity}
                              </span>
                              {evt.corroboration_count >= 2 && (
                                <span className="text-[9px] font-mono font-semibold px-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {evt.corroboration_count} Buses
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {evt.location_name || `Incident on Route ${evt.route_id}`}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5 ml-2">
                          Inspect <ExternalLink className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category: LOCATIONS */}
              {searchResults.locations.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-amber-400" /> Pune Locations & Points
                    </span>
                    <span className="text-slate-500">{searchResults.locations.length} nodes</span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {searchResults.locations.map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => handleSelectLocation(loc)}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                              {loc.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {loc.count > 0 ? `${loc.count} hazard incident(s)` : ''}
                              {loc.count > 0 && loc.routeCount > 0 ? ' • ' : ''}
                              {loc.routeCount > 0 ? `${loc.routeCount} corridor connection(s)` : ''}
                              {loc.count === 0 && loc.routeCount === 0 ? 'Pune Municipal Node' : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5 ml-2">
                          Zoom <ExternalLink className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
