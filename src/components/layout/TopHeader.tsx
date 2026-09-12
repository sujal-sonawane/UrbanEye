import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Clock, 
  ShieldAlert, 
  Layers,
  Pause,
  Activity,
  Server
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useEventStore } from '../../store/useEventStore';
import { useFilterStore } from '../../store/useFilterStore';
import { useFleetStore } from '../../store/useFleetStore';
import { webSocketService } from '../../services/websocket';

export const TopHeader: React.FC = () => {
  const { startSimulation, pauseSimulation, resetSimulation, status, currentTick, maxTicks, simulationSpeed, setSpeed, injectPriorityDemo, injectCorroborationDemo } = useSimulationStore();
  const { events } = useEventStore();
  const { fleetMode, feedStatus, lastUpdateTimestamp, setFleetMode } = useFleetStore();
  const { selectedJurisdiction, setJurisdiction, setOnlyPunePriorityRoutes } = useFilterStore();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST'
      );
      if (lastUpdateTimestamp) {
        setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastUpdateTimestamp) / 1000)));
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [lastUpdateTimestamp]);

  const criticalCount = events.filter((e) => e.severity === 'CRITICAL' && e.status !== 'RESOLVED').length;

  const handleJurisdictionChange = (value: string) => {
    if (value === 'PMC_PUNE') {
      setJurisdiction('PMC_PUNE');
      setOnlyPunePriorityRoutes(true);
    } else {
      setJurisdiction('ALL');
      setOnlyPunePriorityRoutes(false);
    }
  };

  const handleModeChange = (mode: 'LIVE' | 'DEMO') => {
    if (mode === 'DEMO') {
      webSocketService.setDemoMode(true);
    } else {
      resetSimulation();
      webSocketService.setDemoMode(false);
    }
    setFleetMode(mode);
  };

  const currentSelectValue = selectedJurisdiction === 'PMC_PUNE' 
    ? 'PMC_PUNE' 
    : 'ALL';

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl px-6 flex items-center justify-between z-20">
      {/* Left: City / Operational Territory */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Jurisdiction:</span>
          <select
            value={currentSelectValue}
            onChange={(e) => handleJurisdictionChange(e.target.value)}
            aria-label="Select Operational Zone or Ward"
            className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="PMC_PUNE" className="bg-slate-900 text-blue-400 font-semibold">
              Pune Municipal Corporation — Pune City
            </option>
            <option value="ALL" className="bg-slate-900 text-white">
              All Operational Territories (PMC Only)
            </option>
          </select>
        </div>

        {/* Mode Toggle: [ PMPML LIVE ] [ DEMO SIMULATION ] */}
        <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => handleModeChange('LIVE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              fleetMode === 'LIVE' 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> PMPML LIVE
          </button>
          <button
            onClick={() => handleModeChange('DEMO')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              fleetMode === 'DEMO' 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> DEMO SIMULATION
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
          <span className="relative flex h-2 w-2">
            {fleetMode === 'LIVE' && feedStatus === 'LIVE' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              fleetMode === 'DEMO' ? 'bg-amber-500' : 
              feedStatus === 'LIVE' ? 'bg-emerald-500' : 
              feedStatus === 'STALE' ? 'bg-orange-500' : 
              'bg-rose-500'
            }`} />
          </span>
          <span className="font-mono text-[11px] text-slate-300">
            {fleetMode === 'DEMO' ? 'DEMO SIMULATION' : 
             feedStatus === 'LIVE' ? `PMPML LIVE • Updated ${secondsAgo}s ago` : 
             feedStatus === 'STALE' ? 'PMPML FEED STALE' :
             'PMPML LIVE FEED UNAVAILABLE'}
          </span>
          {fleetMode === 'LIVE' && feedStatus === 'UNAVAILABLE' && (
            <button
              onClick={() => handleModeChange('DEMO')}
              className="ml-1 text-[10px] font-semibold text-amber-400 hover:text-amber-300 underline"
            >
              Switch to DEMO
            </button>
          )}
        </div>
      </div>

      {/* Right: Simulation Controls & Telemetry */}
      <div className="flex items-center gap-3">
        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{currentTime || '14:32:00 IST'}</span>
        </div>

        {/* Demo Simulation Bar (Only visible in DEMO mode) */}
        {fleetMode === 'DEMO' && (
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl animate-in fade-in slide-in-from-right-4 duration-300">
            {status === 'STOPPED' || status === 'PAUSED' ? (
              <button
                onClick={startSimulation}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${status === 'PAUSED' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
              >
                <Play className="w-3 h-3 fill-current" /> {status === 'PAUSED' ? 'Resume' : 'Start Sim'}
              </button>
            ) : (
              <button
                onClick={pauseSimulation}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              >
                <Pause className="w-3 h-3 fill-current" /> Pause
              </button>
            )}

            {status !== 'STOPPED' && (
              <>
                <button
                  onClick={resetSimulation}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Stop & Reset"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
                <div className="px-2 text-xs font-mono text-slate-400">
                  {String(currentTick).padStart(3, '0')}s / {maxTicks}s
                </div>
              </>
            )}

            {status !== 'STOPPED' && (
              <div className="flex items-center gap-0.5 px-1 border-l border-slate-700 ml-1 pl-2">
                {(['1X', '2X', '5X'] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                      simulationSpeed === spd
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            )}
            
            <div className="w-px h-4 bg-slate-800 mx-1"></div>
            
            <button
              onClick={injectCorroborationDemo}
              title="Inject Corroboration Scenario"
              className="px-2 py-1 rounded-lg text-[10px] font-mono font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              + CLUSTER TEST
            </button>
            
            <button
              onClick={injectPriorityDemo}
              title="Inject Priority Engine Scenario"
              className="px-2 py-1 rounded-lg text-[10px] font-mono font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              + PRIORITY TEST
            </button>
          </div>
        )}

        {/* Alert Ticker Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-semibold">
          <ShieldAlert className="w-4 h-4" />
          <span>{criticalCount} Critical</span>
        </div>
      </div>
    </header>
  );
};
