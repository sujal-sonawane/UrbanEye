/**
 * URBANEYE — Pune Traffic Hotspots (Demo Intelligence)
 * 
 * SCOPE: Pune Municipal Corporation (PMC) city road network.
 * Explicitly DEMO / illustrative data representing peak transit corridors.
 * Strictly free of Bangalore or non-Pune locations.
 */

export interface PuneTrafficHotspot {
  id: string;
  location_name: string;
  corridor_name: string;
  congestion_level: 'MODERATE' | 'HEAVY' | 'SEVERE';
  average_speed_kmh: number;
  active_bottlenecks: number;
  description: string;
}

export const PUNE_DEMO_TRAFFIC_HOTSPOTS: PuneTrafficHotspot[] = [
  {
    id: 'PUNE-TRF-01',
    location_name: 'Swargate Chowk — Jedhe Flyover Axis',
    corridor_name: 'Route 103 / 118 / 201 Swargate Interchange',
    congestion_level: 'SEVERE',
    average_speed_kmh: 11.2,
    active_bottlenecks: 2,
    description: 'Heavy transit queue on Satara Road approach towards Jedhe Flyover underpass.',
  },
  {
    id: 'PUNE-TRF-02',
    location_name: 'Pune Station — Sassoon Hospital Chowk',
    corridor_name: 'Route 148 / 98 Pune Station Corridor',
    congestion_level: 'HEAVY',
    average_speed_kmh: 13.8,
    active_bottlenecks: 1,
    description: 'High vehicular density around Station Circle and Dr. Ambedkar Road merge.',
  },
  {
    id: 'PUNE-TRF-03',
    location_name: 'University Road — Bremen Chowk (Aundh)',
    corridor_name: 'Route 148 Ganeshkhind Corridor',
    congestion_level: 'MODERATE',
    average_speed_kmh: 17.5,
    active_bottlenecks: 1,
    description: 'Slow-moving commuter traffic along Pune University - Aundh corridor.',
  },
];

export const PUNE_DEMO_HOTSPOTS_SUMMARY = {
  totalHotspots: PUNE_DEMO_TRAFFIC_HOTSPOTS.length,
  averageSpeedKmh: 14.2,
  leadingCongestionArea: 'Swargate & Pune Station',
  tag: 'TRAFFIC AI — DEMO',
};
