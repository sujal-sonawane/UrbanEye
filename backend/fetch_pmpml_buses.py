import os
import json
import time
from typing import Dict, Any, List
import httpx
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

LIVE_API_URL = os.getenv("PMPML_LIVE_API_URL", "https://prod-pmpml-live-data-api.chartr.in").rstrip('/')
API_KEY = os.getenv("PMPML_API_KEY", "")

# Pune Priority Monitoring Corridors
PRIORITY_CORRIDORS = ["201", "291", "148", "103", "118", "98", "117"]

def fetch_live_pmpml_buses() -> Dict[str, Any]:
    url = f"{LIVE_API_URL}/all-buses"
    headers = {
        "x-api-key": API_KEY,
        "Accept": "application/json"
    }
    
    print(f"[*] Fetching live PMPML fleet data from: {url}")
    start_time = time.time()
    
    with httpx.Client(timeout=20.0) as client:
        response = client.get(url, headers=headers)
        elapsed = time.time() - start_time
        
        print(f"[*] HTTP Status: {response.status_code} ({elapsed:.2f}s)")
        
        if response.status_code != 200:
            print(f"[!] Request failed with status {response.status_code}: {response.text[:300]}")
            return {"error": f"HTTP {response.status_code}", "raw_response": response.text[:500]}
            
        payload = response.json()
        raw_buses: List[Dict[str, Any]] = payload.get("data", [])
        print(f"[*] Successfully retrieved {len(raw_buses)} raw bus records.")
        
        # Save raw dump
        output_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(output_dir, exist_ok=True)
        raw_file = os.path.join(output_dir, "pmpml_live_buses_raw.json")
        with open(raw_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"[+] Raw payload saved to: {raw_file}")
        
        # Parse and analyze
        normalized_buses = []
        ac_count = 0
        nac_count = 0
        active_count = 0
        idle_depot_count = 0
        route_distribution: Dict[str, int] = {}
        priority_corridor_counts: Dict[str, int] = {c: 0 for c in PRIORITY_CORRIDORS}
        
        for bus in raw_buses:
            bus_id = bus.get("id") or ""
            lat_str = bus.get("lat")
            lon_str = bus.get("lon")
            if not bus_id or lat_str is None or lon_str is None:
                continue
                
            try:
                lat = float(lat_str)
                lon = float(lon_str)
            except (ValueError, TypeError):
                continue
                
            # Filter unrealistic coordinates
            if not (18.0 <= lat <= 19.5 and 73.0 <= lon <= 74.5):
                continue
                
            ac_type = bus.get("ac", "nac")
            if ac_type == "ac":
                ac_count += 1
            else:
                nac_count += 1
                
            near_depot = bool(bus.get("near_depot", False))
            if near_depot:
                idle_depot_count += 1
            else:
                active_count += 1
                
            route = bus.get("route") or ""
            route_desc = bus.get("route_desc") or ""
            
            # Match corridor
            for corridor in PRIORITY_CORRIDORS:
                if route.startswith(corridor):
                    priority_corridor_counts[corridor] += 1
                    
            if route:
                route_distribution[route] = route_distribution.get(route, 0) + 1
                
            normalized_buses.append({
                "bus_id": bus_id,
                "vehicle_id": bus_id,
                "latitude": lat,
                "longitude": lon,
                "route": route,
                "route_desc": route_desc,
                "ac": ac_type,
                "near_depot": near_depot,
                "status": "IDLE" if near_depot else "ACTIVE",
                "orientation": bus.get("orientation", 0.0),
                "timestamp": bus.get("timestamp"),
                "source": "PMPML_LIVE"
            })
            
        norm_file = os.path.join(output_dir, "pmpml_live_buses_normalized.json")
        summary_payload = {
            "fetch_timestamp": int(time.time()),
            "status": "LIVE",
            "total_raw": len(raw_buses),
            "total_valid_pune": len(normalized_buses),
            "active_buses": active_count,
            "idle_depot_buses": idle_depot_count,
            "ac_buses": ac_count,
            "non_ac_buses": nac_count,
            "priority_corridors": priority_corridor_counts,
            "sample_buses": normalized_buses[:5],
            "vehicles": normalized_buses
        }
        with open(norm_file, "w", encoding="utf-8") as f:
            json.dump(summary_payload, f, indent=2)
        print(f"[+] Normalized fleet ({len(normalized_buses)} buses) saved to: {norm_file}")
        
        # Print summary report
        print("\n" + "=" * 60)
        print(" URBANEYE: PMPML LIVE FLEET INGESTION REPORT")
        print("=" * 60)
        print(f"  * Total Raw Buses:          {len(raw_buses)}")
        print(f"  * Valid Pune Geofence:      {len(normalized_buses)}")
        print(f"  * Active on Route:          {active_count}")
        print(f"  * Idle / Near Depot:        {idle_depot_count}")
        print(f"  * AC Buses:                 {ac_count}")
        print(f"  * Non-AC Buses:             {nac_count}")
        print("-" * 60)
        print("  PRIORITY MONITORING CORRIDORS COVERAGE:")
        for corridor, count in sorted(priority_corridor_counts.items(), key=lambda x: -x[1]):
            print(f"    - Route {corridor:>3}: {count:>3} active buses")
        print("-" * 60)
        print("  TOP 5 ACTIVE ROUTES IN CITY:")
        top_routes = sorted(route_distribution.items(), key=lambda x: -x[1])[:5]
        for r_name, r_cnt in top_routes:
            print(f"    - {r_name:>15}: {r_cnt} buses")
        print("=" * 60 + "\n")
        
        return summary_payload

if __name__ == "__main__":
    fetch_live_pmpml_buses()
