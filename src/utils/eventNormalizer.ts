import { UrbanEyeEvent, EventType, SeverityLevel, EventStatus, DepartmentType } from '../types/events';

const VALID_EVENT_TYPES: Set<string> = new Set(['POTHOLE', 'WATERLOGGING', 'DAMAGED_SIGN', 'TRAFFIC']);
const VALID_SEVERITIES: Set<string> = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const VALID_STATUSES: Set<string> = new Set([
  'NEW',
  'VERIFIED',
  'PENDING',
  'CORROBORATED',
  'DISPATCHED',
  'IN_PROGRESS',
  'RESOLVED',
  'DISMISSED',
]);

/**
 * Normalizes and validates raw heterogeneous AI edge detections into the strict UrbanEyeEvent contract.
 * Protects the UI from malformed coordinates, missing fields, or conflicting property names.
 */
export function normalizeRawEvent(raw: any): UrbanEyeEvent | null {
  if (!raw || typeof raw !== 'object') {
    console.warn('[UrbanEye Normalizer] Ignored non-object event payload:', raw);
    return null;
  }

  try {
    // 1. Event ID normalization
    const event_id = String(raw.event_id || raw.id || raw.detection_id || `EVT-${Date.now()}`);

    // 2. Event Type normalization
    let rawType = String(raw.event_type || raw.type || raw.class_name || '').toUpperCase().trim();
    if (rawType === 'SIGN' || rawType === 'SIGNBOARD' || rawType === 'DAMAGED_SIGNAGE') {
      rawType = 'DAMAGED_SIGN';
    } else if (rawType === 'CONGESTION' || rawType === 'VEHICLE_FLOW') {
      rawType = 'TRAFFIC';
    } else if (rawType === 'FLOOD' || rawType === 'WATER' || rawType === 'WATER_LOGGING') {
      rawType = 'WATERLOGGING';
    }

    if (!VALID_EVENT_TYPES.has(rawType)) {
      console.warn(`[UrbanEye Normalizer] Unknown event_type: "${raw.event_type}" for event ${event_id}`);
      return null;
    }
    const event_type = rawType as EventType;

    // 3. Bus ID & Route ID normalization
    const bus_id = String(raw.bus_id || raw.cam_id || raw.vehicle_id || 'MH-12-PMP-1001').trim();
    const route_id = String(raw.route_id || raw.line_id || '201').trim();

    // 4. Coordinates validation & clamping
    const latitude = Number(raw.latitude ?? raw.lat);
    const longitude = Number(raw.longitude ?? raw.lng ?? raw.lon);

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.warn(`[UrbanEye Normalizer] Invalid coordinates: [${latitude}, ${longitude}] for event ${event_id}`);
      return null;
    }

    // 5. Confidence clamping [0.0, 1.0]
    let confidence = Number(raw.confidence ?? raw.conf ?? raw.score ?? 0.85);
    if (isNaN(confidence)) confidence = 0.85;
    if (confidence > 1.0 && confidence <= 100.0) confidence = confidence / 100.0;
    confidence = Math.max(0.0, Math.min(1.0, confidence));

    // 6. Severity normalization
    let rawSeverity = String(raw.severity || 'MEDIUM').toUpperCase().trim();
    if (!VALID_SEVERITIES.has(rawSeverity)) {
      rawSeverity = confidence > 0.9 ? 'HIGH' : confidence > 0.75 ? 'MEDIUM' : 'LOW';
    }
    const severity = rawSeverity as SeverityLevel;

    // 7. Timestamp normalization (ISO 8601 UTC)
    let timestamp: string;
    if (typeof raw.timestamp === 'number') {
      timestamp = new Date(raw.timestamp > 1e11 ? raw.timestamp : raw.timestamp * 1000).toISOString();
    } else if (raw.timestamp && !isNaN(Date.parse(raw.timestamp))) {
      timestamp = new Date(raw.timestamp).toISOString();
    } else {
      timestamp = new Date().toISOString();
    }

    // 8. Evidence Media normalization
    const defaultEvidence = event_type === 'WATERLOGGING'
      ? '/evidence/waterlogging.jpg'
      : event_type === 'DAMAGED_SIGN'
      ? '/evidence/damaged_sign.jpg'
      : event_type === 'TRAFFIC'
      ? '/evidence/traffic.jpg'
      : '/evidence/pothole.jpg';

    const evidence_image = String(
      raw.evidence_image ||
        raw.image_url ||
        raw.snapshot ||
        defaultEvidence
    );
    const evidence_clip = raw.evidence_clip ? String(raw.evidence_clip) : undefined;

    // 9. Status normalization
    let rawStatus = String(raw.status || 'NEW').toUpperCase().trim();
    if (!VALID_STATUSES.has(rawStatus)) {
      rawStatus = 'NEW';
    }
    const status = rawStatus as EventStatus;

    // 10. Corroboration & Observation counts
    const corroboration_count = Math.max(1, Number(raw.corroboration_count ?? raw.observation_count ?? 1));
    const corroborating_buses: string[] = Array.isArray(raw.corroborating_buses || raw.observing_bus_ids)
      ? (raw.corroborating_buses || raw.observing_bus_ids).map(String)
      : [bus_id];

    // 11. Priority score computation (0-100)
    let priority_score = Number(raw.priority_score);
    if (isNaN(priority_score)) {
      const severityFactor = severity === 'CRITICAL' ? 40 : severity === 'HIGH' ? 30 : severity === 'MEDIUM' ? 20 : 10;
      const corroborationFactor = Math.min(30, corroboration_count * 10);
      const confidenceFactor = confidence * 30;
      priority_score = Math.min(100, Math.round((severityFactor + corroborationFactor + confidenceFactor) * 10) / 10);
    }

    // 12. Department Assignment
    let assigned_department: DepartmentType | undefined = raw.assigned_department;
    if (!assigned_department) {
      if (event_type === 'POTHOLE') assigned_department = 'PWD';
      else if (event_type === 'WATERLOGGING') assigned_department = 'DRAINAGE_BOARD';
      else if (event_type === 'TRAFFIC') assigned_department = 'TRAFFIC_POLICE';
      else if (event_type === 'DAMAGED_SIGN') assigned_department = 'PWD';
    }

    const normalized: UrbanEyeEvent = {
      event_id,
      event_type,
      bus_id,
      route_id,
      confidence,
      severity,
      latitude,
      longitude,
      timestamp,
      evidence_image,
      evidence_clip,
      status,
      source: raw.source || 'URBANEYE_DEMO_LAYER',
      jurisdiction: raw.jurisdiction || 'PMC',
      location_name: raw.location_name || `Near Route ${route_id} Corridor`,
      ward_id: raw.ward_id || 'PMC-UNKNOWN',
      ward_name: raw.ward_name || 'Pune City',
      corroboration_count,
      observation_count: corroboration_count,
      corroborating_buses,
      observing_bus_ids: corroborating_buses,
      corroboration_status: corroboration_count > 1 ? 'CORROBORATED' : 'UNVERIFIED',
      priority_score,
      assigned_department,
      ticket_id: raw.ticket_id,
      dispatched_at: raw.dispatched_at,
      estimated_dimensions: raw.estimated_dimensions,
      traffic_details: raw.traffic_details,
      hazard_details: raw.hazard_details,
    };

    return normalized;
  } catch (error) {
    console.error('[UrbanEye Normalizer] Failed to normalize event:', error);
    return null;
  }
}
