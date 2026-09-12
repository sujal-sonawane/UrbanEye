import { UrbanEyeEvent, SeverityLevel } from '../types/events';
import { AIModelAdapter, EdgeContext } from './types';

export class MockWaterloggingAdapter implements AIModelAdapter {
  name = 'Waterlogging-Segmentation-UNet';
  isMock = true;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DEMO' = 'DEMO';

  public processInference(rawInput: any, context: EdgeContext): Partial<UrbanEyeEvent> | null {
    if (!rawInput) return null;

    let conf = Number(rawInput.confidence || rawInput.flood_score || 0.85);
    if (conf > 1.0) conf = conf / 100.0;
    conf = Math.max(0.0, Math.min(1.0, conf));

    // Normalize severity based on depth if provided, else rely on confidence
    let severity: SeverityLevel = 'MEDIUM';
    const depth = Number(rawInput.water_depth_cm || Math.floor(Math.random() * 25 + 5));

    if (rawInput.severity) {
      severity = String(rawInput.severity).toUpperCase() as SeverityLevel;
    } else if (rawInput.water_depth_cm) {
      severity = depth > 30 ? 'CRITICAL' : depth > 15 ? 'HIGH' : 'MEDIUM';
    } else {
      severity = conf > 0.9 ? 'HIGH' : conf > 0.75 ? 'MEDIUM' : 'LOW';
    }

    return {
      event_id: `EVT-WATER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_type: 'WATERLOGGING',
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
      evidence_image: rawInput.image_url || '/evidence/waterlogging.jpg',
      hazard_details: {
        hazard_subtype: rawInput.subtype || 'Surface Flooding',
        water_depth_level: depth > 30 ? 'DEEP_HAZARD' : depth > 15 ? 'MODERATE' : 'SHALLOW',
      }
    };
  }
}
