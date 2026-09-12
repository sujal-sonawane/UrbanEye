import { UrbanEyeEvent, SeverityLevel } from '../types/events';
import { AIModelAdapter, EdgeContext } from './types';

export class MockPotholeAdapter implements AIModelAdapter {
  name = 'Pothole-Detector';
  isMock = true;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DEMO' = 'DEMO';

  public processInference(rawInput: any, context: EdgeContext): Partial<UrbanEyeEvent> | null {
    if (!rawInput) return null;

    // Normalizing model's specific confidence structure (e.g. 0-100 to 0.0-1.0)
    let conf = Number(rawInput.confidence || rawInput.conf || 0.85);
    if (conf > 1.0) conf = conf / 100.0;
    conf = Math.max(0.0, Math.min(1.0, conf));

    // Fallback logic for severity if model does not provide it explicitly
    let severity: SeverityLevel = 'MEDIUM';
    if (rawInput.severity) {
      severity = String(rawInput.severity).toUpperCase() as SeverityLevel;
    } else {
      severity = conf > 0.9 ? 'HIGH' : conf > 0.75 ? 'MEDIUM' : 'LOW';
    }

    return {
      event_id: `EVT-POTHOLE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_type: 'POTHOLE',
      bus_id: context.bus_id,
      route_id: context.route_id,
      latitude: context.latitude,
      longitude: context.longitude,
      timestamp: context.timestamp,
      ward_id: context.ward_id,
      ward_name: context.ward_name,
      location_name: context.location_name,
      confidence: conf,
      severity,
      evidence_image: rawInput.image_url || '/evidence/pothole.jpg',
      estimated_dimensions: rawInput.dimensions || {
        length_cm: Math.floor(Math.random() * 60 + 30),
        width_cm: Math.floor(Math.random() * 50 + 25),
        depth_cm: Math.floor(Math.random() * 15 + 5),
        area_sqm: 0.35,
      },
    };
  }
}
