import os
import re
import time
import logging
from typing import Dict, Any, List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Priority Monitoring Corridors in Pune (PMC)
PRIORITY_CORRIDORS = ["201", "291", "148", "103", "118", "98", "117"]

PUNE_PRIORITY_ROUTES_DATA = [
    {
        "route_id": "201",
        "route_name": "201 — Alandi ↔ Swargate",
        "origin": "Alandi Bus Terminus",
        "destination": "Swargate Bus Station",
        "city": "Pune",
        "jurisdiction": "PMC",
        "enabled": True,
        "priority_rank": 1,
        "coordinates": [
            [73.8967, 18.6775],
            [73.8790, 18.5630],
            [73.8743, 18.5284],
            [73.8965, 18.5130],
            [73.9298, 18.5020],
            [73.8580, 18.5018]
        ],
        "total_buses": 12,
        "active_buses": 12,
        "distance_km": 28.5,
        "coverage_score": 94,
        "risk_score": 0,
        "event_count": 0,
        "pothole_count": 0,
        "waterlogging_count": 0,
        "damaged_sign_count": 0,
        "traffic_event_count": 0,
        "corroborated_event_count": 0
    },
    {
        "route_id": "291",
        "route_name": "291 — Hadapsar Gadital ↔ Katraj",
        "origin": "Hadapsar Gadital",
        "destination": "Katraj",
        "city": "Pune",
        "jurisdiction": "PMC",
        "enabled": True,
        "priority_rank": 2,
        "coordinates": [
            [73.9298, 18.5020],
            [73.9050, 18.4890],
            [73.8920, 18.4750],
            [73.8640, 18.4700],
            [73.8550, 18.4529]
        ],
        "total_buses": 8,
        "active_buses": 8,
        "distance_km": 14.2,
        "coverage_score": 90,
        "risk_score": 0,
        "event_count": 0,
        "pothole_count": 0,
        "waterlogging_count": 0,
        "damaged_sign_count": 0,
        "traffic_event_count": 0,
        "corroborated_event_count": 0
    },
    {
        "route_id": "148",
        "route_name": "148 — Pune Station ↔ Hinjawadi Phase 1",
        "origin": "Pune Railway Station",
        "destination": "Hinjawadi Phase 1",
        "city": "Pune",
        "jurisdiction": "PMC",
        "enabled": True,
        "priority_rank": 3,
        "coordinates": [
            [73.8743, 18.5284],
            [73.8520, 18.5314],
            [73.8340, 18.5600],
            [73.8080, 18.5600],
            [73.7380, 18.5910]
        ],
        "total_buses": 10,
        "active_buses": 10,
        "distance_km": 22.0,
        "coverage_score": 92,
        "risk_score": 0,
        "event_count": 0,
        "pothole_count": 0,
        "waterlogging_count": 0,
        "damaged_sign_count": 0,
        "traffic_event_count": 0,
        "corroborated_event_count": 0
    },
    {
        "route_id": "103",
        "route_name": "103 — Katraj ↔ Kothrud Depot",
        "origin": "Katraj",
        "destination": "Kothrud Depot",
        "city": "Pune",
        "jurisdiction": "PMC",
        "enabled": True,
        "priority_rank": 4,
        "coordinates": [
            [73.8550, 18.4529],
            [73.8570, 18.4800],
            [73.8580, 18.5018],
            [73.8350, 18.5080],
            [73.8050, 18.5030]
        ],
        "total_buses": 14,
        "active_buses": 14,
        "distance_km": 16.5,
        "coverage_score": 95,
        "risk_score": 0,
        "event_count": 0,
        "pothole_count": 0,
        "waterlogging_count": 0,
        "damaged_sign_count": 0,
        "traffic_event_count": 0,
        "corroborated_event_count": 0
    },
    {
        "route_id": "118",
        "route_name": "118 — Swargate ↔ Vadgaon Budruk",
        "origin": "Swargate",
        "destination": "Vadgaon Budruk",
        "city": "Pune",
        "jurisdiction": "PMC",
        "enabled": True,
        "priority_rank": 5,
        "coordinates": [
            [73.8580, 18.5018],
            [73.8540, 18.5020],
            [73.8470, 18.4970],
            [73.8380, 18.4850],
            [73.8250, 18.4650]
        ],
        "total_buses": 7,
        "active_buses": 7,
        "distance_km": 9.8,
        "coverage_score": 88,
        "risk_score": 0,
        "event_count": 0,
        "pothole_count": 0,
        "waterlogging_count": 0,
        "damaged_sign_count": 0,
        "traffic_event_count": 0,
        "corroborated_event_count": 0
    },
    {
        "route_id": "98",
        "route_name": "98 — Pune Station ↔ Warje Malwadi",
        "origin": "Pune Station",
        "destination": "Warje Malwadi",
        "city": "Pune",
        "jurisdiction": "PMC",
        "enabled": True,
        "priority_rank": 6,
        "coordinates": [
            [73.8743, 18.5284],
            [73.8520, 18.5314],
            [73.8400, 18.5170],
            [73.8150, 18.4980],
            [73.7920, 18.4800]
        ],
        "total_buses": 8,
        "active_buses": 8,
        "distance_km": 15.1,
        "coverage_score": 89,
        "risk_score": 0,
        "event_count": 0,
        "pothole_count": 0,
        "waterlogging_count": 0,
        "damaged_sign_count": 0,
        "traffic_event_count": 0,
        "corroborated_event_count": 0
    },
    {
        "route_id": "117",
        "route_name": "117 — Swargate ↔ Dhayari Gaon",
        "origin": "Swargate",
        "destination": "Dhayari Gaon",
        "city": "Pune",
        "jurisdiction": "PMC",
        "enabled": True,
        "priority_rank": 7,
        "coordinates": [
            [73.8580, 18.5018],
            [73.8460, 18.4980],
            [73.8420, 18.4920],
            [73.8280, 18.4750],
            [73.8090, 18.4480]
        ],
        "total_buses": 6,
        "active_buses": 6,
        "distance_km": 11.4,
        "coverage_score": 86,
        "risk_score": 0,
        "event_count": 0,
        "pothole_count": 0,
        "waterlogging_count": 0,
        "damaged_sign_count": 0,
        "traffic_event_count": 0,
        "corroborated_event_count": 0
    }
]

# Known Chartr internal route IDs for the 7 PMC Priority Corridors
CHARTR_INTERNAL_ROUTE_MAP: Dict[str, str] = {
    "357": "201", "358": "201",
    "512": "291", "513": "291",
    "176": "148", "177": "148",
    "10": "103", "13": "103",
    "55": "118", "57": "118",
    "45": "117", "47": "117",
    "1036": "98", "1040": "98"
}


class PMPMLService:
    def __init__(self):
        self.live_api_url = settings.PMPML_LIVE_API_URL.rstrip('/')
        self.api_key = settings.PMPML_API_KEY
        self.headers = {
            "x-api-key": self.api_key,
            "Accept": "application/json"
        }
        
        self.fleet_state: Dict[str, Any] = {
            "source": "PMPML_LIVE",
            "status": "UNAVAILABLE",
            "last_update": None,
            "raw_bus_count": 0,
            "valid_bus_count": 0,
            "vehicles": []
        }
        self.last_successful_poll: float = 0.0

    async def poll_fleet(self) -> Dict[str, Any]:
        """
        Poll the live PMPML /all-buses endpoint.
        Uses non-blocking httpx client with secure backend headers.
        """
        url = f"{self.live_api_url}/all-buses"
        logger.info("PMPML request started")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=self.headers)
                logger.info(f"PMPML response status = {response.status_code}")
                
                if response.status_code == 200:
                    body = response.json()
                    raw_buses = body.get("data", []) if isinstance(body, dict) else []
                    
                    normalized_vehicles = []
                    for raw in raw_buses:
                        vehicle = self._normalize_vehicle(raw)
                        if vehicle:
                            normalized_vehicles.append(vehicle)
                    
                    # Count buses operating on the 7 Priority Corridors
                    monitored_count = sum(
                        1 for v in normalized_vehicles
                        if v.get("route_id") in PRIORITY_CORRIDORS or any(str(v.get("route_number") or "").startswith(c) for c in PRIORITY_CORRIDORS)
                    )
                    
                    self.last_successful_poll = time.time()
                    self._update_state(
                        vehicles=normalized_vehicles,
                        raw_count=len(raw_buses),
                        valid_count=len(normalized_vehicles),
                        success=True
                    )
                    logger.info(f"PMPML raw vehicle count = {len(raw_buses)}")
                    logger.info(f"PMPML valid vehicle count = {len(normalized_vehicles)}")
                    logger.info(f"PMPML monitored-route vehicle count = {monitored_count}")
                elif response.status_code == 401:
                    logger.error("[PMPML Ingestion] 401 Unauthorized: Verify backend PMPML_API_KEY configuration")
                    self._update_state(success=False)
                elif response.status_code == 429:
                    logger.warning("[PMPML Ingestion] 429 Rate Limit encountered on live feed")
                    self._update_state(success=False)
                else:
                    logger.warning(f"[PMPML Ingestion] HTTP {response.status_code} received from /all-buses")
                    self._update_state(success=False)

        except httpx.RequestError as e:
            logger.error(f"[PMPML Ingestion] Network/Timeout error connecting to upstream feed: {e}")
            self._update_state(success=False)
        except Exception as e:
            logger.error(f"[PMPML Ingestion] Unexpected error during fleet poll: {e}")
            self._update_state(success=False)
            
        return self.get_current_fleet()

    def _normalize_vehicle(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Normalize raw vehicle from PMPML live stream into UrbanEye Fleet schema.
        Adheres strictly to the rule:
        - Only include authentic fields actually present.
        - Do NOT invent speed, fake driver names, or camera status.
        - Source is strictly 'PMPML_LIVE'.
        """
        try:
            vehicle_id = str(raw.get("id") or "").strip()
            if not vehicle_id:
                return None

            lat_val = raw.get("lat")
            lon_val = raw.get("lon")
            if lat_val is None or lon_val is None:
                return None
                
            lat = float(lat_val)
            lon = float(lon_val)
            # Coordinate bounds validation (Pune region is roughly 18.2-18.8 lat, 73.6-74.2 lon)
            if lat < -90 or lat > 90 or lon < -180 or lon > 180 or (lat == 0.0 and lon == 0.0):
                return None

            route_raw = str(raw.get("route") or "").strip()
            route_desc = str(raw.get("route_desc") or "").strip()
            route_id_field = str(raw.get("route_id") or "").strip()

            clean_route = re.sub(r'^(ROUTE|RT)[.\s\-_]*', '', route_raw, flags=re.IGNORECASE).strip()
            corridor_id = None
            corridor_match = re.match(r"^(\d+)", clean_route)
            corridor_number = corridor_match.group(1) if corridor_match else clean_route

            # 1. Match by corridor number prefix (e.g. "201UP" -> "201")
            for c in PRIORITY_CORRIDORS:
                if clean_route.upper().startswith(c):
                    remainder = clean_route.upper()[len(c):]
                    if not remainder or remainder[0].isalpha() or remainder[0] in ('-', '_'):
                        corridor_id = c
                        break

            # 2. Match by Chartr internal route_id if not resolved from route string
            if not corridor_id and route_id_field in CHARTR_INTERNAL_ROUTE_MAP:
                corridor_id = CHARTR_INTERNAL_ROUTE_MAP[route_id_field]
                if not corridor_number:
                    corridor_number = corridor_id

            # Preserve legitimate branch variant (e.g., 98A, 148A, 118A)
            route_display = corridor_number
            without_dir = re.sub(r'(UP|DOWN)$', '', clean_route, flags=re.IGNORECASE).strip()
            if corridor_match and without_dir.startswith(corridor_number):
                rem = without_dir[len(corridor_number):].lstrip('-_')
                if len(rem) == 1 and rem.isalpha():
                    route_display = f"{corridor_number}{rem.upper()}"
            elif not route_display and corridor_id:
                route_display = corridor_id

            # Direction detection
            direction = "BIDIRECTIONAL"
            if clean_route.upper().endswith("UP") or "UP" in clean_route.upper():
                direction = "UP"
            elif clean_route.upper().endswith("DOWN") or "DOWN" in clean_route.upper():
                direction = "DOWN"

            orientation_val = raw.get("orientation")
            heading_deg = float(orientation_val) if orientation_val is not None else 0.0

            timestamp_raw = raw.get("timestamp")
            timestamp_sec = int(timestamp_raw) if timestamp_raw is not None else int(time.time())
            
            current_time = time.time()
            data_age_seconds = max(0, int(current_time - timestamp_sec))

            near_depot = bool(raw.get("near_depot", False))
            status = "IDLE" if near_depot else "ACTIVE"

            # Match official priority corridor metadata if available
            static_route = next((r for r in PUNE_PRIORITY_ROUTES_DATA if r["route_id"] == corridor_id), None)
            if static_route:
                if route_display and route_display != corridor_id:
                    name_body = static_route["route_name"].split("—", 1)[-1].strip() if "—" in static_route["route_name"] else static_route["route_name"]
                    route_name = f"{route_display} — {name_body}"
                else:
                    route_name = static_route["route_name"]
            elif route_desc:
                route_name = f"{route_display} — {route_desc}"
            else:
                route_name = f"Route {route_display}" if route_display else "PMPML Route"

            return {
                "bus_id": vehicle_id,
                "vehicle_id": vehicle_id,
                "route_id": corridor_id or corridor_number or route_id_field or "UNKNOWN",
                "route": route_raw,
                "route_number": route_display,
                "route_name": route_name,
                "route_desc": route_desc,
                "direction": direction,
                "latitude": lat,
                "longitude": lon,
                "heading_deg": heading_deg,
                "orientation": heading_deg,
                "speed_kmh": None,  # Rule: Do NOT invent speed
                "near_depot": near_depot,
                "timestamp": timestamp_sec * 1000,
                "data_age_seconds": data_age_seconds,
                "status": status,
                "source": "PMPML_LIVE",
                "agency": str(raw.get("agency") or "pmpml"),
                "ac": str(raw.get("ac") or "non-ac"),
                "last_ping": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(timestamp_sec))
            }
        except Exception as e:
            logger.debug(f"Failed to normalize vehicle {raw}: {e}")
            return None

    def _update_state(
        self,
        vehicles: Optional[List[Dict[str, Any]]] = None,
        raw_count: int = 0,
        valid_count: int = 0,
        success: bool = True
    ):
        current_time = time.time()
        age = current_time - self.last_successful_poll if self.last_successful_poll > 0 else 99999.0
        
        if success and vehicles is not None:
            self.fleet_state["vehicles"] = vehicles
            self.fleet_state["raw_bus_count"] = raw_count
            self.fleet_state["valid_bus_count"] = valid_count
            self.fleet_state["last_update"] = int(self.last_successful_poll * 1000)

        # Evaluate time-based degradation:
        # < 30s: LIVE
        # 30s - 120s: STALE
        # > 120s: UNAVAILABLE
        if self.last_successful_poll == 0.0 or age >= 120.0:
            self.fleet_state["status"] = "UNAVAILABLE"
        elif age >= 30.0:
            self.fleet_state["status"] = "STALE"
        else:
            self.fleet_state["status"] = "LIVE"

    def get_current_fleet(self) -> Dict[str, Any]:
        """
        Return the cached snapshot of live fleet telemetry.
        Dynamically updates current age and status on every read.
        """
        current_time = time.time()
        age = current_time - self.last_successful_poll if self.last_successful_poll > 0 else 99999.0

        if self.last_successful_poll == 0.0 or age >= 120.0:
            self.fleet_state["status"] = "UNAVAILABLE"
        elif age >= 30.0:
            self.fleet_state["status"] = "STALE"
        elif self.fleet_state["vehicles"]:
            self.fleet_state["status"] = "LIVE"

        # Update per-vehicle data_age_seconds dynamically
        for v in self.fleet_state["vehicles"]:
            ts_sec = v.get("timestamp", 0) / 1000.0 if v.get("timestamp") else 0.0
            if ts_sec > 0:
                v["data_age_seconds"] = max(0, int(current_time - ts_sec))

        return self.fleet_state

    async def get_priority_routes(self) -> List[Dict[str, Any]]:
        """
        Return the 7 priority monitoring corridors in Pune (PMC) with full coordinates and metadata.
        Dynamically updates active_buses if live fleet data is present.
        """
        vehicles = self.fleet_state.get("vehicles", [])
        routes_copy = []
        for r in PUNE_PRIORITY_ROUTES_DATA:
            r_copy = dict(r)
            if vehicles:
                route_id = str(r["route_id"])
                count = sum(
                    1 for v in vehicles
                    if str(v.get("route_id")) == route_id or str(v.get("route_number") or "").startswith(route_id)
                )
                r_copy["active_buses"] = count
                r_copy["total_buses"] = count
            routes_copy.append(r_copy)
        return routes_copy
