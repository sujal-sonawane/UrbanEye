import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { KPICard } from '../components/common/KPICard';
import { SectionHeader } from '../components/common/SectionHeader';
import { KPICardSkeleton, TableRowSkeleton, Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { LiveCameraTrafficPlayer } from '../components/traffic/LiveCameraTrafficPlayer';
import { useEventStore } from '../store/useEventStore';
import { useTrafficStreamStore } from '../store/useTrafficStreamStore';
import { 
  getTopCongestedSegments 
} from '../store/analyticsSelectors';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';
import { TrendingUp, Bus, Gauge, AlertOctagon, Inbox } from 'lucide-react';

export const TrafficAnalytics: React.FC = () => {
  const { events, isLoading } = useEventStore();
  const { 
    isPlaying, 
    smoothedSnapshot, 
    snapshotHistory, 
    updateAgeSeconds 
  } = useTrafficStreamStore();
  
  const topCongested = getTopCongestedSegments(events);

  // Smoothed vehicle mix dynamically derived from recent 2.4s window
  const liveVehicleMix = [
    { name: 'Cars', count: isPlaying ? smoothedSnapshot.cars : 0, fill: '#3b82f6' },
    { name: 'Motorcycles', count: isPlaying ? smoothedSnapshot.bikes : 0, fill: '#f59e0b' },
    { name: 'Buses', count: isPlaying ? smoothedSnapshot.buses : 0, fill: '#10b981' },
    { name: 'Trucks', count: isPlaying ? smoothedSnapshot.trucks : 0, fill: '#a855f7' },
  ];

  // Rolling stream telemetry trend across smoothed 2.4s aggregation snapshots
  const liveTrendData = snapshotHistory.map((s, idx) => ({
    frame: idx === snapshotHistory.length - 1 ? 'Current' : `-${((snapshotHistory.length - 1 - idx) * 2.4).toFixed(0)}s`,
    vehicles: s.total_vehicles,
    density: s.density_score,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traffic Flow & Density Analytics"
        subtitle="Live Camera Traffic Analysis & Edge Vision Stream"
        badge="REAL-TIME EDGE YOLOv8 INFERENCE (SMOOTHED)"
        badgeColor="rose"
      />

      {/* Live Model-Driven Video Player */}
      <LiveCameraTrafficPlayer />

      {/* Metric Cards Fed from Live Model */}
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
            title="Vehicles In Camera View"
            value={isPlaying ? `${smoothedSnapshot.total_vehicles}` : '0'}
            unit="Smoothed Average"
            icon={Bus}
            variant="default"
            trend={{ 
              value: isPlaying ? `${smoothedSnapshot.total_vehicles} Observed` : 'Stream Paused', 
              isPositive: isPlaying, 
              label: '2.4s Window Aggregation' 
            }}
          />

          <KPICard
            title="Camera Traffic Density"
            value={isPlaying ? `${smoothedSnapshot.density_score}%` : 'Unavailable'}
            unit="ROI Capacity (20 Max)"
            icon={TrendingUp}
            variant="warning"
            trend={{ 
              value: isPlaying ? smoothedSnapshot.traffic_state : 'Offline', 
              isPositive: smoothedSnapshot.traffic_state === 'LOW', 
              label: 'Smoothed Field-of-View' 
            }}
          />

          <KPICard
            title="Congestion Classification"
            value={isPlaying ? smoothedSnapshot.traffic_state : 'OFFLINE'}
            unit="Stabilized State"
            icon={AlertOctagon}
            variant={smoothedSnapshot.traffic_state === 'HEAVY' ? 'critical' : 'warning'}
            trend={{ 
              value: isPlaying ? updateAgeSeconds : 'Stream Inactive', 
              isPositive: isPlaying, 
              label: 'Snapshot Freshness' 
            }}
          />

          <KPICard
            title="Average Fleet Speed"
            value="Unavailable"
            unit="Radar Speed Offline"
            icon={Gauge}
            variant="info"
            trend={{ 
              value: 'Single Camera', 
              isPositive: false, 
              label: 'No Ground Homography' 
            }}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Rolling Density & Vehicle Count Curve (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
          <SectionHeader
            title="Live Detection Trend — Rolling Stream Window"
            description="Continuous vehicle count and field-of-view density from camera inference"
          />

          {isLoading ? (
            <div className="h-72 w-full mt-4 flex items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800">
              <Skeleton className="h-60 w-full mx-4" />
            </div>
          ) : !isPlaying && snapshotHistory.length === 0 ? (
            <div className="h-72 w-full mt-4 flex flex-col items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-center p-6">
              <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">Traffic camera stream unavailable</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Resume the live demo camera player above to start streaming continuous inference metrics.
              </p>
            </div>
          ) : (
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="vehicleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="frame" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="density"
                    name="Camera Density (%)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#densityGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="vehicles"
                    name="Vehicles In View"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#vehicleGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: Live Vehicle Classification Mix (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
          <SectionHeader
            title="Vehicle Classification Mix"
            description="Real-time YOLO categorization"
          />

          {isLoading ? (
            <div className="h-72 w-full mt-4 flex items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800">
              <Skeleton className="h-60 w-full mx-4" />
            </div>
          ) : !isPlaying && smoothedSnapshot.total_vehicles === 0 ? (
            <div className="h-72 w-full mt-4 flex flex-col items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-center p-6">
              <Bus className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">Traffic camera stream unavailable</p>
              <p className="text-xs text-slate-500 mt-1">
                Awaiting active edge camera detections.
              </p>
            </div>
          ) : (
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liveVehicleMix} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {liveVehicleMix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Detected Traffic Bottlenecks List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <SectionHeader
          title="Top Congested Road Segments"
          count={topCongested.length}
          description="Ranked by derived congestion score and transit blockage"
        />

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3 px-4">Road Segment</th>
                <th className="py-3 px-4">Congestion Score</th>
                <th className="py-3 px-4">Avg Speed</th>
                <th className="py-3 px-4">Vehicles Counted</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <>
                  <TableRowSkeleton columns={5} />
                  <TableRowSkeleton columns={5} />
                  <TableRowSkeleton columns={5} />
                </>
              ) : topCongested.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <EmptyState
                      icon={Inbox}
                      title="No active congestion detected"
                      description="Traffic is moving normally across all monitored corridors."
                      className="border-0 bg-transparent p-4"
                    />
                  </td>
                </tr>
              ) : (
                topCongested.map((seg, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {seg.location_name}
                      <div className="text-[10px] text-slate-500 font-normal">{seg.ward_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold font-mono ${seg.congestion_score > 85 ? 'text-rose-400' : seg.congestion_score > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {seg.congestion_score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{seg.average_speed} km/h</td>
                    <td className="py-3 px-4 font-mono">{seg.vehicle_count}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${seg.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : seg.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {seg.severity}
                      </span>
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
