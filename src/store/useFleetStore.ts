import { create } from 'zustand';
import { BusTelemetry, BusRoute, WardSummary } from '../types/events';
import { UrbanEyeApiService } from '../services/api';
import { SEEDED_PUNE_PRIORITY_ROUTES } from '../services/puneRoutes';
import { simulationEngine } from '../services/simulationEngine';

export type FleetMode = 'LIVE' | 'DEMO';
export type FeedStatus = 'LIVE' | 'STALE' | 'UNAVAILABLE';

interface FleetState {
  fleet: BusTelemetry[];
  routes: BusRoute[];
  wards: WardSummary[];
  selectedBus: BusTelemetry | null;
  isLoading: boolean;
  
  fleetMode: FleetMode;
  feedStatus: FeedStatus;
  lastUpdateTimestamp: number | null;
  rawBusCount: number;
  validBusCount: number;
  
  fetchFleetData: () => Promise<void>;
  setSelectedBus: (bus: BusTelemetry | null) => void;
  updateFleet: (newFleet: BusTelemetry[]) => void;
  setFleetMode: (mode: FleetMode) => void;
  setFeedStatus: (status: FeedStatus, timestamp?: number | null, counts?: { raw?: number; valid?: number }) => void;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  fleet: [],
  routes: SEEDED_PUNE_PRIORITY_ROUTES as unknown as BusRoute[],
  wards: [],
  selectedBus: null,
  isLoading: false,
  
  fleetMode: 'LIVE',
  feedStatus: 'UNAVAILABLE',
  lastUpdateTimestamp: null,
  rawBusCount: 0,
  validBusCount: 0,

  fetchFleetData: async () => {
    set({ isLoading: true });
    try {
      const [snapshot, routes, wards] = await Promise.all([
        UrbanEyeApiService.getLiveFeedSnapshot(),
        UrbanEyeApiService.getRoutes(),
        UrbanEyeApiService.getWards(),
      ]);

      if (snapshot && snapshot.vehicles && snapshot.vehicles.length > 0) {
        set({
          fleet: snapshot.vehicles,
          routes: routes && routes.length > 0 ? routes : (SEEDED_PUNE_PRIORITY_ROUTES as unknown as BusRoute[]),
          wards,
          feedStatus: snapshot.status,
          lastUpdateTimestamp: snapshot.last_update || Date.now(),
          rawBusCount: snapshot.raw_bus_count || snapshot.vehicles.length,
          validBusCount: snapshot.valid_bus_count || snapshot.vehicles.length,
          isLoading: false,
        });
      } else if (snapshot) {
        set((state) => ({ 
          fleet: snapshot.vehicles ?? state.fleet,
          routes: routes && routes.length > 0 ? routes : (SEEDED_PUNE_PRIORITY_ROUTES as unknown as BusRoute[]), 
          wards, 
          feedStatus: snapshot.status || 'UNAVAILABLE',
          lastUpdateTimestamp: snapshot.last_update || state.lastUpdateTimestamp,
          rawBusCount: snapshot.raw_bus_count || state.rawBusCount,
          validBusCount: snapshot.valid_bus_count || state.validBusCount,
          isLoading: false 
        }));
      } else {
        set({ 
          routes: routes && routes.length > 0 ? routes : (SEEDED_PUNE_PRIORITY_ROUTES as unknown as BusRoute[]), 
          wards, 
          feedStatus: 'UNAVAILABLE',
          isLoading: false 
        });
      }
    } catch {
      set({ feedStatus: 'UNAVAILABLE', isLoading: false });
    }
  },

  setSelectedBus: (bus) => set({ selectedBus: bus }),

  updateFleet: (newFleet) => {
    if (!newFleet) return;
    set((state) => {
      if (state.fleetMode === 'LIVE') {
        // Authoritative complete snapshot from PMPML poller.
        // Guard against transient zero-length bursts wiping existing valid fleet
        if (newFleet.length === 0 && state.fleet.length > 0) {
          return state;
        }
        return { fleet: newFleet };
      }
      // In DEMO mode, merge updates
      const fleetMap = new Map(state.fleet.map(b => [b.bus_id, b]));
      newFleet.forEach(b => fleetMap.set(b.bus_id, b));
      return { fleet: Array.from(fleetMap.values()) };
    });
  },
  
  setFleetMode: (mode) => {
    const currentMode = get().fleetMode;
    if (mode === 'DEMO') {
      const demoFleet = simulationEngine.getFleetState();
      set({ 
        fleetMode: 'DEMO', 
        fleet: demoFleet, 
        feedStatus: 'LIVE',
        lastUpdateTimestamp: Date.now() 
      });
    } else {
      if (currentMode !== 'LIVE') {
        // Clear simulated demo fleet when switching to live mode
        set({ fleetMode: 'LIVE', fleet: [], isLoading: true });
      }
      get().fetchFleetData();
    }
  },
  
  setFeedStatus: (status, timestamp, counts) => set((state) => ({ 
    feedStatus: status, 
    lastUpdateTimestamp: timestamp !== undefined && timestamp !== null ? timestamp : state.lastUpdateTimestamp,
    rawBusCount: counts?.raw !== undefined ? counts.raw : state.rawBusCount,
    validBusCount: counts?.valid !== undefined ? counts.valid : state.validBusCount,
  })),
}));
