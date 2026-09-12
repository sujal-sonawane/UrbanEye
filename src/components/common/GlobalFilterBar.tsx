import React from 'react';
import { RefreshCw, Layers, ShieldAlert, CheckSquare } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import { EventType, SeverityLevel } from '../../types/events';
import { UrbanEyeSearch } from './UrbanEyeSearch';

export const GlobalFilterBar: React.FC = () => {
  const {
    selectedEventTypes,
    toggleEventType,
    selectedSeverities,
    toggleSeverity,
    selectedJurisdiction,
    setJurisdiction,
    onlyPunePriorityRoutes,
    setOnlyPunePriorityRoutes,
    onlyCorroborated,
    setOnlyCorroborated,
    resetFilters,
  } = useFilterStore();

  const eventTypes: { type: EventType; label: string; activeColor: string }[] = [
    { type: 'POTHOLE', label: 'Potholes', activeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
    { type: 'WATERLOGGING', label: 'Waterlogging', activeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
    { type: 'DAMAGED_SIGN', label: 'Damaged Signs', activeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { type: 'TRAFFIC', label: 'Traffic Density', activeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  ];

  const severities: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const handleJurisdictionSelect = (val: string) => {
    if (val === 'PMC_PUNE') {
      setJurisdiction('PMC_PUNE');
      setOnlyPunePriorityRoutes(true);
    } else {
      setJurisdiction('ALL');
      setOnlyPunePriorityRoutes(false);
    }
  };

  const currentSelectValue = selectedJurisdiction === 'PMC_PUNE'
    ? 'PMC_PUNE'
    : 'ALL';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between text-xs">
      {/* Search Input using UrbanEyeSearch with ⌘K and multi-category dropdown */}
      <UrbanEyeSearch className="flex-1 min-w-[220px]" placeholder="Search by Event ID, Location, Route, or Bus ID..." />

      {/* Event Type Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-slate-400 font-medium mr-1 hidden sm:inline flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-slate-400" /> Layer:
        </span>
        {eventTypes.map(({ type, label, activeColor }) => {
          const isActive = selectedEventTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleEventType(type)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                isActive
                  ? activeColor
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Severity Filter & Ward Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Severity toggles */}
        <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800 rounded-lg p-0.5">
          <span className="text-slate-400 pl-2 pr-1 font-medium hidden md:inline">
            <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
          </span>
          {severities.map((sev) => {
            const isActive = selectedSeverities.includes(sev);
            const colors = {
              CRITICAL: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
              HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
              MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
              LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
            };
            return (
              <button
                key={sev}
                onClick={() => toggleSeverity(sev)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                  isActive ? colors[sev] + ' border' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {sev[0]}
              </button>
            );
          })}
        </div>

        {/* Pune Priority Routes Corridor Quick Toggle */}
        <button
          onClick={() => {
            const nextVal = !onlyPunePriorityRoutes;
            setOnlyPunePriorityRoutes(nextVal);
            if (nextVal) setJurisdiction('PMC_PUNE');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border font-mono font-medium transition-all ${
            onlyPunePriorityRoutes
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
              : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
          }`}
          title="Filter map & data to Pune Priority Routes (PMC only)"
        >
          <span>Pune Routes</span>
        </button>

        {/* Jurisdiction & Ward Selector */}
        <select
          value={currentSelectValue}
          onChange={(e) => handleJurisdictionSelect(e.target.value)}
          aria-label="Filter by Jurisdiction or Ward"
          className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300 focus:outline-none focus:border-blue-500 max-w-[170px] truncate"
        >
          <option value="PMC_PUNE" className="bg-slate-900 text-blue-400">Pune City (PMC)</option>
          <option value="ALL" className="bg-slate-900 text-white">All Jurisdictions</option>
        </select>

        {/* Multi-bus Corroborated Only */}
        <button
          onClick={() => setOnlyCorroborated(!onlyCorroborated)}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border font-medium transition-all ${
            onlyCorroborated
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
              : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
          }`}
          title="Filter only verified incidents reported by multiple buses"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Corroborated</span> (2+)
        </button>

        {/* Reset */}
        <button
          onClick={resetFilters}
          title="Reset Filters"
          aria-label="Reset all filters"
          className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
