import { create } from 'zustand';
import { GlobalFilterState, EventType, SeverityLevel, EventStatus } from '../types/events';

interface FilterStore extends GlobalFilterState {
  setSearchQuery: (query: string) => void;
  toggleEventType: (type: EventType) => void;
  setEventTypes: (types: EventType[]) => void;
  toggleSeverity: (severity: SeverityLevel) => void;
  setStatus: (status: EventStatus | 'ALL') => void;
  setWard: (ward: string) => void;
  setRoute: (route: string) => void;
  setJurisdiction: (jurisdiction: GlobalFilterState['selectedJurisdiction']) => void;
  setOnlyPunePriorityRoutes: (only: boolean) => void;
  setDateRange: (range: GlobalFilterState['dateRange']) => void;
  setMinPriorityScore: (minPriorityScore: number) => void;
  setOnlyCorroborated: (only: boolean) => void;
  focusLocation: [number, number] | null;
  setFocusLocation: (loc: [number, number] | null) => void;
  resetFilters: () => void;
}

const initialFilters: GlobalFilterState = {
  searchQuery: '',
  selectedEventTypes: ['POTHOLE', 'WATERLOGGING', 'DAMAGED_SIGN', 'TRAFFIC'],
  selectedSeverities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  selectedStatus: 'ALL',
  selectedWard: 'ALL',
  selectedRoute: 'ALL',
  selectedJurisdiction: 'ALL',
  onlyPunePriorityRoutes: false,
  dateRange: '24H',
  minPriorityScore: 0,
  onlyCorroborated: false,
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialFilters,

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  toggleEventType: (type) =>
    set((state) => {
      const exists = state.selectedEventTypes.includes(type);
      const updated = exists
        ? state.selectedEventTypes.filter((t) => t !== type)
        : [...state.selectedEventTypes, type];
      return { selectedEventTypes: updated.length === 0 ? [type] : updated };
    }),

  setEventTypes: (selectedEventTypes) => set({ selectedEventTypes }),

  toggleSeverity: (severity) =>
    set((state) => {
      const exists = state.selectedSeverities.includes(severity);
      const updated = exists
        ? state.selectedSeverities.filter((s) => s !== severity)
        : [...state.selectedSeverities, severity];
      return { selectedSeverities: updated.length === 0 ? [severity] : updated };
    }),

  setStatus: (selectedStatus) => set({ selectedStatus }),

  setWard: (selectedWard) => set({ selectedWard }),

  setRoute: (selectedRoute) => set({ selectedRoute }),

  setJurisdiction: (selectedJurisdiction) => set({ selectedJurisdiction }),

  setOnlyPunePriorityRoutes: (onlyPunePriorityRoutes) => set({ onlyPunePriorityRoutes }),

  setDateRange: (dateRange) => set({ dateRange }),

  setMinPriorityScore: (minPriorityScore) => set({ minPriorityScore }),

  setOnlyCorroborated: (onlyCorroborated) => set({ onlyCorroborated }),

  focusLocation: null,
  setFocusLocation: (focusLocation) => set({ focusLocation }),

  resetFilters: () => set({ ...initialFilters, focusLocation: null }),
}));
