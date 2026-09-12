import assert from 'node:assert';
import { MOCK_EVENTS, MOCK_SYSTEM_KPIS } from '../services/mockData';
import { PUNE_POTHOLE_DEMO_EVENTS } from '../services/punePotholeData';
import { PUNE_WATERLOGGING_DEMO_EVENTS } from '../services/puneWaterloggingData';
import { PUNE_DAMAGED_SIGN_DEMO_EVENTS } from '../services/puneDamagedSignData';
import { SEEDED_PUNE_PRIORITY_ROUTES } from '../services/puneRoutes';
import { getTotalVehicleCount } from '../store/analyticsSelectors';
import { 
  YOLO_TRAFFIC_STREAM_META, 
  YOLO_TRAFFIC_TELEMETRY_FRAMES 
} from '../services/yoloTrafficStreamData';
import { trafficAdapter } from '../adapters/TrafficAdapter';

console.log('=== URBANEYE STEP 4: TRAFFIC INTELLIGENCE VERIFICATION ===\n');

// 1. Prior Layers Strict Preservation
console.log('--- 1. Preservation of Prior Layers ---');
const potholes = MOCK_EVENTS.filter(e => e.event_type === 'POTHOLE');
const waterlogging = MOCK_EVENTS.filter(e => e.event_type === 'WATERLOGGING');
const signs = MOCK_EVENTS.filter(e => e.event_type === 'DAMAGED_SIGN');
const traffic = MOCK_EVENTS.filter(e => e.event_type === 'TRAFFIC');

assert.strictEqual(potholes.length, 21, 'Pothole layer must retain exactly 21 records');
assert.strictEqual(PUNE_POTHOLE_DEMO_EVENTS.length, 21, 'Source pothole file must have 21 records');
assert.strictEqual(waterlogging.length, 12, 'Waterlogging layer must retain exactly 12 records');
assert.strictEqual(PUNE_WATERLOGGING_DEMO_EVENTS.length, 12, 'Source waterlogging file must have 12 records');
assert.strictEqual(signs.length, 11, 'Damaged signs layer must retain exactly 11 records');
assert.strictEqual(PUNE_DAMAGED_SIGN_DEMO_EVENTS.length, 11, 'Source damaged signs file must have 11 records');

console.log(`✔ Potholes: ${potholes.length} records preserved`);
console.log(`✔ Waterlogging: ${waterlogging.length} records preserved`);
console.log(`✔ Damaged Signs: ${signs.length} records preserved`);

// 2. Truthful Traffic Feed & Edge Detections Check
console.log('\n--- 2. Truthful Traffic Feed & Edge Detections ---');
const totalVehicles = getTotalVehicleCount(MOCK_EVENTS);
console.log(`Total Vehicles from camera edge detections: ${totalVehicles}`);
console.log(`Traffic density events: ${traffic.length}`);
console.log(`Average city speed KPI: ${MOCK_SYSTEM_KPIS.avg_city_speed_kmh} (Truthful zero / feed unavailable)`);
console.log(`Average congestion index KPI: ${MOCK_SYSTEM_KPIS.avg_congestion_index} (Truthful zero / feed unavailable)`);
assert.strictEqual(MOCK_SYSTEM_KPIS.avg_city_speed_kmh, 0, 'KPI average speed must not be invented');
assert.strictEqual(MOCK_SYSTEM_KPIS.avg_congestion_index, 0, 'KPI congestion index must not be invented');
console.log('✔ No fake traffic or fake speed values injected.');

// 3. Teammate YOLO Traffic Model Telemetry & Adapter Verification
console.log('\n--- 3. Teammate YOLO Traffic Model Telemetry ---');
assert.strictEqual(YOLO_TRAFFIC_STREAM_META.source, 'URBANEYE_CAMERA_LIVE');
assert.strictEqual(YOLO_TRAFFIC_STREAM_META.classes.includes('car'), true);
assert.strictEqual(YOLO_TRAFFIC_STREAM_META.classes.includes('motorcycle'), true);
assert.strictEqual(YOLO_TRAFFIC_STREAM_META.classes.includes('bus'), true);
assert.strictEqual(YOLO_TRAFFIC_STREAM_META.classes.includes('truck'), true);
assert.strictEqual(YOLO_TRAFFIC_STREAM_META.tracking_present, false, 'Tracking must be truthfully false');
assert.strictEqual(YOLO_TRAFFIC_STREAM_META.speed_available, false, 'Speed must be truthfully false');
assert.strictEqual(YOLO_TRAFFIC_STREAM_META.location, 'Camera Traffic Analysis — Location Unspecified');
assert.strictEqual(YOLO_TRAFFIC_TELEMETRY_FRAMES.length > 100, true, 'Telemetry frames must be populated');

const testFrame = YOLO_TRAFFIC_TELEMETRY_FRAMES[10];
const normalizedEvent = trafficAdapter.normalizeYoloFrame(testFrame);
assert.strictEqual(normalizedEvent.source, 'URBANEYE_CAMERA_LIVE');
assert.strictEqual(normalizedEvent.event_type, 'TRAFFIC');
assert.strictEqual(normalizedEvent.location_name, 'Camera Traffic Analysis — Location Unspecified');
assert.strictEqual(normalizedEvent.traffic_details?.vehicle_count, testFrame.total_vehicles);
assert.strictEqual(normalizedEvent.traffic_details?.average_speed, 0, 'Speed must remain 0 when unavailable');
console.log(`✔ Teammate YOLO Telemetry loaded: ${YOLO_TRAFFIC_TELEMETRY_FRAMES.length} frames`);
console.log(`✔ Adapter normalized event: ${normalizedEvent.event_id} (Source: ${normalizedEvent.source}, Vehicles: ${normalizedEvent.traffic_details?.vehicle_count})`);

// 4. Pune Priority Corridors Verification
console.log('\n--- 4. Pune Priority Monitoring Corridors ---');
const corridorIds = SEEDED_PUNE_PRIORITY_ROUTES.map(r => r.route_id);
const expectedCorridors = ['201', '291', '148', '103', '118', '98', '117'];
assert.deepStrictEqual(corridorIds, expectedCorridors, 'Must preserve exactly the 7 priority corridors');
console.log(`✔ 7 Priority Corridors verified: ${corridorIds.join(', ')}`);

// 5. Traffic Smoothing & Aggregation Layer Verification
console.log('\n--- 5. Traffic Smoothing & Aggregation Layer ---');
import { 
  useTrafficStreamStore, 
  AGGREGATION_WINDOW_MS, 
  TICK_INTERVAL_MS 
} from '../store/useTrafficStreamStore';

assert.strictEqual(AGGREGATION_WINDOW_MS >= 2000 && AGGREGATION_WINDOW_MS <= 3000, true, 'Aggregation window must be between 2-3s');
assert.strictEqual(TICK_INTERVAL_MS > 0 && TICK_INTERVAL_MS <= 500, true, 'Tick interval must be realistic sensing interval');
console.log(`✔ Aggregation Window: ${AGGREGATION_WINDOW_MS}ms (~${AGGREGATION_WINDOW_MS / 1000}s)`);
console.log(`✔ Sensing Tick Interval: ${TICK_INTERVAL_MS}ms`);

const state = useTrafficStreamStore.getState();
assert.ok(state.smoothedSnapshot, 'Store must expose smoothedSnapshot');
assert.ok(typeof state.smoothedSnapshot.total_vehicles === 'number', 'Smoothed vehicles must be a number');
assert.ok(typeof state.smoothedSnapshot.density_score === 'number', 'Smoothed density must be a number');
assert.ok(['LOW', 'MEDIUM', 'HEAVY'].includes(state.smoothedSnapshot.traffic_state), 'Valid congestion state');
assert.ok(Array.isArray(state.snapshotHistory), 'Snapshot history must be an array');
console.log(`✔ Initial Smoothed Snapshot: ${state.smoothedSnapshot.total_vehicles} vehicles, Density ${state.smoothedSnapshot.density_score}%, State ${state.smoothedSnapshot.traffic_state}`);

// Simulate a series of ticks within a window
const initialPublishedAt = state.lastPublishedTimestamp;
for (let i = 0; i < 5; i++) {
  useTrafficStreamStore.getState().tick();
}
// Before 2.4s window expires, snapshot must remain stable and not jump on each frame
const intermediateState = useTrafficStreamStore.getState();
assert.strictEqual(intermediateState.lastPublishedTimestamp, initialPublishedAt, 'Snapshot must not change before aggregation window');
console.log('✔ Intermediate frames buffered without jumping smoothed snapshot.');

console.log('\n=== ALL TRAFFIC INTELLIGENCE CHECKS PASSED CLEANLY! ===\n');

