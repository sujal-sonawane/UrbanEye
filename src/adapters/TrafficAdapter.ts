import { UrbanEyeEvent, SeverityLevel, DensityLevel } from '../types/events';
import { AIModelAdapter, EdgeContext } from './types';
import { YoloTrafficFrame } from '../services/yoloTrafficStreamData';

export class MockTrafficAdapter implements AIModelAdapter {
  name = 'YOLO-Traffic-Density-Estimator';
  isMock = false;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DEMO' = 'ONLINE';

  /**
   * Normalize continuous YOLO frame detection from teammate's model
   * Uses only genuine model output fields: cars, bikes, buses, trucks, total_vehicles, density
   */
  public normalizeYoloFrame(frame: YoloTrafficFrame, timestamp?: string): UrbanEyeEvent {
    const densityMap: Record<string, DensityLevel> = {
      'LOW': 'LOW',
      'MEDIUM': 'MODERATE',
      'HEAVY': 'HEAVY'
    };

    return {
      event_id: `TRF-LIVE-${frame.frame_index}-${Date.now()}`,
      event_type: 'TRAFFIC',
      bus_id: 'CAM-EDGE-01',
      route_id: 'UNASSIGNED',
      confidence: frame.confidence,
      severity: frame.severity as SeverityLevel,
      latitude: 0,
      longitude: 0,
      timestamp: timestamp || new Date().toISOString(),
      location_name: 'Camera Traffic Analysis — Location Unspecified',
      status: 'PENDING',
      corroboration_count: 1,
      priority_score: Math.round(frame.density_score),
      source: 'URBANEYE_CAMERA_LIVE',
      assigned_department: 'TRAFFIC_POLICE',
      evidence_image: '/traffic_density_output.mp4',
      traffic_details: {
        vehicle_count: frame.total_vehicles,
        cars: frame.cars,
        bikes: frame.bikes,
        buses: frame.buses,
        trucks: frame.trucks,
        average_speed: 0, // Rule: Do not invent speed if unavailable
        density: densityMap[frame.traffic_state] || 'MODERATE',
        congestion_score: frame.density_score,
        bottleneck_reason: `Live Camera Edge Detection (${frame.total_vehicles} vehicles in view)`,
      }
    };
  }

  public processInference(rawInput: any, context: EdgeContext): Partial<UrbanEyeEvent> | null {
    if (!rawInput) return null;

    let conf = Number(rawInput.confidence || 0.90);
    if (conf > 1.0) conf = conf / 100.0;
    conf = Math.max(0.0, Math.min(1.0, conf));

    let severity: SeverityLevel = 'MEDIUM';
    const congestionScore = Number(rawInput.congestion_score || 50);
    
    if (rawInput.severity) {
      severity = String(rawInput.severity).toUpperCase() as SeverityLevel;
    } else {
      severity = congestionScore > 90 ? 'CRITICAL' : congestionScore > 75 ? 'HIGH' : 'MEDIUM';
    }

    return {
      event_id: `EVT-TRAFFIC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_type: 'TRAFFIC',
      bus_id: context.bus_id,
      route_id: context.route_id,
      latitude: context.latitude,
      longitude: context.longitude,
      timestamp: context.timestamp,
      ward_id: context.ward_id,
      ward_name: context.ward_name,
      location_name: context.location_name || 'Camera Traffic Analysis — Location Unspecified',
      confidence: conf,
      severity,
      source: 'URBANEYE_CAMERA_LIVE',
      evidence_image: rawInput.image_url || '/traffic_density_output.mp4',
      traffic_details: {
        vehicle_count: rawInput.vehicle_count || 0,
        cars: rawInput.cars || 0,
        bikes: rawInput.bikes || 0,
        buses: rawInput.buses || 0,
        trucks: rawInput.trucks || 0,
        average_speed: rawInput.average_speed || 0,
        density: rawInput.density || (congestionScore > 85 ? 'HEAVY' : 'MODERATE'),
        congestion_score: congestionScore,
        bottleneck_reason: rawInput.bottleneck_reason || 'Live camera traffic analysis',
      }
    };
  }
}

export const trafficAdapter = new MockTrafficAdapter();

