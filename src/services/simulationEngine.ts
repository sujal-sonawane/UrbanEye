import { webSocketService } from './websocket';
import { EventService } from './eventService';
import { BusTelemetry } from '../types/events';
import { SEEDED_PUNE_PRIORITY_ROUTES } from './puneRoutes';

// We map the scenario hotspots to Pune Route 201 coordinates.
const SCENARIO_LOCATIONS = {
  START_101: { lat: 18.4725, lng: 73.9680, route: '201', name: 'Bhekrainagar Depot' },
  START_204: { lat: 18.5020, lng: 73.9298, route: '201', name: 'Hadapsar Gadital' },
  START_310: { lat: 18.5130, lng: 73.8965, route: '201', name: 'Pune Camp' },
  POTHOLE_HOTSPOT: { lat: 18.5284, lng: 73.8743, route: '201', name: 'Pune Railway Station Corridor', ward_id: 'W-PMC', ward_name: 'PMC' },
  TRAFFIC_HOTSPOT: { lat: 18.5130, lng: 73.8965, route: '201', name: 'Pune Camp Junction', ward_id: 'W-PMC', ward_name: 'PMC' },
  WATERLOGGING_HOTSPOT: { lat: 18.5630, lng: 73.8790, route: '201', name: 'Vishrantwadi', ward_id: 'W-PMC', ward_name: 'PMC' },
  SIGN_HOTSPOT: { lat: 18.6775, lng: 73.8967, route: '201', name: 'Alandi Road', ward_id: 'W-PMC', ward_name: 'PMC' }
};

interface SimBusState {
  routeCoords: [number, number][]; // [lng, lat]
  segmentIdx: number;
  fraction: number; // 0 to 1 inside current segment
  reversed: boolean; // if moving backwards
}

// Distance between two coordinates in km (Haversine formula approximation)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const x = (lon2 - lon1) * Math.cos(0.5 * (lat2 + lat1) * Math.PI / 180);
  const y = lat2 - lat1;
  return R * Math.sqrt(x * x + y * y) * Math.PI / 180;
}

// Heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
function calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dy = lat2 - lat1;
  const dx = Math.cos(Math.PI / 180 * lat1) * (lon2 - lon1);
  return (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
}

export class UrbanEyeSimulationEngine {
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private currentTick = 0;
  private maxTicks = 120;
  private status: 'STOPPED' | 'RUNNING' | 'PAUSED' = 'STOPPED';
  private speedMultiplier = 1;
  private onTickCallback?: (tick: number, status: string) => void;
  
  // Track buses for telemetry updates
  private fleetState: BusTelemetry[] = [];
  private busSimStates = new Map<string, SimBusState>();

  constructor() {
    this.resetFleet();
  }

  private resetFleet() {
    const now = new Date().toISOString();
    
    // Pick Route 201 for the demo buses
    const route201 = SEEDED_PUNE_PRIORITY_ROUTES.find(r => r.route_id === '201');
    if (!route201) return;

    this.fleetState = [
      { bus_id: 'BUS-101', route_id: '201', route_name: route201.route_name, driver_name: 'Sachin K. (Demo)', latitude: route201.coordinates[0][1], longitude: route201.coordinates[0][0], speed_kmh: 0, heading_deg: 90, status: 'IDLE', camera_status: 'STREAMING', gps_signal: 'EXCELLENT', ai_fps: 28.5, detections_today: 0, last_ping: now, source: 'DEMO_SIMULATION' },
      { bus_id: 'BUS-204', route_id: '201', route_name: route201.route_name, driver_name: 'Ramesh P. (Demo)', latitude: route201.coordinates[1][1], longitude: route201.coordinates[1][0], speed_kmh: 0, heading_deg: 90, status: 'IDLE', camera_status: 'STREAMING', gps_signal: 'EXCELLENT', ai_fps: 29.1, detections_today: 0, last_ping: now, source: 'DEMO_SIMULATION' },
      { bus_id: 'BUS-310', route_id: '201', route_name: route201.route_name, driver_name: 'Sunil J. (Demo)', latitude: route201.coordinates[2][1], longitude: route201.coordinates[2][0], speed_kmh: 0, heading_deg: 90, status: 'IDLE', camera_status: 'STREAMING', gps_signal: 'EXCELLENT', ai_fps: 30.0, detections_today: 0, last_ping: now, source: 'DEMO_SIMULATION' },
    ];

    this.busSimStates.set('BUS-101', { routeCoords: route201.coordinates, segmentIdx: 0, fraction: 0, reversed: false });
    this.busSimStates.set('BUS-204', { routeCoords: route201.coordinates, segmentIdx: 1, fraction: 0, reversed: false });
    this.busSimStates.set('BUS-310', { routeCoords: route201.coordinates, segmentIdx: 2, fraction: 0, reversed: false });
  }

  public getFleetState(): BusTelemetry[] {
    return [...this.fleetState];
  }

  public start(speed: number = 1) {
    if (this.status === 'RUNNING') return;
    this.speedMultiplier = speed;
    this.status = 'RUNNING';
    webSocketService.setDemoMode(true);

    this.runInterval();
  }

  public pause() {
    this.status = 'PAUSED';
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.onTickCallback) this.onTickCallback(this.currentTick, this.status);
  }

  public stop() {
    this.status = 'STOPPED';
    if (this.tickInterval) clearInterval(this.tickInterval);
    webSocketService.setDemoMode(false);
    if (this.onTickCallback) this.onTickCallback(this.currentTick, this.status);
  }

  public reset() {
    this.stop();
    this.currentTick = 0;
    this.resetFleet();
    if (this.onTickCallback) this.onTickCallback(this.currentTick, this.status);
  }

  public setOnTick(callback: (tick: number, status: string) => void) {
    this.onTickCallback = callback;
  }

  public setSpeed(speed: number) {
    this.speedMultiplier = speed;
    if (this.status === 'RUNNING') {
      if (this.tickInterval) clearInterval(this.tickInterval);
      this.runInterval();
    }
  }

  public getStatus() {
    return this.status;
  }

  public getTick() {
    return this.currentTick;
  }

  public getMaxTicks() {
    return this.maxTicks;
  }

  private runInterval() {
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000 / this.speedMultiplier);
  }

  private tick() {
    if (this.currentTick >= this.maxTicks) {
      this.pause();
      return;
    }

    this.currentTick++;
    const t = this.currentTick;
    const now = new Date().toISOString();

    // 1. Update Fleet positions (move them along route corridor)
    if (t > 0 && t <= 120) {
      // Delta time is conceptually 1 second in sim time
      const dtHours = 1 / 3600; 

      this.fleetState.forEach(bus => {
        bus.status = 'ACTIVE';
        bus.speed_kmh = 40; // Simulate 40 km/h
        bus.last_ping = now;

        const simState = this.busSimStates.get(bus.bus_id);
        if (simState) {
          const coords = simState.routeCoords;
          let distanceToMoveKm = bus.speed_kmh * dtHours;

          // Move the bus along the segments
          while (distanceToMoveKm > 0) {
            let nextIdx = simState.reversed ? simState.segmentIdx - 1 : simState.segmentIdx + 1;
            
            // Handle reaching end of route
            if (nextIdx < 0 || nextIdx >= coords.length) {
              simState.reversed = !simState.reversed;
              nextIdx = simState.reversed ? simState.segmentIdx - 1 : simState.segmentIdx + 1;
            }

            const currentPos = coords[simState.segmentIdx];
            const nextPos = coords[nextIdx];
            
            // For fraction interpolation, calculate total length of current segment
            const segLengthKm = calculateDistanceKm(currentPos[1], currentPos[0], nextPos[1], nextPos[0]);
            
            // Remaining distance in this segment
            const remSegDistKm = segLengthKm * (1 - simState.fraction);
            
            if (distanceToMoveKm >= remSegDistKm) {
              // We consumed this segment, move to next
              distanceToMoveKm -= remSegDistKm;
              simState.segmentIdx = nextIdx;
              simState.fraction = 0;
            } else {
              // Move fractionally within this segment
              simState.fraction += distanceToMoveKm / segLengthKm;
              distanceToMoveKm = 0;
            }
          }

          // Compute final position for this tick
          let nextIdx = simState.reversed ? simState.segmentIdx - 1 : simState.segmentIdx + 1;
          if (nextIdx < 0 || nextIdx >= coords.length) {
              nextIdx = simState.reversed ? simState.segmentIdx + 1 : simState.segmentIdx - 1;
          }

          const currentPos = coords[simState.segmentIdx];
          const nextPos = coords[nextIdx];
          
          bus.longitude = currentPos[0] + (nextPos[0] - currentPos[0]) * simState.fraction;
          bus.latitude = currentPos[1] + (nextPos[1] - currentPos[1]) * simState.fraction;
          bus.heading_deg = calculateHeading(bus.latitude, bus.longitude, nextPos[1], nextPos[0]);
        }
      });
      webSocketService.simulateFleetUpdate([...this.fleetState]);
    }

    // 2. Execute scenario script with PUNE coordinates
    if (t === 15) {
      const evt = EventService.generateMockEvent('TRAFFIC');
      evt.bus_id = 'BUS-101';
      evt.latitude = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.lat;
      evt.longitude = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.lng;
      evt.location_name = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.name;
      evt.ward_id = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.ward_id;
      evt.ward_name = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.ward_name;
      evt.route_id = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.route;
      evt.timestamp = now;
      evt.severity = 'MEDIUM';
      if (evt.traffic_details) {
        evt.traffic_details.density = 'MODERATE';
        evt.traffic_details.congestion_score = 60;
      }
      webSocketService.simulateEvent(evt);
    }

    if (t === 25) {
      const evt = EventService.generateMockEvent('TRAFFIC');
      evt.bus_id = 'BUS-204';
      evt.latitude = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.lat;
      evt.longitude = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.lng;
      evt.location_name = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.name;
      evt.ward_id = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.ward_id;
      evt.ward_name = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.ward_name;
      evt.route_id = SCENARIO_LOCATIONS.TRAFFIC_HOTSPOT.route;
      evt.timestamp = now;
      evt.severity = 'HIGH';
      if (evt.traffic_details) {
        evt.traffic_details.density = 'HEAVY';
        evt.traffic_details.congestion_score = 85;
      }
      webSocketService.simulateEvent(evt);
    }

    if (t === 35) {
      const evt = EventService.generateMockEvent('POTHOLE');
      evt.bus_id = 'BUS-101';
      evt.latitude = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.lat;
      evt.longitude = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.lng;
      evt.location_name = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.name;
      evt.ward_id = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.ward_id;
      evt.ward_name = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.ward_name;
      evt.route_id = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.route;
      evt.timestamp = now;
      evt.severity = 'HIGH';
      const b0 = this.fleetState[0];
      if (b0) b0.detections_today = (b0.detections_today || 0) + 1;
      webSocketService.simulateEvent(evt);
    }

    if (t === 45) {
      const evt = EventService.generateMockEvent('POTHOLE');
      evt.bus_id = 'BUS-204';
      evt.latitude = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.lat + 0.00004;
      evt.longitude = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.lng - 0.00002;
      evt.location_name = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.name;
      evt.ward_id = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.ward_id;
      evt.ward_name = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.ward_name;
      evt.route_id = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.route;
      evt.timestamp = now;
      evt.severity = 'HIGH';
      const b1 = this.fleetState[1];
      if (b1) b1.detections_today = (b1.detections_today || 0) + 1;
      webSocketService.simulateEvent(evt);
    }

    if (t === 60) {
      const evt = EventService.generateMockEvent('POTHOLE');
      evt.bus_id = 'BUS-310';
      evt.latitude = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.lat - 0.00003;
      evt.longitude = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.lng + 0.00004;
      evt.location_name = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.name;
      evt.ward_id = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.ward_id;
      evt.ward_name = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.ward_name;
      evt.route_id = SCENARIO_LOCATIONS.POTHOLE_HOTSPOT.route;
      evt.timestamp = now;
      evt.severity = 'CRITICAL';
      const b2 = this.fleetState[2];
      if (b2) b2.detections_today = (b2.detections_today || 0) + 1;
      webSocketService.simulateEvent(evt);
    }

    if (t === 95) {
      const evt = EventService.generateMockEvent('WATERLOGGING');
      evt.bus_id = 'BUS-101';
      evt.latitude = SCENARIO_LOCATIONS.WATERLOGGING_HOTSPOT.lat;
      evt.longitude = SCENARIO_LOCATIONS.WATERLOGGING_HOTSPOT.lng;
      evt.location_name = SCENARIO_LOCATIONS.WATERLOGGING_HOTSPOT.name;
      evt.ward_id = SCENARIO_LOCATIONS.WATERLOGGING_HOTSPOT.ward_id;
      evt.ward_name = SCENARIO_LOCATIONS.WATERLOGGING_HOTSPOT.ward_name;
      evt.route_id = SCENARIO_LOCATIONS.WATERLOGGING_HOTSPOT.route;
      evt.timestamp = now;
      evt.severity = 'CRITICAL';
      const b0 = this.fleetState[0];
      if (b0) b0.detections_today = (b0.detections_today || 0) + 1;
      webSocketService.simulateEvent(evt);
    }

    if (t === 110) {
      const evt = EventService.generateMockEvent('DAMAGED_SIGN');
      evt.bus_id = 'BUS-204';
      evt.latitude = SCENARIO_LOCATIONS.SIGN_HOTSPOT.lat;
      evt.longitude = SCENARIO_LOCATIONS.SIGN_HOTSPOT.lng;
      evt.location_name = SCENARIO_LOCATIONS.SIGN_HOTSPOT.name;
      evt.ward_id = SCENARIO_LOCATIONS.SIGN_HOTSPOT.ward_id;
      evt.ward_name = SCENARIO_LOCATIONS.SIGN_HOTSPOT.ward_name;
      evt.route_id = SCENARIO_LOCATIONS.SIGN_HOTSPOT.route;
      evt.timestamp = now;
      evt.severity = 'LOW';
      const b1 = this.fleetState[1];
      if (b1) b1.detections_today = (b1.detections_today || 0) + 1;
      webSocketService.simulateEvent(evt);
    }
    
    if (this.onTickCallback) this.onTickCallback(this.currentTick, this.status);
  }
}

export const simulationEngine = new UrbanEyeSimulationEngine();
