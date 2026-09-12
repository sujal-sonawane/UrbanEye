import { useMemo } from 'react';
import { BusTelemetry } from '../types/events';
import { SEEDED_PUNE_PRIORITY_ROUTES } from '../services/puneRoutes';
import { useFleetStore } from '../store/useFleetStore';

/**
 * URBANEYE — PMPML Priority Route Matching & Normalization Utility
 * 
 * SCOPE: Pune Municipal Corporation (PMC) 7 Priority Corridors:
 *   - 201: Alandi ↔ Swargate
 *   - 291: Hadapsar ↔ Katraj
 *   - 148: Pune Station ↔ Hinjawadi (including 148A variants)
 *   - 103: Katraj ↔ Kothrud Depot
 *   - 118: Swargate ↔ Vadgaon Budruk
 *   - 98:  Pune Station ↔ Warje Malwadi (including 98A variants)
 *   - 117: Swargate ↔ Dhayari Gaon
 * 
 * Safely resolves live PMPML route strings (e.g. "201UP", "201DOWN", "148AUP", "98ADOWN")
 * to official PMC Priority Monitoring Corridor metadata.
 * 
 * Prevents false substring matches (e.g. Route "2010" or "1480" must NOT match "201" or "148").
 */

export const PUNE_PRIORITY_CORRIDOR_IDS = ['201', '291', '148', '103', '118', '98', '117'] as const;

export interface NormalizedRouteInfo {
  priorityRouteId: string;
  routeDisplay: string;
  routeName: string;
  direction?: 'UP' | 'DOWN' | 'BIDIRECTIONAL';
}

/**
 * Check if a raw bus route string matches a priority route ID.
 * Handles directional suffixes like "UP", "DOWN", separators, and legitimate branch suffixes ("148A", "98A").
 * Prevents numeric prefix false positives (e.g., "2010" does not match "201").
 */
export function matchesPriorityRoute(busRouteRaw: string | undefined | null, priorityRouteId: string): boolean {
  if (!busRouteRaw) return false;
  
  // Clean and normalize input
  let clean = busRouteRaw.trim().toUpperCase();
  const target = priorityRouteId.trim().toUpperCase();

  // Strip leading "ROUTE " or "RT " prefix if present
  clean = clean.replace(/^(ROUTE|RT)[.\s\-_]*/i, '').trim();

  // Exact match (e.g. "201" === "201")
  if (clean === target) return true;

  // Directional or branch suffix (e.g. "201UP", "201DOWN", "201-UP", "201_DOWN", "201A", "201B")
  if (clean.startsWith(target)) {
    const remainder = clean.slice(target.length);
    // If the next character is a letter or separator (not a digit), it is a genuine directional or branch variant
    if (/^[A-Z\-_]/.test(remainder) || remainder === '') {
      return true;
    }
  }

  return false;
}

/**
 * Resolves a bus telemetry record to its corresponding official Priority Corridor info.
 * Returns null if the bus is not operating on any of the 7 priority corridors.
 */
export function resolvePriorityRouteInfo(bus: BusTelemetry): NormalizedRouteInfo | null {
  const candidates = [
    bus.route,
    bus.route_number,
    bus.route_id,
    bus.route_name,
  ].filter(Boolean) as string[];

  for (const pid of PUNE_PRIORITY_CORRIDOR_IDS) {
    for (const rawCandidate of candidates) {
      if (matchesPriorityRoute(rawCandidate, pid)) {
        const clean = rawCandidate.trim().toUpperCase().replace(/^(ROUTE|RT)[.\s\-_]*/i, '').trim();
        
        // Extract direction if present
        let direction: 'UP' | 'DOWN' | 'BIDIRECTIONAL' = 'BIDIRECTIONAL';
        if (clean.includes('UP')) direction = 'UP';
        else if (clean.includes('DOWN')) direction = 'DOWN';

        // Preserve legitimate sub-branch identifiers (e.g. "148A", "98A", "118A")
        let routeDisplay: string = pid;
        const withoutDir = clean.replace(/(UP|DOWN)$/, '');
        if (withoutDir.length > pid.length && withoutDir.startsWith(pid)) {
          const suffix = withoutDir.slice(pid.length).replace(/^[-_]/, '');
          if (suffix.length === 1 && /^[A-Z]$/.test(suffix)) {
            routeDisplay = `${pid}${suffix}`;
          }
        }

        const staticMeta = SEEDED_PUNE_PRIORITY_ROUTES.find((r) => r.route_id === pid);
        const routeName = staticMeta ? staticMeta.route_name : `Route ${pid}`;

        return {
          priorityRouteId: pid,
          routeDisplay,
          routeName,
          direction,
        };
      }
    }
  }

  return null;
}

/**
 * Returns matching priority corridor ID for a bus, or null.
 */
export function getMatchingPriorityRouteId(
  bus: BusTelemetry,
  priorityRouteIds: string[] = [...PUNE_PRIORITY_CORRIDOR_IDS]
): string | null {
  const info = resolvePriorityRouteInfo(bus);
  if (info && priorityRouteIds.includes(info.priorityRouteId)) {
    return info.priorityRouteId;
  }
  return null;
}

/**
 * Normalizes a bus record with official priority corridor metadata.
 */
export function normalizePriorityBus(bus: BusTelemetry, routeInfo: NormalizedRouteInfo): BusTelemetry {
  return {
    ...bus,
    route_id: routeInfo.priorityRouteId,
    route_number: routeInfo.routeDisplay,
    route_name: routeInfo.routeName,
    direction: routeInfo.direction || bus.direction || 'BIDIRECTIONAL',
  };
}

/**
 * Centralized filtering and normalization function:
 * Filters full raw PMPML fleet down to ONLY buses operating on the 7 Priority Corridors.
 * Optionally filters to a specific corridor if targetRouteId is specified.
 */
export function normalizeAndFilterPmpmlFleet(
  fleet: BusTelemetry[],
  targetRouteId?: string | null
): BusTelemetry[] {
  if (!fleet || fleet.length === 0) return [];

  const target = targetRouteId && targetRouteId !== 'ALL' ? targetRouteId.trim() : null;
  const result: BusTelemetry[] = [];

  for (const bus of fleet) {
    const info = resolvePriorityRouteInfo(bus);
    if (!info) continue; // Exclude non-priority PMPML buses

    // If a specific priority corridor filter is requested
    if (target && info.priorityRouteId !== target) continue;

    result.push(normalizePriorityBus(bus, info));
  }

  return result;
}

/**
 * React Hook: returns the memoized priority-filtered and normalized PMPML fleet.
 * Can consume from useFleetStore directly or from a custom fleet array.
 */
export function useFilteredPmpmlFleet(
  customFleet?: BusTelemetry[],
  targetRouteId?: string | null
): BusTelemetry[] {
  const storeFleet = useFleetStore((s) => s.fleet);
  const source = customFleet ?? storeFleet;

  return useMemo(() => {
    return normalizeAndFilterPmpmlFleet(source, targetRouteId);
  }, [source, targetRouteId]);
}

/**
 * Calculate corridor bus distribution across all 7 Priority Corridors.
 */
export function getPriorityRouteBreakdown(
  fleet: BusTelemetry[]
): Record<string, number> {
  const counts: Record<string, number> = {
    '201': 0,
    '291': 0,
    '148': 0,
    '103': 0,
    '118': 0,
    '98': 0,
    '117': 0,
  };

  fleet.forEach((bus) => {
    const info = resolvePriorityRouteInfo(bus);
    if (info && info.priorityRouteId in counts) {
      counts[info.priorityRouteId]++;
    }
  });

  return counts;
}

/**
 * Data-driven sensing coverage calculation:
 * Evaluates how many of the 7 Priority Corridors have at least 1 active bus.
 */
export function calculateSensingCoverage(
  fleet: BusTelemetry[],
  priorityRouteIds: string[] = [...PUNE_PRIORITY_CORRIDOR_IDS]
): {
  coveredCount: number;
  totalCorridors: number;
  coveragePct: number;
  activeCorridorIds: string[];
  routeCounts: Record<string, number>;
} {
  const routeCounts = getPriorityRouteBreakdown(fleet);
  const activeCorridorIds = priorityRouteIds.filter((pid) => (routeCounts[pid] || 0) > 0);
  const coveredCount = activeCorridorIds.length;
  const totalCorridors = priorityRouteIds.length;
  const coveragePct = totalCorridors > 0 ? Math.round((coveredCount / totalCorridors) * 100) : 0;

  return {
    coveredCount,
    totalCorridors,
    coveragePct,
    activeCorridorIds,
    routeCounts,
  };
}
