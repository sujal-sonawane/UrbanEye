import { clusterEvents, CORROBORATION_RADIUS_METERS } from '../store/corroborationSelectors';
import { EventService } from '../services/eventService';
import { UrbanEyeEvent } from '../types/events';

console.log('=== URBANEYE CORROBORATION DEMO VERIFICATION ===');
console.log(`Corroboration Radius: ${CORROBORATION_RADIUS_METERS} meters\n`);

const POTHOLE_HOTSPOT = {
  lat: 18.5284,
  lng: 73.8743,
  route: '201',
  name: 'Pune Railway Station Corridor, Near West Gate',
  ward_id: 'W-PMC-01',
  ward_name: 'Pune Station / Shivajinagar'
};

// 1. Observation 1: BUS-101
const evt1: UrbanEyeEvent = {
  ...EventService.generateMockEvent('POTHOLE'),
  event_id: 'EVT-POTHOLE-1',
  bus_id: 'BUS-101',
  latitude: POTHOLE_HOTSPOT.lat,
  longitude: POTHOLE_HOTSPOT.lng,
  location_name: POTHOLE_HOTSPOT.name,
  ward_id: POTHOLE_HOTSPOT.ward_id,
  ward_name: POTHOLE_HOTSPOT.ward_name,
  route_id: POTHOLE_HOTSPOT.route,
  timestamp: new Date(Date.now() - 25000).toISOString(),
  severity: 'HIGH',
  corroboration_count: 1,
  status: 'NEW',
};

const clusters1 = clusterEvents([evt1]);
const potholeCluster1 = clusters1.find(c => c.event_type === 'POTHOLE') as any;
console.log('Step 1 (BUS-101):');
console.log(`  Corroboration count: ${potholeCluster1?.corroboration_count}`);
console.log(`  Observing buses: ${potholeCluster1?.observing_bus_ids?.join(', ')}`);
console.log(`  Status: ${potholeCluster1?.corroboration_status}`);
if (potholeCluster1?.corroboration_count !== 1) {
  throw new Error(`Expected 1 bus corroboration, got ${potholeCluster1?.corroboration_count}`);
}

// 2. Observation 2: BUS-204
const evt2: UrbanEyeEvent = {
  ...EventService.generateMockEvent('POTHOLE'),
  event_id: 'EVT-POTHOLE-2',
  bus_id: 'BUS-204',
  latitude: POTHOLE_HOTSPOT.lat + 0.00004,
  longitude: POTHOLE_HOTSPOT.lng - 0.00002,
  location_name: POTHOLE_HOTSPOT.name,
  ward_id: POTHOLE_HOTSPOT.ward_id,
  ward_name: POTHOLE_HOTSPOT.ward_name,
  route_id: POTHOLE_HOTSPOT.route,
  timestamp: new Date(Date.now() - 15000).toISOString(),
  severity: 'HIGH',
  corroboration_count: 1,
  status: 'NEW',
};

const clusters2 = clusterEvents([evt1, evt2]);
const potholeCluster2 = clusters2.find(c => c.event_type === 'POTHOLE') as any;
console.log('\nStep 2 (BUS-204):');
console.log(`  Corroboration count: ${potholeCluster2?.corroboration_count}`);
console.log(`  Observing buses: ${potholeCluster2?.observing_bus_ids?.join(', ')}`);
console.log(`  Status: ${potholeCluster2?.corroboration_status}`);
if (potholeCluster2?.corroboration_count !== 2) {
  throw new Error(`Expected 2 buses corroboration, got ${potholeCluster2?.corroboration_count}`);
}

// 3. Observation 3: BUS-310
const evt3: UrbanEyeEvent = {
  ...EventService.generateMockEvent('POTHOLE'),
  event_id: 'EVT-POTHOLE-3',
  bus_id: 'BUS-310',
  latitude: POTHOLE_HOTSPOT.lat - 0.00003,
  longitude: POTHOLE_HOTSPOT.lng + 0.00004,
  location_name: POTHOLE_HOTSPOT.name,
  ward_id: POTHOLE_HOTSPOT.ward_id,
  ward_name: POTHOLE_HOTSPOT.ward_name,
  route_id: POTHOLE_HOTSPOT.route,
  timestamp: new Date().toISOString(),
  severity: 'CRITICAL',
  corroboration_count: 1,
  status: 'NEW',
};

const clusters3 = clusterEvents([evt1, evt2, evt3]);
const potholeCluster3 = clusters3.find(c => c.event_type === 'POTHOLE') as any;
console.log('\nStep 3 (BUS-310):');
console.log(`  Corroboration count: ${potholeCluster3?.corroboration_count}`);
console.log(`  Observing buses: ${potholeCluster3?.observing_bus_ids?.join(', ')}`);
console.log(`  Status: ${potholeCluster3?.corroboration_status}`);
console.log(`  Severity: ${potholeCluster3?.severity}`);
console.log(`  Cluster Centroid: [${potholeCluster3?.latitude?.toFixed(6)}, ${potholeCluster3?.longitude?.toFixed(6)}]`);

if (potholeCluster3?.corroboration_count !== 3) {
  throw new Error(`Expected 3 buses corroboration, got ${potholeCluster3?.corroboration_count}`);
}

console.log('\nSUCCESS: 1-bus -> 2-bus -> 3-bus corroboration verified deterministically!');
