// URBANEYE Core Event and Domain Types — Central Contract

export type EventType = 'POTHOLE' | 'WATERLOGGING' | 'DAMAGED_SIGN' | 'TRAFFIC';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventStatus = 
  | 'NEW'
  | 'VERIFIED'
  | 'PENDING' 
  | 'CORROBORATED' 
  | 'DISPATCHED' 
  | 'IN_PROGRESS' 
  | 'RESOLVED' 
  | 'DISMISSED';

export type DensityLevel = 'LOW' | 'MODERATE' | 'HEAVY' | 'GRIDLOCK';

export type DepartmentType = 'PWD' | 'TRAFFIC_POLICE' | 'DRAINAGE_BOARD';

export interface EstimatedDimensions {
  length_cm?: number;
  width_cm?: number;
  depth_cm?: number;
  area_sqm?: number;
}

export interface TrafficEventDetails {
  vehicle_count: number;
  cars: number;
  bikes: number;
  buses: number;
  trucks: number;
  average_speed: number; // in km/h
  density: DensityLevel;
  congestion_score: number; // 0.0 to 100.0
  bottleneck_reason?: string;
}

export interface HazardEventDetails {
  hazard_subtype?: string;
  lane_affected?: 'LEFT' | 'CENTER' | 'RIGHT' | 'FULL_ROAD';
  water_depth_level?: 'SHALLOW' | 'MODERATE' | 'DEEP_HAZARD';
  sign_damage_type?: 'OCCLUDED' | 'BENT' | 'GRAFFITI' | 'MISSING';
}

/**
 * Standard UrbanEye Base Event Contract
 * All AI edge models (YOLO, OCR, Traffic counter) normalize into this uniform schema.
 */
export interface UrbanEyeEvent {
  event_id: string;
  event_type: EventType;
  bus_id: string;
  route_id: string;
  confidence: number; // 0.0 to 1.0
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601 UTC
  evidence_image: string;
  evidence_clip?: string;
  status: EventStatus;
  source?: string;
  
  // Platform Enrichment Fields
  location_name?: string;
  jurisdiction?: string;
  ward_id?: string;
  ward_name?: string;
  corroboration_count: number;
  observation_count?: number; // Corroboration readiness alias
  corroborating_buses?: string[];
  observing_bus_ids?: string[]; // Corroboration readiness alias
  corroboration_status?: 'UNVERIFIED' | 'CORROBORATED' | 'DISPUTED';
  priority_score: number; // 0 to 100
  estimated_dimensions?: EstimatedDimensions;
  traffic_details?: TrafficEventDetails;
  hazard_details?: HazardEventDetails;
  
  // Dispatch / Action Metadata
  assigned_department?: DepartmentType;
  ticket_id?: string;
  dispatched_at?: string;
}

export interface BusTelemetry {
  bus_id: string;
  vehicle_id?: string;
  route_id: string;
  route?: string;
  route_number?: string;
  route_name: string;
  route_desc?: string;
  latitude: number;
  longitude: number;
  speed_kmh?: number | null; // Nullable for authentic live feed
  heading_deg: number;
  status: 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'OFFLINE';
  near_depot?: boolean;
  data_age_seconds?: number;
  timestamp?: number;
  source?: 'PMPML_LIVE' | 'DEMO_SIMULATION' | string;
  agency?: string;
  ac?: string;
  direction?: 'UP' | 'DOWN' | 'BIDIRECTIONAL' | string;
  // Demo simulation fields (optional for live feed)
  driver_name?: string;
  camera_status?: 'STREAMING' | 'RECORDING_ONLY' | 'DEGRADED' | 'OFFLINE';
  gps_signal?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  ai_fps?: number;
  detections_today?: number;
  last_ping: string;
}

export interface BusRoute {
  route_id: string;
  route_name: string;
  origin: string;
  destination: string;
  total_buses: number;
  active_buses: number;
  distance_km: number;
  coverage_score: number; // 0 - 100
  coordinates: [number, number][]; // LineString [lng, lat][]
  congestion_score?: number; // 0 - 100
  avg_speed_kmh?: number;
  vehicle_count?: number;
  density?: DensityLevel;
}

export interface WardSummary {
  ward_id: string;
  ward_name: string;
  zone: string;
  active_hazards: number;
  critical_hazards: number;
  corroborated_hazards: number;
  avg_congestion: number;
  health_score: number; // 0 - 100
}

export interface PmpmlStop {
  stop_id: string;
  stop_name: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

export interface PunePriorityRoute {
  route_id: string;
  route_name: string;
  origin: string;
  destination: string;
  city: 'Pune';
  jurisdiction: 'PMC';
  enabled: boolean;
  priority_rank: number;
  coordinates: [number, number][]; // LineString [lng, lat][]
  route_geometry?: [number, number][]; // LineString alias
  direction?: 'UP' | 'DOWN' | 'BIDIRECTIONAL';
  stops?: PmpmlStop[];
  distance_km?: number;
  risk_score: number; // 0 - 100 derived dynamically from events
  event_count: number;
  pothole_count: number;
  waterlogging_count: number;
  damaged_sign_count: number;
  traffic_event_count: number;
  corroborated_event_count: number;
  leading_issue_type?: string;
}

export interface RouteCorridorAnalytics extends PunePriorityRoute {
  leading_issue_type: string;
  active_buses?: number;
  avg_speed_kmh?: number;
  congestion_score?: number;
}

export type JurisdictionCode = 'ALL' | 'PMC_PUNE';

export interface GlobalFilterState {
  searchQuery: string;
  selectedEventTypes: EventType[];
  selectedSeverities: SeverityLevel[];
  selectedStatus: EventStatus | 'ALL';
  selectedWard: string;
  selectedRoute: string;
  selectedJurisdiction: JurisdictionCode;
  onlyPunePriorityRoutes: boolean;
  dateRange: '1H' | '6H' | '24H' | '7D' | '30D' | 'CUSTOM';
  minPriorityScore: number;
  onlyCorroborated: boolean;
}

export interface SystemKPIs {
  active_buses: number;
  total_fleet: number;
  hazards_24h: number;
  corroborated_hazards: number;
  critical_potholes: number;
  active_waterlogging: number;
  damaged_signs: number;
  avg_city_speed_kmh: number;
  avg_congestion_index: number;
  tickets_dispatched_24h: number;
}
