import { UrbanEyeEvent } from '../types/events';

export interface EdgeContext {
  bus_id: string;
  route_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  ward_id?: string;
  ward_name?: string;
  location_name?: string;
}

export interface AIModelAdapter {
  name: string;
  isMock: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DEMO';
  
  /**
   * Processes a raw inference payload from an AI model and merges it with Edge Context 
   * to produce a payload ready for the final UrbanEyeEvent normalizer.
   */
  processInference(rawInput: any, context: EdgeContext): Partial<UrbanEyeEvent> | null;
}
