# DEMO_SCENARIO.md — URBANEYE Judge Demonstration Flow (SIH 2026)

## 1. Demo Objectives
Demonstrate to Smart India Hackathon judges how URBANEYE creates an automated, self-healing urban surveillance infrastructure using existing bus fleets at a fraction of static IoT sensor costs.

---

## 2. 5-Act Demonstration Walkthrough

### Act 1: The Command Center Overview (00:00 – 01:30)
1. **Initial State**: Show the city operations dashboard loaded with real-time stats:
   - Active Bus Fleet: `142 Buses online`
   - Road Hazards Detected (24h): `38 Incidents`
   - Verified / Multi-Bus Corroborated: `29 Incidents`
   - High Congestion Corridors: `4 Areas`
2. **Key Talking Point**: "Instead of municipal authorities waiting for citizen complaints or sending manual road inspection vehicles, URBANEYE turns daily bus transit into continuous automated road auditing."

### Act 2: Multi-Bus Corroboration in Action (01:30 – 03:00)
1. **Simulation Ingestion**: Trigger the demo simulator.
2. **Step 1**: Bus `KA-01-FA-1204` on Route `335-E` passes Old Airport Road and detects a deep pothole (`Confidence: 0.88`, Status: `PENDING`).
3. **Step 2**: 12 minutes later, Bus `KA-57-F-3312` passes the exact same coordinate ($12.9602^\circ\text{N}, 77.6485^\circ\text{E}$).
4. **Step 3**: The system automatically groups the detections, updates `Corroboration Count = 2`, elevates the confidence to `96%`, and fires a high-priority sound/visual alert in the **Alert Center**.
5. **Key Talking Point**: "Single camera false-alarms are eliminated through multi-bus spatial clustering."

### Act 3: Live GIS Geospatial Intelligence (03:00 – 04:30)
1. Navigate to **Live GIS**.
2. Show interactive map layers:
   - Potholes layer (Red / Orange markers)
   - Waterlogging heat zones (Cyan / Blue flood polygons)
   - Damaged road signs (Yellow warning triangles)
   - Live Bus GPS breadcrumbs (Moving bus nodes with telemetry popups)
3. Filter by Ward: Select "PMC Ward 09 - Shivajinagar" to see localized road health score.

### Act 4: Traffic Density & Bottleneck Analytics (04:30 – 05:45)
1. Navigate to **Traffic Analytics**.
2. Inspect vehicle classification breakdown (Cars vs Bikes vs Buses vs Commercial).
3. Inspect edge camera vehicle counting and corridor monitoring across Pune Priority Corridors (Route 201 Alandi ↔ Swargate).

### Act 5: Authority Action & Ticketing (05:45 – 07:00)
1. Navigate to **Alert Center** or click an event in **Road Intelligence**.
2. Open the **Event Drawer** to inspect:
   - AI camera snapshot with detected hazard bounding box
   - GPS coordinate & timestamp
   - Estimated dimensions ($85\text{cm} \times 60\text{cm} \times 14\text{cm}$)
3. Click **"Dispatch PWD Work Order"**:
   - Generates municipal work ticket #PWD-2026-9041 with pre-filled priority score ($92.5$) and GPS navigation coordinates for the repair crew.
   - Status updates to `DISPATCHED`.
