import { UrbanEyeEvent, SeverityLevel } from '../types/events';
import { AIModelAdapter, EdgeContext } from './types';

export class MockDamagedSignAdapter implements AIModelAdapter {
  name = 'Traffic-Sign-OCR-Detector';
  isMock = true;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DEMO' = 'DEMO';

  public processInference(rawInput: any, context: EdgeContext): Partial<UrbanEyeEvent> | null {
    if (!rawInput) return null;

    let conf = Number(rawInput.confidence || rawInput.conf || 0.85);
    if (conf > 1.0) conf = conf / 100.0;
    conf = Math.max(0.0, Math.min(1.0, conf));

    let severity: SeverityLevel = 'MEDIUM';
    if (rawInput.severity) {
      severity = String(rawInput.severity).toUpperCase() as SeverityLevel;
    } else {
      severity = conf > 0.9 ? 'HIGH' : conf > 0.75 ? 'MEDIUM' : 'LOW';
    }

    return {
      event_id: `EVT-SIGN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_type: 'DAMAGED_SIGN',
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
      evidence_image: rawInput.image_url || '/evidence/damaged_sign.jpg',
      hazard_details: {
        hazard_subtype: rawInput.sign_condition || (Math.random() > 0.5 ? 'Missing Stop Sign' : 'Bent Speed Limit Sign'),
      }
    };
  }
}
