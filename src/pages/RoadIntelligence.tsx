import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { GlobalFilterBar } from '../components/common/GlobalFilterBar';
import { KPICard } from '../components/common/KPICard';
import { SectionHeader } from '../components/common/SectionHeader';
import { KPICardSkeleton, TableRowSkeleton, Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useEventStore } from '../store/useEventStore';
import { useFilterStore } from '../store/useFilterStore';
import { getEventTypeLabel } from '../lib/utils';
import { ShieldCheck, Eye, MapPin, Activity, AlertTriangle, TrendingDown, Inbox } from 'lucide-react';
import { calculateRoadHealth, getHotspotCandidates, getRoadIssueTrend } from '../store/analyticsSelectors';
import { useCorroboratedEvents } from '../store/corroborationSelectors';
import { usePrioritizedEvents } from '../store/priorityEngine';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const RoadIntelligence: React.FC = () => {
  const { events: rawEvents, setSelectedEvent, isLoading } = useEventStore();
  const corroboratedEvents = useCorroboratedEvents(rawEvents);
  const events = usePrioritizedEvents(corroboratedEvents);
  const { searchQuery, selectedEventTypes, selectedSeverities, selectedWard, onlyCorroborated } = useFilterStore();
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'POTHOLE' | 'WATERLOGGING' | 'DAMAGED_SIGN'>('ALL');

  const filteredEvents = events.filter((e) => {
    if (activeCategory !== 'ALL' && e.event_type !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = e.event_id.toLowerCase().includes(q);
      const matchLoc = e.location_name?.toLowerCase().includes(q);
      const matchBus = e.bus_id.toLowerCase().includes(q);
      if (!matchId && !matchLoc && !matchBus) return false;
    }
    if (!selectedEventTypes.includes(e.event_type)) return false;
    if (!selectedSeverities.includes(e.severity)) return false;
    if (selectedWard !== 'ALL' && e.ward_id !== selectedWard) return false;
    if (onlyCorroborated && e.corroboration_count < 2) return false;
    return true;
  });

  const potholeCount = events.filter((e) => e.event_type === 'POTHOLE').length;
  const waterloggingCount = events.filter((e) => e.event_type === 'WATERLOGGING').length;
  const signageCount = events.filter((e) => e.event_type === 'DAMAGED_SIGN').length;

  const cityRoadHealth = calculateRoadHealth(events, selectedWard);
  const hotspots = getHotspotCandidates(events).slice(0, 4);
  const roadIssueTrend = getRoadIssueTrend(events);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Road Intelligence & Hazard Inventory"
        subtitle="Automated Pothole Profiling, Waterlogging Spread & Road Asset Health"
        badge="CORROBORATED ASSET REGISTRY"
        badgeColor="amber"
      />

      <GlobalFilterBar />

      {/* Derived Analytics KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard
            title="Overall Road Health Score"
            value={`${cityRoadHealth}/100`}
            unit={selectedWard === 'ALL' ? 'City-wide' : 'Selected Ward'}
            icon={Activity}
            variant={cityRoadHealth > 75 ? 'default' : cityRoadHealth > 50 ? 'warning' : 'critical'}
            trend={{ value: 'Real-time', isPositive: cityRoadHealth > 50, label: 'Derived Score' }}
          />
          <KPICard
            title="Active Hotspot Zones"
            value={hotspots.length}
            unit="Wards at Risk"
            icon={AlertTriangle}
            variant="warning"
            trend={{ value: hotspots[0]?.ward_name || 'None', isPositive: false, label: 'Top Concern' }}
          />
          <KPICard
            title="Total Active Defects"
            value={potholeCount + waterloggingCount + signageCount}
            unit="Monitored Issues"
            icon={TrendingDown}
            variant="critical"
            trend={{ value: `${potholeCount} Potholes`, isPositive: false, label: 'Dominant Issue' }}
          />
        </div>
      )}

      {/* Road Issues — 7 Day Trend Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <SectionHeader
          title="Road Issues — 7 Day Trend"
          description="Daily frequency of potholes, waterlogging, and signage defects across sensing fleet"
        />

        {isLoading ? (
          <div className="h-64 w-full mt-4 flex items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800">
            <Skeleton className="h-56 w-full mx-4" />
          </div>
        ) : (
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={roadIssueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="potholeTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="waterTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="signTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="potholes"
                  name="Potholes"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#potholeTrendGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="waterlogging"
                  name="Waterlogging"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#waterTrendGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="signs"
                  name="Damaged Signs"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#signTrendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {hotspots.length > 0 && !isLoading && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
          <SectionHeader
            title="Top Hotspot Candidates"
            count={hotspots.length}
            description="Derived from active road defects, severity, and corroboration density"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {hotspots.map((hs) => (
              <div key={hs.ward_id} className="p-3 border border-slate-800 rounded-lg bg-slate-950 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{hs.ward_name}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {hs.event_count} active defects ({hs.critical_count} critical)
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-mono font-bold ${hs.health_score > 75 ? 'text-emerald-400' : hs.health_score > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {hs.health_score}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">Health Score</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'ALL'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          All Road Defects ({events.length})
        </button>

        <button
          onClick={() => setActiveCategory('POTHOLE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeCategory === 'POTHOLE'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Potholes ({potholeCount})
        </button>

        <button
          onClick={() => setActiveCategory('WATERLOGGING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeCategory === 'WATERLOGGING'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          Waterlogging ({waterloggingCount})
        </button>

        <button
          onClick={() => setActiveCategory('DAMAGED_SIGN')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeCategory === 'DAMAGED_SIGN'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Damaged Signs ({signageCount})
        </button>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3 px-4">Event ID & Type</th>
                <th className="py-3 px-4">Location & Ward</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Dimensions</th>
                <th className="py-3 px-4">Corroboration</th>
                <th className="py-3 px-4">Priority Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
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
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <EmptyState
                      icon={Inbox}
                      title="No road defects found"
                      description="No recorded road hazards match the selected filter criteria."
                      className="border-0 bg-transparent p-6"
                    />
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr
                    key={evt.event_id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedEvent(evt)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-white group-hover:text-blue-400">
                        {evt.event_id}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {getEventTypeLabel(evt.event_type)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-200 truncate">
                        {evt.location_name || 'Coordinate Detection'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {evt.ward_name || evt.ward_id} • Rt {evt.route_id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge severity={evt.severity} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {evt.estimated_dimensions?.depth_cm ? (
                        <span className="text-rose-400 font-semibold">
                          {evt.estimated_dimensions.length_cm}×{evt.estimated_dimensions.width_cm}×{evt.estimated_dimensions.depth_cm} cm
                        </span>
                      ) : evt.hazard_details?.water_depth_level ? (
                        <span className="text-cyan-400">{evt.hazard_details.water_depth_level}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        {evt.corroboration_count > 1 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                            <ShieldCheck className="w-3 h-3" />
                            {evt.corroboration_count} Buses
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Single Bus</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={
                            evt.priority_level === 'CRITICAL'
                              ? 'text-rose-400 font-bold font-mono'
                              : evt.priority_level === 'HIGH'
                              ? 'text-amber-400 font-bold font-mono'
                              : evt.priority_level === 'MEDIUM'
                              ? 'text-blue-400 font-bold font-mono'
                              : 'text-slate-400 font-bold font-mono'
                          }
                        >
                          {evt.priority_level}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {evt.priority_score} pts
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={evt.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors inline-flex items-center gap-1 text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
