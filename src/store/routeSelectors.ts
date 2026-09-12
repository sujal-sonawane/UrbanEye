import { UrbanEyeEvent, RouteCorridorAnalytics, PunePriorityRoute } from '../types/events';
import { SEEDED_PUNE_PRIORITY_ROUTES } from '../services/puneRoutes';
import { getEventTypeLabel } from '../lib/utils';

// Helper: Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const x = (lon2 - lon1) * Math.cos(0.5 * (lat2 + lat1) * Math.PI / 180);
  const y = lat2 - lat1;
  return R * Math.sqrt(x * x + y * y) * Math.PI / 180;
}

// Helper: Distance from a point to a line segment in km
function getDistanceFromPointToSegmentKm(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const x = pLng;
  const y = pLat;
  const x1 = aLng;
  const y1 = aLat;
  const x2 = bLng;
  const y2 = bLat;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  
  if (len_sq !== 0) {
      param = dot / len_sq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return calculateDistanceKm(y, x, yy, xx);
}

// Minimum distance from an event to any segment of a route polyline
function getEventDistanceToRouteKm(event: UrbanEyeEvent, route: PunePriorityRoute): number {
  if (!route.coordinates || route.coordinates.length < 2) return Infinity;

  let minDistance = Infinity;
  for (let i = 0; i < route.coordinates.length - 1; i++) {
    const a = route.coordinates[i];
    const b = route.coordinates[i + 1];
    
    // coordinates are [lng, lat]
    const dist = getDistanceFromPointToSegmentKm(
      event.latitude, event.longitude,
      a[1], a[0],
      b[1], b[0]
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

/**
 * Calculates a dynamic 0-100 risk score for a route corridor based solely on
 * actual URBANEYE events detected along that corridor.
 * 
 * If no events exist, the risk score is 0.
 */
export const calculateRouteRiskScore = (matchingEvents: UrbanEyeEvent[]): number => {
  if (!matchingEvents || matchingEvents.length === 0) {
    return 0;
  }

  let totalScore = 0;

  for (const evt of matchingEvents) {
    // Severity Base Penalty
    let severityWeight = 3; // LOW
    if (evt.severity === 'CRITICAL') severityWeight = 25;
    else if (evt.severity === 'HIGH') severityWeight = 15;
    else if (evt.severity === 'MEDIUM') severityWeight = 8;

    // Multi-Bus Corroboration Multiplier (corroborated defects are confirmed high risk)
    const corroborationMultiplier = evt.corroboration_count > 1 ? 1.25 : 1.0;

    // Priority Score Influence if present
    const priorityWeight = evt.priority_score ? evt.priority_score * 0.1 : 0;

    // Traffic congestion penalty if present
    let trafficPenalty = 0;
    if (evt.event_type === 'TRAFFIC' && evt.traffic_details?.congestion_score) {
      trafficPenalty = evt.traffic_details.congestion_score * 0.15;
    }

    const eventRisk = (severityWeight * corroborationMultiplier) + priorityWeight + trafficPenalty;
    totalScore += eventRisk;
  }

  return Math.min(100, Math.max(0, Math.round(totalScore)));
};

/**
 * Determines the leading / dominant issue type for a corridor from actual events.
 */
export const getLeadingIssueType = (matchingEvents: UrbanEyeEvent[]): string => {
  if (!matchingEvents || matchingEvents.length === 0) {
    return 'None Detected (Clear)';
  }

  const counts: Record<string, number> = {
    POTHOLE: 0,
    WATERLOGGING: 0,
    DAMAGED_SIGN: 0,
    TRAFFIC: 0,
  };

  matchingEvents.forEach((e) => {
    if (counts[e.event_type] !== undefined) {
      counts[e.event_type]++;
    }
  });

  let maxType = 'POTHOLE';
  let maxCount = -1;

  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }

  return maxCount > 0 ? getEventTypeLabel(maxType as any) : 'None Detected (Clear)';
};

/**
 * Centralized Route Analytics Aggregator.
 * 
 * Computes corridor-level event breakdown, leading issue type, and risk score
 * dynamically from actual events.
 */
export const calculatePuneRouteAnalytics = (
  events: UrbanEyeEvent[],
  seededRoutes: PunePriorityRoute[] = SEEDED_PUNE_PRIORITY_ROUTES
): RouteCorridorAnalytics[] => {
  // 1. Pre-filter out PCMC events for Pune metrics
  const puneCityEvents = events.filter((e) => {
    const juris = (e.jurisdiction || '').toUpperCase();
    const wardName = (e.ward_name || '').toUpperCase();
    const wardId = (e.ward_id || '').toUpperCase();
    const loc = (e.location_name || '').toUpperCase();

    if (juris.includes('PCMC') || wardName.includes('PCMC') || wardId.includes('PCMC') || loc.includes('PCMC')) {
      return false; // Exclude PCMC entirely
    }
    return true;
  });

  const analyticsList = seededRoutes.map((route) => {
    const targetId = route.route_id.toLowerCase().trim();

    // Match events for this route using the preferred order of association:
    const matchingEvents = puneCityEvents.filter((e) => {
      // 1. Direct route_id relationship
      const eRoute = (e.route_id || '').toLowerCase().trim();
      if (eRoute) {
        if (eRoute === targetId || eRoute === `route ${targetId}` || eRoute === `rt ${targetId}` || eRoute === `route-${targetId}`) {
          return true;
        }
        // If explicitly assigned to another specific route, don't cross-match
        return false;
      }
      
      // 2. Route geometry proximity (~150 meters threshold)
      const distKm = getEventDistanceToRouteKm(e, route);
      if (distKm <= 0.15) {
        return true;
      }

      // 3. Existing route metadata fallback (location name matching)
      const loc = (e.location_name || '').toLowerCase();
      if (loc.includes(`route ${targetId}`) || loc.includes(`rt ${targetId}`) || loc.includes(`route-${targetId}`)) {
        return true;
      }

      // 4. Otherwise unknown / no association
      return false;
    });

    const pothole_count = matchingEvents.filter((e) => e.event_type === 'POTHOLE').length;
    const waterlogging_count = matchingEvents.filter((e) => e.event_type === 'WATERLOGGING').length;
    const damaged_sign_count = matchingEvents.filter((e) => e.event_type === 'DAMAGED_SIGN').length;
    const traffic_event_count = matchingEvents.filter((e) => e.event_type === 'TRAFFIC').length;
    const corroborated_event_count = matchingEvents.filter((e) => e.corroboration_count > 1).length;
    const event_count = matchingEvents.length;

    const risk_score = calculateRouteRiskScore(matchingEvents);
    const leading_issue_type = getLeadingIssueType(matchingEvents);

    return {
      ...route,
      event_count,
      pothole_count,
      waterlogging_count,
      damaged_sign_count,
      traffic_event_count,
      corroborated_event_count,
      risk_score,
      leading_issue_type,
    };
  });

  // Dynamic Route Sorting: Highest risk score first
  return analyticsList.sort((a, b) => b.risk_score - a.risk_score);
};
