import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { AlertCard } from '../components/common/AlertCard';
import { GlobalFilterBar } from '../components/common/GlobalFilterBar';
import { CardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useEventStore } from '../store/useEventStore';
import { useCorroboratedEvents } from '../store/corroborationSelectors';
import { usePrioritizedEvents } from '../store/priorityEngine';
import { useFilterStore } from '../store/useFilterStore';
import { Inbox } from 'lucide-react';

export const AlertCenter: React.FC = () => {
  const { events: rawEvents, setSelectedEvent, isLoading } = useEventStore();
  const corroboratedEvents = useCorroboratedEvents(rawEvents);
  const events = usePrioritizedEvents(corroboratedEvents);
  const { searchQuery, selectedEventTypes, selectedSeverities, selectedWard } = useFilterStore();
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'CORROBORATED' | 'DISPATCHED' | 'RESOLVED'>('ALL');

  const filteredEvents = events.filter((e) => {
    if (statusTab !== 'ALL' && e.status !== statusTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = e.event_id.toLowerCase().includes(q);
      const matchLoc = e.location_name?.toLowerCase().includes(q);
      if (!matchId && !matchLoc) return false;
    }
    if (!selectedEventTypes.includes(e.event_type)) return false;
    if (!selectedSeverities.includes(e.severity)) return false;
    if (selectedWard !== 'ALL' && e.ward_id !== selectedWard) return false;
    return true;
  });

  // Sort by priority score descending
  const sortedEvents = [...filteredEvents].sort((a, b) => b.priority_score - a.priority_score);

  const pendingCount = events.filter((e) => e.status === 'PENDING' || e.status === 'CORROBORATED').length;
  const dispatchedCount = events.filter((e) => e.status === 'DISPATCHED' || e.status === 'IN_PROGRESS').length;
  const resolvedCount = events.filter((e) => e.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Alert Center & Municipal Dispatch"
        subtitle="Priority Triage Queue, Municipal Ticket Generation & Workflow Escalation"
        badge="ACTION DISPATCH READY"
        badgeColor="rose"
      />

      <GlobalFilterBar />

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setStatusTab('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          All Incidents ({events.length})
        </button>

        <button
          onClick={() => setStatusTab('CORROBORATED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            statusTab === 'CORROBORATED'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Pending Triage ({pendingCount})
        </button>

        <button
          onClick={() => setStatusTab('DISPATCHED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            statusTab === 'DISPATCHED'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          Dispatched ({dispatchedCount})
        </button>

        <button
          onClick={() => setStatusTab('RESOLVED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            statusTab === 'RESOLVED'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Alert Priority Queue List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No alerts found"
            description="Try relaxing filter constraints or selecting another status tab."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sortedEvents.map((evt) => (
              <AlertCard
                key={evt.event_id}
                event={evt}
                onClick={() => setSelectedEvent(evt)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
