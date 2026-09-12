import { UrbanEyeEvent, EventStatus, DepartmentType, EventType } from '../types/events';
import { normalizeRawEvent } from '../utils/eventNormalizer';
import { UrbanEyeApiService } from './api';
import { MOCK_EVENTS } from './mockData';
import { MockPotholeAdapter } from '../adapters/PotholeAdapter';
import { MockWaterloggingAdapter } from '../adapters/WaterloggingAdapter';
import { MockDamagedSignAdapter } from '../adapters/DamagedSignAdapter';
import { MockTrafficAdapter } from '../adapters/TrafficAdapter';
import { EdgeContext } from '../adapters/types';

const MOCK_LOCATIONS = [
  { name: 'Bhekrainagar Depot', lat: 18.4725, lng: 73.9680, ward_id: 'W-PMC', ward_name: 'PMC', route: '201' },
  { name: 'Hadapsar Gadital', lat: 18.5020, lng: 73.9298, ward_id: 'W-PMC', ward_name: 'PMC', route: '201' },
  { name: 'Pune Camp', lat: 18.5130, lng: 73.8965, ward_id: 'W-PMC', ward_name: 'PMC', route: '201' },
  { name: 'Pune Railway Station Corridor', lat: 18.5284, lng: 73.8743, ward_id: 'W-PMC', ward_name: 'PMC', route: '201' },
  { name: 'Vishrantwadi', lat: 18.5630, lng: 73.8790, ward_id: 'W-PMC', ward_name: 'PMC', route: '201' },
  { name: 'Alandi Road', lat: 18.6775, lng: 73.8967, ward_id: 'W-PMC', ward_name: 'PMC', route: '201' },
  { name: 'Swargate', lat: 18.5018, lng: 73.8586, ward_id: 'W-PMC', ward_name: 'PMC', route: '291' }
];

const MOCK_BUS_IDS = ['MH-12-PQ-1204', 'MH-12-FC-3312', 'MH-14-GU-8890', 'MH-12-RN-4451', 'MH-14-BT-9122', 'MH-12-HB-0911'];

export class EventService {
  /**
   * Load initial events from REST backend or mock repository with automatic validation.
   */
  public static async loadEvents(): Promise<UrbanEyeEvent[]> {
    try {
      const rawEvents = await UrbanEyeApiService.getEvents();
      const normalizedEvents: UrbanEyeEvent[] = [];

      for (const raw of rawEvents) {
        const evt = normalizeRawEvent(raw);
        if (evt) normalizedEvents.push(evt);
      }

      return normalizedEvents.length > 0 ? normalizedEvents : (MOCK_EVENTS.map(normalizeRawEvent).filter(Boolean) as UrbanEyeEvent[]);
    } catch {
      return MOCK_EVENTS.map(normalizeRawEvent).filter(Boolean) as UrbanEyeEvent[];
    }
  }

  /**
   * Safe event ingestion pathway for real-time WebSocket or edge feeds.
   */
  public static ingestEvent(raw: unknown): UrbanEyeEvent | null {
    return normalizeRawEvent(raw);
  }

  /**
   * Generates a realistic mock event for testing and simulation mode.
   */
  public static generateMockEvent(forcedType?: EventType): UrbanEyeEvent {
    const types: EventType[] = ['POTHOLE', 'WATERLOGGING', 'DAMAGED_SIGN', 'TRAFFIC'];
    const event_type = forcedType || types[Math.floor(Math.random() * types.length)];
    const loc = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
    const bus_id = MOCK_BUS_IDS[Math.floor(Math.random() * MOCK_BUS_IDS.length)];
    const jitterLat = (Math.random() - 0.5) * 0.005;
    const jitterLng = (Math.random() - 0.5) * 0.005;

    const context: EdgeContext = {
      bus_id,
      route_id: loc.route,
      latitude: loc.lat + jitterLat,
      longitude: loc.lng + jitterLng,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
      location_name: loc.name,
      ward_id: loc.ward_id,
      ward_name: loc.ward_name,
    };

    let rawAdapterOutput: Partial<UrbanEyeEvent> | null = null;
    
    // In a real environment, each adapter would listen to its own model output.
    // For the demo, we instantiate the mock adapters and feed them empty raw outputs 
    // to trigger their internal randomized mock generation.
    if (event_type === 'POTHOLE') {
      const adapter = new MockPotholeAdapter();
      rawAdapterOutput = adapter.processInference({}, context);
    } else if (event_type === 'WATERLOGGING') {
      const adapter = new MockWaterloggingAdapter();
      rawAdapterOutput = adapter.processInference({}, context);
    } else if (event_type === 'DAMAGED_SIGN') {
      const adapter = new MockDamagedSignAdapter();
      rawAdapterOutput = adapter.processInference({}, context);
    } else if (event_type === 'TRAFFIC') {
      const adapter = new MockTrafficAdapter();
      rawAdapterOutput = adapter.processInference({}, context);
    }

    if (!rawAdapterOutput) {
      throw new Error("Failed to generate mock event from adapter");
    }

    // Add extra simulation fields that the base normalizer expects
    rawAdapterOutput.corroboration_count = 1; // Real raw events always start at 1
    rawAdapterOutput.status = 'NEW';
    rawAdapterOutput.source = 'URBANEYE_DEMO_LAYER';

    // The single shared validation/normalization path
    return normalizeRawEvent(rawAdapterOutput)!;
  }

  /**
   * Generates a batch of demo events specifically designed to test the multi-bus corroboration logic.
   * e.g., 3 buses reporting the same pothole, 1 bus repeating it, 1 far away event.
   */
  public static generateCorroborationDemoData(): UrbanEyeEvent[] {
    const loc = MOCK_LOCATIONS[0];
    const timestamp = new Date().toISOString();
    const results: UrbanEyeEvent[] = [];

    // 1. Bus 1 spots pothole
    const adapter1 = new MockPotholeAdapter();
    const evt1 = normalizeRawEvent({
      ...adapter1.processInference({}, { bus_id: MOCK_BUS_IDS[0], route_id: loc.route, latitude: loc.lat, longitude: loc.lng, timestamp, location_name: loc.name, ward_id: loc.ward_id, ward_name: loc.ward_name }),
      corroboration_count: 1, status: 'NEW'
    })!;
    results.push(evt1);

    // 2. Bus 2 spots SAME pothole + 5m away
    const adapter2 = new MockPotholeAdapter();
    const evt2 = normalizeRawEvent({
      ...adapter2.processInference({}, { bus_id: MOCK_BUS_IDS[1], route_id: loc.route, latitude: loc.lat + 0.00004, longitude: loc.lng - 0.00002, timestamp, location_name: loc.name, ward_id: loc.ward_id, ward_name: loc.ward_name }),
      corroboration_count: 1, status: 'NEW'
    })!;
    results.push(evt2);

    // 3. Bus 3 spots SAME pothole + 10m away
    const adapter3 = new MockPotholeAdapter();
    const evt3 = normalizeRawEvent({
      ...adapter3.processInference({}, { bus_id: MOCK_BUS_IDS[2], route_id: loc.route, latitude: loc.lat - 0.00003, longitude: loc.lng + 0.00005, timestamp, location_name: loc.name, ward_id: loc.ward_id, ward_name: loc.ward_name }),
      corroboration_count: 1, status: 'NEW'
    })!;
    results.push(evt3);

    // 4. Bus 1 repeating observation 2 minutes later (should NOT increment bus count)
    const evt4 = normalizeRawEvent({
      ...adapter1.processInference({}, { bus_id: MOCK_BUS_IDS[0], route_id: loc.route, latitude: loc.lat, longitude: loc.lng, timestamp: new Date(Date.now() + 120000).toISOString(), location_name: loc.name, ward_id: loc.ward_id, ward_name: loc.ward_name }),
      corroboration_count: 1, status: 'NEW'
    })!;
    results.push(evt4);

    return results;
  }

  /**
   * Generates a batch of demo events specifically designed to test the Priority + Action Engine.
   * Creates a spectrum of events from CRITICAL to LOW priority based on weighting factors.
   */
  public static generatePriorityDemoData(): UrbanEyeEvent[] {
    const timestamp = new Date().toISOString();
    const results: UrbanEyeEvent[] = [];

    // 1. CRITICAL: High severity pothole, major route, high confidence, corroborated by 3 buses
    const loc1 = MOCK_LOCATIONS.find(l => l.name.includes('Ring Road')) || MOCK_LOCATIONS[0];
    for (let i = 0; i < 3; i++) {
      const adapter = new MockPotholeAdapter();
      const raw = adapter.processInference({}, { bus_id: MOCK_BUS_IDS[i], route_id: loc1.route, latitude: loc1.lat + (i * 0.00001), longitude: loc1.lng, timestamp, location_name: loc1.name, ward_id: loc1.ward_id, ward_name: loc1.ward_name });
      const evt = normalizeRawEvent({ ...raw, severity: 'CRITICAL', confidence: 0.98, corroboration_count: 1, status: 'NEW' })!;
      results.push(evt);
    }

    // 2. HIGH: Traffic bottleneck with high congestion
    const loc2 = MOCK_LOCATIONS[1];
    const adapter2 = new MockTrafficAdapter();
    const evt2 = normalizeRawEvent({ ...adapter2.processInference({}, { bus_id: MOCK_BUS_IDS[3], route_id: loc2.route, latitude: loc2.lat, longitude: loc2.lng, timestamp, location_name: loc2.name, ward_id: loc2.ward_id, ward_name: loc2.ward_name }), severity: 'HIGH', confidence: 0.90, corroboration_count: 1, status: 'NEW' })!;
    if (evt2.traffic_details) evt2.traffic_details.congestion_score = 95;
    results.push(evt2);

    // 3. LOW: Minor damaged sign, non-major route, single bus, low confidence
    const loc3 = MOCK_LOCATIONS.find(l => !l.name.includes('Ring Road') && !l.name.includes('100 Feet')) || MOCK_LOCATIONS[4];
    const adapter3 = new MockDamagedSignAdapter();
    const evt3 = normalizeRawEvent({ ...adapter3.processInference({}, { bus_id: MOCK_BUS_IDS[4], route_id: loc3.route, latitude: loc3.lat, longitude: loc3.lng, timestamp, location_name: loc3.name, ward_id: loc3.ward_id, ward_name: loc3.ward_name }), severity: 'LOW', confidence: 0.55, corroboration_count: 1, status: 'NEW' })!;
    results.push(evt3);

    return results;
  }

  /**
   * Update event status in the backend/API.
   */
  public static async updateStatus(
    eventId: string,
    status: EventStatus,
    ticketId?: string,
    department?: DepartmentType
  ) {
    return UrbanEyeApiService.updateEventStatus(eventId, status, ticketId, department);
  }
}
