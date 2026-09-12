import { create } from 'zustand';
import { UrbanEyeEvent, EventStatus, DepartmentType, SystemKPIs, EventType, SeverityLevel } from '../types/events';
import { EventService } from '../services/eventService';
import { UrbanEyeApiService } from '../services/api';
import { webSocketService, ConnectionStatus } from '../services/websocket';
import { MOCK_SYSTEM_KPIS } from '../services/mockData';

interface EventState {
  events: UrbanEyeEvent[];
  eventsById: Record<string, UrbanEyeEvent>;
  selectedEvent: UrbanEyeEvent | null;
  kpis: SystemKPIs;
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;

  // Actions
  fetchEvents: () => Promise<void>;
  addEvent: (event: UrbanEyeEvent) => void;
  addEvents: (events: UrbanEyeEvent[]) => void;
  updateEvent: (eventId: string, updates: Partial<UrbanEyeEvent>) => void;
  updateEventStatus: (
    eventId: string,
    status: EventStatus,
    ticketId?: string,
    department?: DepartmentType
  ) => Promise<void>;
  removeEvent: (eventId: string) => void;
  clearEvents: () => void;
  setSelectedEvent: (event: UrbanEyeEvent | null) => void;
  getEventById: (eventId: string) => UrbanEyeEvent | undefined;
  addLiveEvent: (event: UrbanEyeEvent) => void;
  initLiveStream: () => () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  eventsById: {},
  selectedEvent: null,
  kpis: MOCK_SYSTEM_KPIS,
  isLoading: false,
  error: null,
  connectionStatus: 'OFFLINE',

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const [events, kpis] = await Promise.all([
        EventService.loadEvents(),
        UrbanEyeApiService.getKPIs(),
      ]);

      const eventsById: Record<string, UrbanEyeEvent> = {};
      events.forEach((evt) => {
        eventsById[evt.event_id] = evt;
      });

      set({ events, eventsById, kpis, isLoading: false });
    } catch {
      set({ error: 'Live API telemetry stream unavailable. Operating on localized demo dataset.', isLoading: false });
    }
  },

  addEvent: (newEvent) => {
    const validated = EventService.ingestEvent(newEvent);
    if (!validated) return;

    set((state) => {
      const existing = state.eventsById[validated.event_id];
      let updatedEvents: UrbanEyeEvent[];

      if (existing) {
        updatedEvents = state.events.map((e) => (e.event_id === validated.event_id ? validated : e));
      } else {
        updatedEvents = [validated, ...state.events];
      }

      return {
        events: updatedEvents,
        eventsById: {
          ...state.eventsById,
          [validated.event_id]: validated,
        },
        kpis: {
          ...state.kpis,
          hazards_24h: state.kpis.hazards_24h + 1,
          critical_potholes: validated.event_type === 'POTHOLE' && validated.severity === 'CRITICAL' ? state.kpis.critical_potholes + 1 : state.kpis.critical_potholes,
          active_waterlogging: validated.event_type === 'WATERLOGGING' ? state.kpis.active_waterlogging + 1 : state.kpis.active_waterlogging,
          damaged_signs: validated.event_type === 'DAMAGED_SIGN' ? state.kpis.damaged_signs + 1 : state.kpis.damaged_signs,
        },
      };
    });
  },

  addEvents: (newEvents) => {
    const validatedList: UrbanEyeEvent[] = [];
    for (const raw of newEvents) {
      const validated = EventService.ingestEvent(raw);
      if (validated) validatedList.push(validated);
    }

    if (validatedList.length === 0) return;

    set((state) => {
      const updatedMap = { ...state.eventsById };
      const updatedList = [...state.events];

      validatedList.forEach((evt) => {
        if (!updatedMap[evt.event_id]) {
          updatedList.unshift(evt);
        } else {
          const idx = updatedList.findIndex((e) => e.event_id === evt.event_id);
          if (idx >= 0) updatedList[idx] = evt;
        }
        updatedMap[evt.event_id] = evt;
      });

      return {
        events: updatedList,
        eventsById: updatedMap,
      };
    });
  },

  updateEvent: (eventId, updates) => {
    set((state) => {
      const current = state.eventsById[eventId];
      if (!current) return state;

      const updated = { ...current, ...updates };
      return {
        events: state.events.map((e) => (e.event_id === eventId ? updated : e)),
        eventsById: {
          ...state.eventsById,
          [eventId]: updated,
        },
        selectedEvent: state.selectedEvent?.event_id === eventId ? updated : state.selectedEvent,
      };
    });
  },

  updateEventStatus: async (eventId, status, ticketId, department) => {
    await EventService.updateStatus(eventId, status, ticketId, department);
    get().updateEvent(eventId, {
      status,
      ticket_id: ticketId,
      assigned_department: department,
      dispatched_at: status === 'DISPATCHED' ? new Date().toISOString() : undefined,
    });
  },

  removeEvent: (eventId) => {
    set((state) => {
      const updatedMap = { ...state.eventsById };
      delete updatedMap[eventId];
      return {
        events: state.events.filter((e) => e.event_id !== eventId),
        eventsById: updatedMap,
        selectedEvent: state.selectedEvent?.event_id === eventId ? null : state.selectedEvent,
      };
    });
  },

  clearEvents: () => {
    set({
      events: [],
      eventsById: {},
      selectedEvent: null,
    });
  },

  setSelectedEvent: (event) => set({ selectedEvent: event }),

  getEventById: (eventId) => get().eventsById[eventId],

  addLiveEvent: (newEvent) => get().addEvent(newEvent),

  initLiveStream: () => {
    // Automatically load initial events if store is empty
    if (get().events.length === 0) {
      get().fetchEvents();
    }

    webSocketService.connect();

    const unsubEvents = webSocketService.onEvent((evt) => {
      get().addLiveEvent(evt);
    });

    const unsubStatus = webSocketService.onStatus((status) => {
      set({ connectionStatus: status });
    });

    return () => {
      unsubEvents();
      unsubStatus();
      webSocketService.disconnect();
    };
  },
}));

// Initialize store with initial validated events immediately on startup
EventService.loadEvents().then((initialEvents) => {
  const eventsById: Record<string, UrbanEyeEvent> = {};
  let criticalPotholes = 0;
  let activeWaterlogging = 0;
  let damagedSigns = 0;
  let corroborated = 0;

  initialEvents.forEach((e) => {
    eventsById[e.event_id] = e;
    if (e.event_type === 'POTHOLE' && e.severity === 'CRITICAL') criticalPotholes++;
    if (e.event_type === 'WATERLOGGING') activeWaterlogging++;
    if (e.event_type === 'DAMAGED_SIGN') damagedSigns++;
    if (e.corroboration_count > 1) corroborated++;
  });

  useEventStore.setState((state) => ({
    events: initialEvents,
    eventsById,
    kpis: {
      ...state.kpis,
      hazards_24h: initialEvents.length,
      corroborated_hazards: corroborated,
      critical_potholes: criticalPotholes,
      active_waterlogging: activeWaterlogging,
      damaged_signs: damagedSigns,
    },
  }));
});

// Reusable Selectors and Query Helpers
export const selectTotalEvents = (events: UrbanEyeEvent[]) => events.length;

export const selectEventsByType = (events: UrbanEyeEvent[], type: EventType) =>
  events.filter((e) => e.event_type === type);

export const selectCriticalEvents = (events: UrbanEyeEvent[]) =>
  events.filter((e) => e.severity === 'CRITICAL' && e.status !== 'RESOLVED');

export const selectRecentEvents = (events: UrbanEyeEvent[], limit: number = 5) =>
  [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

export const selectEventsBySeverity = (events: UrbanEyeEvent[], severity: SeverityLevel) =>
  events.filter((e) => e.severity === severity);

export const selectEventsByBus = (events: UrbanEyeEvent[], busId: string) =>
  events.filter((e) => e.bus_id === busId);

export const selectEventsByWard = (events: UrbanEyeEvent[], wardId: string) =>
  events.filter((e) => e.ward_id === wardId);

export const selectCorroboratedEvents = (events: UrbanEyeEvent[]) =>
  events.filter((e) => e.corroboration_count > 1);
