# EVENT_SCHEMA.md — URBANEYE Standard Event Specification

## 1. Overview
All AI detection models running on mobile bus hardware or edge processing nodes output a uniform JSON contract. This contract is consumed by the FastAPI backend, persisted in PostgreSQL + PostGIS, and broadcast to the URBANEYE frontend.

---

## 2. Base Event Schema

Every event MUST contain the following base fields:

```typescript
export type EventType = 'POTHOLE' | 'WATERLOGGING' | 'DAMAGED_SIGN' | 'TRAFFIC';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EventStatus = 'PENDING' | 'CORROBORATED' | 'DISPATCHED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface BaseUrbanEyeEvent {
  event_id: string;             // UUID or unique detection hash (e.g., "EVT-2026-8891")
  event_type: EventType;        // One of the 4 locked AI event types
  bus_id: string;               // Reporting bus vehicle ID (e.g., "KA-01-FA-1204")
  route_id: string;             // Bus route number (e.g., "335-E", "500-D")
  confidence: number;           // AI model prediction confidence (0.0 to 1.0)
  severity: SeverityLevel;      // Normalized severity level
  latitude: number;             // WGS84 decimal latitude
  longitude: number;            // WGS84 decimal longitude
  timestamp: string;            // ISO 8601 UTC timestamp (e.g., "2026-09-01T14:32:00Z")
  evidence_image: string;       // URL or base64 snapshot with bounding box
  evidence_clip?: string;       // Optional 5s dashcam video URL
  status: EventStatus;          // Workflow status
  
  // Platform Enrichment Fields
  ward_id?: string;             // Administrative ward number / name
  corroboration_count?: number; // Number of unique buses reporting same hazard
  priority_score?: number;      // Calculated urgency index (0 - 100)
  estimated_dimensions?: {
    length_cm?: number;
    width_cm?: number;
    depth_cm?: number;
    area_sqm?: number;
  };
}
```

---

## 3. Domain-Specific Telemetry Schemas

### A. Traffic Event (`TRAFFIC`)
In addition to base fields, `TRAFFIC` events include traffic density metrics:
```typescript
export interface TrafficEventDetails {
  vehicle_count: number;        // Total vehicles in camera frame / field of view
  cars: number;                 // Number of passenger cars
  bikes: number;                // Number of two-wheelers / motorcycles
  buses: number;                // Number of buses / heavy transit
  trucks: number;               // Number of commercial trucks / freight
  average_speed: number;        // Estimated average traffic flow speed in km/h
  density: 'LOW' | 'MODERATE' | 'HEAVY' | 'GRIDLOCK';
  congestion_score: number;     // Normalized congestion percentage (0.0 to 100.0)
  bottleneck_reason?: string;   // Optional AI inference (e.g. "Illegal Parking", "Road Work")
}
```

### B. Road Hazard Events (`POTHOLE`, `WATERLOGGING`, `DAMAGED_SIGN`)
```typescript
export interface HazardEventDetails {
  hazard_subtype?: string;      // e.g. "Deep Pothole", "Pavement Crack", "Submerged Lane", "Bent Speed Sign"
  lane_affected?: 'LEFT' | 'CENTER' | 'RIGHT' | 'FULL_ROAD';
  water_depth_level?: 'SHALLOW' | 'MODERATE' | 'DEEP_HAZARD';
  sign_damage_type?: 'OCCLUDED' | 'BENT' | 'GRAFFITI' | 'MISSING';
}
```

---

## 4. Sample JSON Payloads

### Sample 1: Corroborated Pothole Incident
```json
{
  "event_id": "EVT-2026-9041",
  "event_type": "POTHOLE",
  "bus_id": "MH-12-RN-3312",
  "route_id": "201",
  "confidence": 0.94,
  "severity": "CRITICAL",
  "latitude": 18.5284,
  "longitude": 73.8743,
  "timestamp": "2026-09-01T14:32:00Z",
  "evidence_image": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
  "evidence_clip": "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
  "status": "CORROBORATED",
  "ward_id": "PMC Ward 09 - Shivajinagar",
  "corroboration_count": 4,
  "priority_score": 92.5,
  "estimated_dimensions": {
    "length_cm": 85,
    "width_cm": 60,
    "depth_cm": 14
  },
  "hazard_details": {
    "hazard_subtype": "Deep Structural Pothole",
    "lane_affected": "CENTER"
  }
}
```

### Sample 2: Traffic Flow & Congestion Event
```json
{
  "event_id": "TRF-2026-1082",
  "event_type": "TRAFFIC",
  "bus_id": "MH-12-EQ-8890",
  "route_id": "201",
  "confidence": 0.98,
  "severity": "HIGH",
  "latitude": 18.5018,
  "longitude": 73.8580,
  "timestamp": "2026-09-01T14:34:10Z",
  "evidence_image": "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&auto=format&fit=crop&q=60",
  "status": "PENDING",
  "ward_id": "PMC Ward 19 - Swargate",
  "priority_score": 88.0,
  "traffic_details": {
    "vehicle_count": 78,
    "cars": 42,
    "bikes": 28,
    "buses": 5,
    "trucks": 3,
    "average_speed": 12.5,
    "density": "GRIDLOCK",
    "congestion_score": 94.2,
    "bottleneck_reason": "Narrowed Lane & Peak Transit Flow"
  }
}
```
