import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SectionHeader } from '../components/common/SectionHeader';
import { KPICard } from '../components/common/KPICard';
import { KPICardSkeleton, TableRowSkeleton, CardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useFleetStore } from '../store/useFleetStore';
import { useFilteredPmpmlFleet } from '../utils/puneRouteMatcher';
import { Bus, Wifi, Activity, Inbox, MapPin, Eye, Radio, ShieldCheck } from 'lucide-react';

export const Fleet: React.FC = () => {
  const { fleet, routes, isLoading, fleetMode, feedStatus, setFleetMode, setSelectedBus } = useFleetStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepot, setFilterDepot] = useState<'ALL' | 'RUNNING' | 'DEPOT'>('ALL');
  const [fleetScope, setFleetScope] = useState<'MONITORED' | 'ALL'>('MONITORED');

  const isLiveMode = fleetMode === 'LIVE';

  // Centrally filtered 7 Priority Corridors fleet (Primary View)
  const monitoredFleet = useFilteredPmpmlFleet(fleet);
  const baseFleet = fleetScope === 'MONITORED' ? monitoredFleet : fleet;
  
  // Real PMPML statistics
  const runningBuses = baseFleet.filter((b) => !b.near_depot).length;
  const inDepotBuses = baseFleet.filter((b) => b.near_depot).length;
  const totalTracked = baseFleet.length;
  const totalRawBuses = fleet.length;

  const filteredFleet = baseFleet.filter((b) => {
    const matchesSearch = 
      b.bus_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.route_id && b.route_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.route_number && b.route_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.route_name && b.route_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterDepot === 'RUNNING') return !b.near_depot;
    if (filterDepot === 'DEPOT') return b.near_depot;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="PMPML Public Transport Bus Fleet & Telemetry Grid"
          subtitle="Real-Time Mobile Urban Sensing Across Pune Municipal Transport Network"
          badge={
            isLiveMode
              ? `${feedStatus}: ${totalTracked} BUSES TRACKED`
              : 'DEMO SIMULATION ACTIVE'
          }
          badgeColor={isLiveMode ? (feedStatus === 'LIVE' ? 'emerald' : 'amber') : 'blue'}
        />

        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 shadow-lg">
          <button
            onClick={() => setFleetMode('LIVE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              isLiveMode
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> PMPML LIVE FEED
          </button>
          <button
            onClick={() => setFleetMode('DEMO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              !isLiveMode
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> DEMO SIMULATION
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={fleetScope === 'MONITORED' ? "Monitored Fleet" : "Total Fleet Tracked"}
            value={totalTracked}
            unit={fleetScope === 'MONITORED' ? "Corridor Buses" : "Citywide Buses"}
            icon={Bus}
            variant="info"
            trend={{
              value: fleetScope === 'MONITORED' ? `${totalRawBuses} Total Ingested` : (isLiveMode ? 'PMPML API' : 'Synthetic'),
              isPositive: true,
              label: fleetScope === 'MONITORED' ? '7 Monitored Routes' : (isLiveMode ? 'Official Feed' : 'Local Sandbox'),
            }}
          />

          <KPICard
            title="Running in Transit"
            value={runningBuses}
            unit={`/ ${totalTracked} Active`}
            icon={Wifi}
            variant="success"
            trend={{
              value: totalTracked > 0 ? `${Math.round((runningBuses / totalTracked) * 100)}%` : '0%',
              isPositive: true,
              label: 'Active on Corridors',
            }}
          />

          <KPICard
            title="Staged Near Depots"
            value={inDepotBuses}
            unit="Stationary / Terminal"
            icon={MapPin}
            variant="warning"
            trend={{
              value: totalTracked > 0 ? `${Math.round((inDepotBuses / totalTracked) * 100)}%` : '0%',
              isPositive: false,
              label: 'Depot Perimeter',
            }}
          />

          <KPICard
            title="Priority Corridors"
            value={routes.length}
            unit="Monitored Routes"
            icon={Activity}
            variant="default"
            trend={{
              value: '100% Verified',
              isPositive: true,
              label: 'Pune Metro Region',
            }}
          />
        </div>
      )}

      {/* Key Monitored Bus Routes Coverage */}
      <div className="space-y-3">
        <SectionHeader
          title="Monitored Priority Corridors"
          count={routes.length}
          description="High-frequency urban arteries and transit links with active bus tracking"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            routes.map((rt) => (
              <div
                key={rt.route_id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                    Route {rt.route_id}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                    {rt.coverage_score}% Coverage
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-200 mt-2.5 truncate" title={rt.route_name}>
                  {rt.route_name}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80 font-mono">
                  <span>{rt.active_buses}/{rt.total_buses} Buses Active</span>
                  <span>{rt.distance_km} km</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bus Fleet Inventory Table with Filter Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <SectionHeader
            title={isLiveMode ? "PMPML Live Telemetry Fleet" : "Demo Fleet Simulation"}
            count={filteredFleet.length}
            description={
              isLiveMode 
                ? "Authoritative live feed ingested via Chartr PMPML API" 
                : "Simulated bus sensors streaming on Route 201 corridor"
            }
          />

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Scope filter toggle: 7 Priority Corridors vs All Citywide */}
            <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setFleetScope('MONITORED')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  fleetScope === 'MONITORED' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Only show buses associated with the 7 Priority Monitoring Corridors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>7 Corridors ({monitoredFleet.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFleetScope('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  fleetScope === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Show all buses across Pune transit network"
              >
                <span>All Fleet ({totalRawBuses})</span>
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Filter bus ID or route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono w-full sm:w-48"
            />

            {/* Depot filter toggle */}
            <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs font-mono">
              <button
                onClick={() => setFilterDepot('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterDepot === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterDepot('RUNNING')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterDepot === 'RUNNING' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Running
              </button>
              <button
                onClick={() => setFilterDepot('DEPOT')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterDepot === 'DEPOT' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                In Depot
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800 text-[11px] sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Bus ID</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Operating Status</th>
                <th className="py-3 px-4">Depot Proximity</th>
                <th className="py-3 px-4">GPS Coordinates</th>
                <th className="py-3 px-4">Data Age</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <>
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                </>
              ) : filteredFleet.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <EmptyState
                      icon={Inbox}
                      title="No matching buses found"
                      description="Try adjusting your search query or status filter."
                      className="border-0 bg-transparent p-4"
                    />
                  </td>
                </tr>
              ) : (
                filteredFleet.slice(0, 100).map((bus) => {
                  const isLiveBus = bus.source === 'PMPML_LIVE';
                  return (
                    <tr key={bus.bus_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5 text-blue-400" /> {bus.bus_id}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-slate-200">
                          Route {bus.route_number || bus.route_id}
                        </div>
                        {bus.route_name && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {bus.route_name}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            bus.near_depot
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {bus.near_depot ? 'IN DEPOT' : 'RUNNING'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        {bus.near_depot ? (
                          <span className="text-amber-400 font-semibold">Yes (Terminal)</span>
                        ) : (
                          <span className="text-slate-400">No (Corridor)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {bus.latitude.toFixed(4)}°N, {bus.longitude.toFixed(4)}°E
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        {bus.data_age_seconds != null ? (
                          <span className={`${bus.data_age_seconds < 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {bus.data_age_seconds}s ago
                          </span>
                        ) : (
                          <span className="text-slate-400">Live</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                            isLiveBus
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {isLiveBus ? 'PMPML LIVE' : 'DEMO SIM'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedBus(bus)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors inline-flex items-center gap-1 text-[11px] font-mono"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredFleet.length > 100 && (
          <div className="p-3 text-center text-xs font-mono text-slate-500 border-t border-slate-800 bg-slate-950/60">
            Showing top 100 of {filteredFleet.length} tracked buses in table. GIS Map displays full spatial fleet.
          </div>
        )}
      </div>
    </div>
  );
};
