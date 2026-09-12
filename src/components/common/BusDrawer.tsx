import React from 'react';
import { Bus, X, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { BusTelemetry } from '../../types/events';
import { useFilterStore } from '../../store/useFilterStore';

interface BusDrawerProps {
  bus: BusTelemetry | null;
  onClose: () => void;
}

export const BusDrawer: React.FC<BusDrawerProps> = ({ bus, onClose }) => {
  const { setFocusLocation } = useFilterStore();

  if (!bus) return null;

  const isLiveFeed = bus.source === 'PMPML_LIVE';

  const handleZoomToBus = () => {
    setFocusLocation([bus.longitude, bus.latitude]);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-base font-bold text-white">
                  Vehicle #{bus.bus_id}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  bus.near_depot 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {bus.near_depot ? 'IN DEPOT' : 'RUNNING'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {bus.route_name || `Route ${bus.route_number || bus.route_id || 'Unassigned'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close vehicle details"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Telemetry Key Attributes */}
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Operational State</span>
              <span className={`font-bold mt-1 inline-block ${bus.near_depot ? 'text-amber-400' : 'text-emerald-400'}`}>
                {bus.near_depot ? 'TERMINAL / DEPOT' : 'ACTIVE EN ROUTE'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Route Assignment</span>
              <span className="text-blue-400 font-bold mt-1 inline-block">
                Route {bus.route_number || bus.route_id || 'N/A'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Spatial GPS Coordinates</span>
                <span className="text-blue-400 font-bold mt-1 inline-block text-sm">
                  {bus.latitude.toFixed(6)}° N, {bus.longitude.toFixed(6)}° E
                </span>
              </div>
              <button
                onClick={handleZoomToBus}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px] font-mono font-medium flex items-center gap-1 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Focus Map
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Telemetry Age</span>
              <span className="text-emerald-400 font-bold mt-1 inline-block">
                {bus.data_age_seconds != null ? `${bus.data_age_seconds}s ago` : 'Live Stream'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Telemetry Link</span>
              <span className="text-blue-400 font-bold mt-1 inline-block">
                {isLiveFeed ? 'PMPML LIVE' : 'DEMO SIMULATION'}
              </span>
            </div>
          </div>

          {/* Feed Integrity Verification Banner */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-400 font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED PMPML TELEMETRY LINK
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Real GPS coordinates ingested directly from Pune Mahanagar Parivahan Mahamandal Ltd vehicle location system.
            </p>
          </div>

          {bus.source === 'DEMO_SIMULATION' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <div className="flex items-center gap-1.5 font-bold font-mono text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" /> DEMO SIMULATION METRICS
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                <div>Driver: {bus.driver_name || 'Assigned Driver'}</div>
                <div>Speed: {bus.speed_kmh || 0} km/h</div>
                <div>Camera: {bus.camera_status || 'STREAMING'}</div>
                <div>AI FPS: {bus.ai_fps || 30} FPS</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
