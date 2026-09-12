# AGENTS.md — URBANEYE Engineering & AI Agent Rules

## Project Overview
- **Project**: URBANEYE (Smart India Hackathon 2026 - PS ID: 26124)
- **Title**: AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet
- **Category**: Software | Smart Automation
- **Core Principle**: Software-first centralized urban intelligence platform consuming video/GPS feeds from city bus fleets to detect road hazards and traffic congestion.

---

## 1. Locked System Architecture
Every AI agent or developer working on this repository must adhere to the standard locked pipeline:
```
AI MODELS (Edge / Cloud inference)
    ↓
STANDARD EVENT JSON (Uniform schema)
    ↓
FASTAPI BACKEND (REST Ingestion & Query APIs)
    ↓
REST + WEBSOCKET (Live stream & historical telemetry)
    ↓
POSTGRESQL + POSTGIS (Spatio-temporal indexing)
    ↓
URBANEYE FRONTEND (React + TS + Vite + MapLibre + Recharts + Zustand)
    ├── Command Center
    ├── Live GIS
    ├── Traffic Analytics
    ├── Road Intelligence
    ├── Alert Center
    └── Fleet
    ↓
AUTHORITY ACTION (Municipal ticketing, road repair dispatch, traffic control)
```

---

## 2. Locked Tech Stack & Tools
- **Frontend Core**: React 18+, TypeScript, Vite
- **Styling**: Tailwind CSS (Dark operational theme), `clsx`, `tailwind-merge`
- **Component UI**: Custom shadcn/ui-inspired primitives (accessible, dark-first, clean borders)
- **State Management**: Zustand (Clean, minimal, isolated stores)
- **GIS Mapping**: MapLibre GL JS (Vector / raster layers, heatmaps, geo-clustered markers)
- **Data Visualizations**: Recharts (Congestion metrics, vehicle classification, hourly speeds)
- **Icons**: Lucide React (`lucide-react`)

---

## 3. Strict Development Rules

### Rule 1: No Direct AI Model Coupling
- Do NOT run Python AI model inference directly inside frontend components.
- Frontend must strictly consume standard event payloads defined in [`EVENT_SCHEMA.md`](file:///c:/UrbanEye/EVENT_SCHEMA.md) via REST or WebSocket services.

### Rule 2: Service Isolation
- Keep API endpoints and WebSocket listeners strictly encapsulated in `src/services/api.ts` and `src/services/websocket.ts`.
- Visual components must never make raw `fetch` calls or manage raw WebSocket sockets directly. Always consume via Zustand stores or typed service hooks.

### Rule 3: Single Uniform Event Contract
- All 4 locked AI event types (`POTHOLE`, `WATERLOGGING`, `DAMAGED_SIGN`, `TRAFFIC`) must adhere to the base `UrbanEyeEvent` schema.
- Do not create disparate incompatible JSON schemas for different hazard detectors.

### Rule 4: Single State Management System
- Use Zustand exclusively for global and cross-page state.
- Do not introduce Redux, MobX, Context hell, or duplicate state machines.

### Rule 5: Design Philosophy — Dark City Operations Aesthetic
- Follow the guidelines in [`UI_RULES.md`](file:///c:/UrbanEye/UI_RULES.md).
- Do NOT build a flashy gaming UI with excessive neons or heavy animations.
- Use restrained operational dashboard styling with high information density, crisp typography, and semantic status color indicators:
  - `Green`: Normal / Resolved / Healthy
  - `Yellow`: Attention / Low Priority
  - `Orange`: Warning / Moderate Severity
  - `Red`: Critical / High Priority / Bottleneck
  - `Blue`: Information / Fleet Telemetry / Verified

---

## 4. Key Differentiators to Maintain
1. **Multi-Bus Corroboration**: Cross-verifying alerts across different bus detections within space/time windows to eliminate false positives.
2. **Priority / Action Scoring**: Computing urgency scores (0–100) based on severity, traffic density, route criticality, and corroboration count.
3. **GIS-First Command View**: Real-time spatial tracking of road defects and traffic conditions.
4. **Demo / Simulation Mode**: Built-in mock event streaming allowing full operational demonstration without requiring live bus feeds.
