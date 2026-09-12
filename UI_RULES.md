# UI_RULES.md — URBANEYE Visual & Design Guidelines

## 1. Design Philosophy: Professional City Operations Dashboard
URBANEYE must evoke the feel of a mission-critical municipal command center (similar to modern aerospace, traffic control rooms, and geospatial platforms like Palantir Foundry, NASA Mission Control, or high-end municipal ops centers).

- **Tone**: Professional, authoritative, data-dense, crisp, high-contrast, uncluttered.
- **Anti-Patterns**:
  - Do NOT design a neon-heavy video game dashboard.
  - Avoid excessive pulsating glow effects or rainbow gradients.
  - Avoid large empty spaces with toy-like UI widgets.
  - Avoid generic, uninformative placeholders.

---

## 2. Color Palette & Meaning-Based Semantics

| Semantic Purpose | Color Token | Hex / HSL | Usage |
| :--- | :--- | :--- | :--- |
| **Normal / Resolved** | `emerald-500` / `emerald-400` | `#10b981` | Healthy fleet, resolved tickets, normal traffic speed |
| **Attention / Info** | `blue-500` / `blue-400` | `#3b82f6` | Telemetry logs, bus connectivity, standard info |
| **Low / Moderate** | `amber-400` / `yellow-400` | `#f59e0b` | Pending review, moderate traffic density |
| **Warning / High** | `orange-500` / `orange-400` | `#f97316` | Damaged signage, heavy waterlogging |
| **Critical / Bottleneck** | `rose-500` / `red-500` | `#ef4444` | Structural potholes, traffic gridlock, emergency triage |
| **Background Dark** | `slate-950` / `zinc-950` | `#090d16` / `#020617` | Canvas background |
| **Surface Dark** | `slate-900` / `zinc-900` | `#0f172a` / `#18181b` | Cards, sidebars, modals |
| **Border Subtle** | `slate-800` / `zinc-800` | `#1e293b` / `#27272a` | Dividers, card outlines |
| **Text Primary** | `slate-100` / `zinc-100` | `#f1f5f9` / `#f4f4f5` | Headings, primary metrics |
| **Text Muted** | `slate-400` / `zinc-400` | `#94a3b8` / `#a1a1aa` | Labels, timestamps, secondary metadata |

---

## 3. Typography & Hierarchy
- **Primary Font Family**: Clean sans-serif (`Inter`, `Plus Jakarta Sans`, or `system-ui`).
- **Monospace Font Family**: `JetBrains Mono`, `Fira Code`, or `ui-monospace` for:
  - GPS coordinates (`12.9716° N, 77.5946° E`)
  - Timestamps (`14:32:00 UTC`)
  - Vehicle Registration Numbers (`KA-01-FA-1204`)
  - Event IDs (`EVT-2026-9041`)
  - Speed / Count metrics (`6.8 km/h`, `92.5%`)

---

## 4. Reusable Layout Principles
1. **App Shell**: Persistent left sidebar (collapsible for high-density GIS map views), top telemetry header with live clock and emergency filters.
2. **Cards**: Subtle `border border-slate-800 bg-slate-900/80 backdrop-blur-md rounded-lg p-4`.
3. **Badges**: Small pill tags with semantic text color and 15% opacity background (e.g. `bg-rose-500/15 text-rose-400 border border-rose-500/30`).
4. **GIS Viewports**: Map takes primary visual real-estate, with floating overlay controls (layer toggles, search, timeline slider).
