import { SEEDED_PUNE_PRIORITY_ROUTES, PUNE_CITY_CENTROID } from '../services/puneRoutes';
import { calculatePuneRouteAnalytics, calculateRouteRiskScore, getLeadingIssueType } from '../store/routeSelectors';
import { UrbanEyeEvent } from '../types/events';

console.log('=== URBANEYE PUNE PRIORITY ROUTE INTELLIGENCE TEST ===\n');

// 1. Verify Pune Centroid & Corridors Integrity
console.log('--- Test 1: Corridors Integrity & Ordering ---');
if (PUNE_CITY_CENTROID[0] <= 70 || PUNE_CITY_CENTROID[1] <= 15) {
  throw new Error(`Invalid Pune Centroid: ${JSON.stringify(PUNE_CITY_CENTROID)}`);
}
console.log(`  Pune City Centroid verified: [${PUNE_CITY_CENTROID.join(', ')}]`);

const expectedRoutes = [
  { id: '201', rank: 1, name: 'Route 201 — Bhekrainagar Depot ↔ Alandi' },
  { id: '291', rank: 2, name: 'Route 291 — Hadapsar Gadital ↔ Katraj' },
  { id: '148', rank: 3, name: 'Route 148 — Shewalewadi Depot ↔ Pimplegurav' },
  { id: '103', rank: 4, name: 'Route 103 — Katraj ↔ Kothrud Depot' },
  { id: '118', rank: 5, name: 'Route 118 — Vadgaon Budruk ↔ Swargate' },
  { id: '98', rank: 6, name: 'Route 98 — Ganpati Matha ↔ Pune Station' },
  { id: '117', rank: 7, name: 'Route 117 — Dhayari ↔ Swargate' },
];

if (SEEDED_PUNE_PRIORITY_ROUTES.length !== 7) {
  throw new Error(`Expected exactly 7 Pune priority routes, got ${SEEDED_PUNE_PRIORITY_ROUTES.length}`);
}

// Verify helper functions directly
if (calculateRouteRiskScore([]) !== 0) throw new Error('Risk score for empty events should be 0');
if (getLeadingIssueType([]) !== 'None Detected (Clear)') throw new Error('Leading issue for empty events should be clear');

SEEDED_PUNE_PRIORITY_ROUTES.forEach((route, idx) => {
  const expected = expectedRoutes[idx];
  console.log(`  [Rank #${route.priority_rank}] Route ${route.route_id}: ${route.origin} ↔ ${route.destination}`);
  
  if (route.route_id !== expected.id) {
    throw new Error(`Route mismatch at index ${idx}: expected ${expected.id}, got ${route.route_id}`);
  }
  if (route.priority_rank !== expected.rank) {
    throw new Error(`Rank mismatch for route ${route.route_id}: expected ${expected.rank}, got ${route.priority_rank}`);
  }
  if (route.city !== 'Pune') {
    throw new Error(`City must be 'Pune', got '${route.city}' on route ${route.route_id}`);
  }
  if (route.jurisdiction !== 'PMC') {
    throw new Error(`Jurisdiction must be 'PMC', got '${route.jurisdiction}' on route ${route.route_id}`);
  }
  if (!route.coordinates || route.coordinates.length < 2) {
    throw new Error(`Route ${route.route_id} must have valid LineString coordinates`);
  }
});
console.log('✔ All 7 corridors verified with correct priority ranks and geometry.\n');

// 2. Verify Jurisdiction separation (Pune PMC only, PCMC excluded)
console.log('--- Test 2: Jurisdiction Scope (PMC Only, PCMC Excluded) ---');
SEEDED_PUNE_PRIORITY_ROUTES.forEach((route) => {
  const serialized = JSON.stringify(route).toLowerCase();
  if (serialized.includes('pcmc') || (route.jurisdiction as string) === 'PCMC') {
    throw new Error(`PCMC detected in route ${route.route_id}. PCMC must NOT be included in Pune City jurisdiction!`);
  }
});

// Create PCMC test event
const pcmcEvent: UrbanEyeEvent = {
  event_id: 'PCMC-EVT-01',
  event_type: 'POTHOLE',
  bus_id: 'MH-12-PMP-500',
  route_id: '201', // Explicitly marked as 201
  confidence: 0.95,
  severity: 'CRITICAL',
  latitude: 18.5020,
  longitude: 73.9298,
  timestamp: new Date().toISOString(),
  evidence_image: '/evidence/pothole.jpg',
  status: 'NEW',
  jurisdiction: 'PCMC', // EXCLUDED!
  location_name: 'PCMC Limits',
  corroboration_count: 1,
  priority_score: 90,
};

const analyticsWithPCMC = calculatePuneRouteAnalytics([pcmcEvent]);
const route201WithPCMC = analyticsWithPCMC.find(r => r.route_id === '201');
if ((route201WithPCMC?.event_count ?? 0) > 0) {
  throw new Error(`PCMC event was incorrectly included in Pune route analytics!`);
}
console.log('✔ Confirmed: PCMC events are successfully filtered out of Pune analytics.\n');

// 3. Verify Credibility Rule (No hardcoded fake counts on initial routes)
console.log('--- Test 3: Dynamic Calculation (Zero Fake Event Counts) ---');
const emptyAnalytics = calculatePuneRouteAnalytics([]);
emptyAnalytics.forEach((rt) => {
  if (rt.event_count !== 0 || rt.risk_score !== 0) {
    throw new Error(`Route ${rt.route_id} had non-zero baseline counts without actual events: count=${rt.event_count}, score=${rt.risk_score}`);
  }
  if (rt.leading_issue_type !== 'None Detected (Clear)') {
    throw new Error(`Route ${rt.route_id} leading issue expected 'None Detected (Clear)', got '${rt.leading_issue_type}'`);
  }
});
console.log('✔ Confirmed: Clean baseline with 0 fabricated event counts.\n');

// 4. Verify Dynamic Event Aggregation, Proximity, and Sorting
console.log('--- Test 4: Dynamic Event Aggregation, Proximity, and Risk Sorting ---');
const testEvents: UrbanEyeEvent[] = [
  {
    event_id: 'PUNE-EVT-01',
    event_type: 'POTHOLE',
    bus_id: 'MH-12-PMP-101',
    route_id: '201', // Direct association
    confidence: 0.95,
    severity: 'CRITICAL',
    latitude: 18.5020,
    longitude: 73.9298,
    timestamp: new Date().toISOString(),
    evidence_image: '/evidence/pothole.jpg',
    status: 'CORROBORATED',
    location_name: 'Hadapsar Gadital, Route 201 Corridor',
    corroboration_count: 3,
    corroborating_buses: ['MH-12-PMP-101', 'MH-12-PMP-102', 'MH-12-PMP-103'],
    priority_score: 92.0,
  },
  {
    event_id: 'PUNE-EVT-02',
    event_type: 'POTHOLE',
    bus_id: 'MH-12-PMP-104',
    route_id: '', // Blank, must match by proximity
    confidence: 0.88,
    severity: 'HIGH',
    latitude: 18.5284,
    longitude: 73.8743, // Pune Station coordinate on Route 201
    timestamp: new Date().toISOString(),
    evidence_image: '/evidence/pothole.jpg',
    status: 'NEW',
    location_name: 'Pune Station',
    corroboration_count: 1,
    priority_score: 75.0,
  },
  {
    event_id: 'PUNE-EVT-03',
    event_type: 'TRAFFIC',
    bus_id: 'MH-12-PMP-205',
    route_id: '118',
    confidence: 0.92,
    severity: 'HIGH',
    latitude: 18.4850,
    longitude: 73.8380,
    timestamp: new Date().toISOString(),
    evidence_image: '/evidence/traffic.jpg',
    status: 'CORROBORATED',
    location_name: 'Sinhagad Road Hingne',
    corroboration_count: 2,
    priority_score: 84.0,
    traffic_details: {
      vehicle_count: 120,
      cars: 50,
      bikes: 60,
      buses: 6,
      trucks: 4,
      average_speed: 12.5,
      density: 'HEAVY',
      congestion_score: 85.0,
    }
  }
];

const computedAnalytics = calculatePuneRouteAnalytics(testEvents);

// Sorting check
if (computedAnalytics[0].route_id !== '201') {
  throw new Error(`Route 201 should be Rank 1 based on events, but got Route ${computedAnalytics[0].route_id}`);
}
if (computedAnalytics[1].route_id !== '118') {
  throw new Error(`Route 118 should be Rank 2 based on events, but got Route ${computedAnalytics[1].route_id}`);
}

// Route 148 and 98 intersect at Pune Station, so the geometric proximity event will also match them!
const route148 = computedAnalytics.find(r => r.route_id === '148');
if (route148?.event_count !== 1) {
  throw new Error(`Route 148 should also get the proximity event, but got ${route148?.event_count}`);
}

const route201 = computedAnalytics.find(r => r.route_id === '201');
const route118 = computedAnalytics.find(r => r.route_id === '118');

console.log(`Route 201 Analytics:`);
console.log(`  Events: ${route201?.event_count}, Potholes: ${route201?.pothole_count}, Corroborated: ${route201?.corroborated_event_count}`);
console.log(`  Leading Issue: ${route201?.leading_issue_type}, Risk Score: ${route201?.risk_score}`);

if (route201?.event_count !== 2 || route201?.pothole_count !== 2 || route201?.corroborated_event_count !== 1) {
  throw new Error(`Route 201 event aggregation mismatch: ${JSON.stringify(route201)}`);
}
if (!route201?.leading_issue_type.includes('Pothole')) {
  throw new Error(`Expected Leading Issue for Route 201 to be Pothole, got '${route201?.leading_issue_type}'`);
}
if ((route201?.risk_score || 0) <= 0) {
  throw new Error(`Expected positive risk score for Route 201, got ${route201?.risk_score}`);
}

console.log(`\nRoute 118 Analytics:`);
console.log(`  Events: ${route118?.event_count}, Traffic Events: ${route118?.traffic_event_count}`);
console.log(`  Leading Issue: ${route118?.leading_issue_type}, Risk Score: ${route118?.risk_score}`);

if (route118?.event_count !== 1 || route118?.traffic_event_count !== 1) {
  throw new Error(`Route 118 event aggregation mismatch: ${JSON.stringify(route118)}`);
}
if (!route118?.leading_issue_type.includes('Traffic')) {
  throw new Error(`Expected Leading Issue for Route 118 to be Traffic, got '${route118?.leading_issue_type}'`);
}

console.log('\n✔ Dynamic aggregation, proximity association, and risk sorting verified cleanly.');
console.log('\n=== ALL PUNE PRIORITY ROUTE INTELLIGENCE TESTS PASSED! ===');
