import React, { useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Camera, 
  Eye, 
  Car, 
  Bike, 
  Bus, 
  Truck,
  AlertCircle,
  Filter
} from 'lucide-react';
import { useTrafficStreamStore, TICK_INTERVAL_MS } from '../../store/useTrafficStreamStore';

export const LiveCameraTrafficPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { 
    isPlaying, 
    currentFrame, 
    smoothedSnapshot, 
    streamMeta, 
    updateAgeSeconds, 
    toggle, 
    seek, 
    tick 
  } = useTrafficStreamStore();

  // Controlled 240ms continuous sensing ticker with clean unmount
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      tick();
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, tick]);

  // Synchronize HTML video playback with isPlaying state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  const densityColor = 
    smoothedSnapshot.traffic_state === 'HEAVY' 
      ? 'text-rose-400 bg-rose-500/20 border-rose-500/30' 
      : smoothedSnapshot.traffic_state === 'MEDIUM' 
      ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' 
      : 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
      {/* Top Stream Control Bar */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                {streamMeta.stream_id}
              </span>
              <span className="text-[10px] text-slate-400">
                • {streamMeta.model_name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {streamMeta.stream_title} — <span className="text-amber-400/90 font-medium">AI TRAFFIC DEMO STREAM</span>
            </p>
          </div>
        </div>

        {/* Live Status Indicator & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${isPlaying ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
              {isPlaying ? 'TRAFFIC AI LIVE' : 'TRAFFIC AI PAUSED'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              {updateAgeSeconds}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={toggle}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause Stream' : 'Resume Live Stream'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <button
              onClick={() => seek(0)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Reset Video Loop"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video & Live HUD Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 bg-black">
        {/* Left Video Area (7 cols) */}
        <div className="lg:col-span-7 relative flex items-center justify-center bg-slate-950 min-h-[320px] max-h-[440px] overflow-hidden">
          <video
            ref={videoRef}
            src="/traffic_density_output.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain max-h-[440px]"
          />
          
          {/* Overlay Live Badge */}
          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 flex items-center gap-1.5 shadow-lg pointer-events-none">
            <Eye className="w-3 h-3 text-blue-400" />
            <span>YOLOv8 Edge Vision Output</span>
          </div>

          <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 pointer-events-none">
            Frame: {currentFrame.frame_index} / 551 ({currentFrame.timestamp_sec}s)
          </div>
        </div>

        {/* Right Live Telemetry Dashboard (5 cols) */}
        <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Edge Camera Telemetry
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Filter className="w-2.5 h-2.5" />
                  2.4s Window
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${densityColor}`}>
                {smoothedSnapshot.traffic_state} CONGESTION
              </span>
            </div>

            {/* Total Vehicles Callout */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">
                  Smoothed Vehicles In View
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold font-mono text-white">
                    {smoothedSnapshot.total_vehicles}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    aggregated (2.4s)
                  </span>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 block">Camera Density</span>
                <span className="text-lg font-bold text-amber-400">
                  {smoothedSnapshot.density_score}%
                </span>
              </div>
            </div>

            {/* Vehicle Categorization Breakdown */}
            <div className="mt-4 space-y-2">
              <span className="text-[11px] font-medium text-slate-400 block">
                Smoothed Classification (Recent 2.4s Window)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cars</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-white">{smoothedSnapshot.cars}</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Bike className="w-3.5 h-3.5 text-amber-400" />
                    <span>Motorcycles</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-white">{smoothedSnapshot.bikes}</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Bus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Buses</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-white">{smoothedSnapshot.buses}</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Truck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Trucks</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-white">{smoothedSnapshot.trucks}</span>
                </div>
              </div>
            </div>

            {/* Density Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                <span>Field-of-View Capacity (20 Max)</span>
                <span>{smoothedSnapshot.total_vehicles} / 20</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-500 ${
                    smoothedSnapshot.traffic_state === 'HEAVY' 
                      ? 'bg-rose-500' 
                      : smoothedSnapshot.traffic_state === 'MEDIUM' 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (smoothedSnapshot.total_vehicles / 20) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Location & Speed Truthfulness Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300">Location:</strong> Camera Traffic Analysis — Location Unspecified (Demo Video Feed).
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pl-5">
              Tracking: Per-Frame Detection • Speed: Unavailable (No Radar/Homography)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
