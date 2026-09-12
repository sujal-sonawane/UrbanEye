import { UrbanEyeEvent, BusTelemetry, BusRoute, WardSummary, SystemKPIs } from '../types/events';
import { PUNE_POTHOLE_DEMO_EVENTS } from './punePotholeData';
import { PUNE_WATERLOGGING_DEMO_EVENTS } from './puneWaterloggingData';
import { PUNE_DAMAGED_SIGN_DEMO_EVENTS } from './puneDamagedSignData';
import { getCalculatedPuneWards } from '../store/analyticsSelectors';

export const MOCK_EVENTS: UrbanEyeEvent[] = [
  ...PUNE_POTHOLE_DEMO_EVENTS,
  ...PUNE_WATERLOGGING_DEMO_EVENTS,
  ...PUNE_DAMAGED_SIGN_DEMO_EVENTS,
];

export const MOCK_SYSTEM_KPIS: SystemKPIs = {
  active_buses: 0,
  total_fleet: 0,
  hazards_24h:
    PUNE_POTHOLE_DEMO_EVENTS.length +
    PUNE_WATERLOGGING_DEMO_EVENTS.length +
    PUNE_DAMAGED_SIGN_DEMO_EVENTS.length,
  corroborated_hazards:
    PUNE_POTHOLE_DEMO_EVENTS.filter((e) => e.corroboration_count > 1).length +
    PUNE_WATERLOGGING_DEMO_EVENTS.filter((e) => e.corroboration_count > 1).length +
    PUNE_DAMAGED_SIGN_DEMO_EVENTS.filter((e) => e.corroboration_count > 1).length,
  critical_potholes: PUNE_POTHOLE_DEMO_EVENTS.filter((e) => e.severity === 'CRITICAL').length,
  active_waterlogging: PUNE_WATERLOGGING_DEMO_EVENTS.length,
  damaged_signs: PUNE_DAMAGED_SIGN_DEMO_EVENTS.length,
  avg_city_speed_kmh: 0,
  avg_congestion_index: 0,
  tickets_dispatched_24h:
    PUNE_POTHOLE_DEMO_EVENTS.filter((e) => e.status === 'DISPATCHED').length +
    PUNE_WATERLOGGING_DEMO_EVENTS.filter((e) => e.status === 'DISPATCHED').length +
    PUNE_DAMAGED_SIGN_DEMO_EVENTS.filter((e) => e.status === 'DISPATCHED').length,
};

export const MOCK_WARDS: WardSummary[] = getCalculatedPuneWards(MOCK_EVENTS);

export const MOCK_BUS_ROUTES: BusRoute[] = [];

export const MOCK_BUS_FLEET: BusTelemetry[] = [];

export const MOCK_TRAFFIC_HOURLY = [];

export const MOCK_VEHICLE_MIX = [];

export const MOCK_HAZARD_DISTRIBUTION = [];
