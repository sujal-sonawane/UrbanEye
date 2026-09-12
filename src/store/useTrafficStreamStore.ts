import { create } from 'zustand';
import { 
  YOLO_TRAFFIC_STREAM_META, 
  YOLO_TRAFFIC_TELEMETRY_FRAMES, 
  YoloTrafficFrame, 
  YoloTrafficStreamMeta 
} from '../services/yoloTrafficStreamData';
import { trafficAdapter } from '../adapters/TrafficAdapter';
import { UrbanEyeEvent } from '../types/events';

export interface SmoothedTrafficSnapshot {
  total_vehicles: number;
  cars: number;
  bikes: number;
  buses: number;
  trucks: number;
  density_score: number;
  traffic_state: 'LOW' | 'MEDIUM' | 'HEAVY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  published_at: number; // Unix timestamp in ms
  sample_count: number;
  window_seconds: number;
}

export interface TrafficStreamState {
  isPlaying: boolean;
  currentFrameIndex: number;
  currentFrame: YoloTrafficFrame;
  smoothedSnapshot: SmoothedTrafficSnapshot;
  currentEvent: UrbanEyeEvent;
  lastPublishedTimestamp: number;
  updateAgeSeconds: string;
  snapshotHistory: SmoothedTrafficSnapshot[];
  cumulativeCount: number;
  streamMeta: YoloTrafficStreamMeta;
  
  // Actions
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (frameIdx: number) => void;
  tick: () => void;
}

// Configurable aggregation window: ~2.4 seconds
export const AGGREGATION_WINDOW_MS = 2400; 
export const TICK_INTERVAL_MS = 240; // ~10 ticks per window

// Initial default state
const initialRawFrame = YOLO_TRAFFIC_TELEMETRY_FRAMES[0] || {
  frame_index: 0,
  timestamp_sec: 0,
  total_vehicles: 6,
  cars: 2,
  bikes: 2,
  buses: 0,
  trucks: 2,
  density_score: 30.0,
  traffic_state: 'LOW' as const,
  severity: 'LOW' as const,
  confidence: 0.91,
};

const initialSnapshot: SmoothedTrafficSnapshot = {
  total_vehicles: initialRawFrame.total_vehicles,
  cars: initialRawFrame.cars,
  bikes: initialRawFrame.bikes,
  buses: initialRawFrame.buses,
  trucks: initialRawFrame.trucks,
  density_score: initialRawFrame.density_score,
  traffic_state: initialRawFrame.traffic_state,
  severity: initialRawFrame.severity,
  confidence: initialRawFrame.confidence,
  published_at: Date.now(),
  sample_count: 1,
  window_seconds: 2.4,
};

// Internal rolling buffer for the active aggregation window (isolated from unnecessary React re-renders)
let windowBuffer: YoloTrafficFrame[] = [initialRawFrame];
let previousCongestionState: 'LOW' | 'MEDIUM' | 'HEAVY' = initialRawFrame.traffic_state;

/**
 * Hysteresis and sustained-evidence congestion state resolver
 * Prevents state jittering (e.g. LOW -> MEDIUM -> LOW on a single noisy frame)
 */
function resolveStabilizedCongestionState(
  smoothedVehicles: number,
  samples: YoloTrafficFrame[],
  currentState: 'LOW' | 'MEDIUM' | 'HEAVY'
): { state: 'LOW' | 'MEDIUM' | 'HEAVY'; severity: 'LOW' | 'MEDIUM' | 'HIGH' } {
  const n = samples.length || 1;
  const countAboveMedium = samples.filter(s => s.total_vehicles >= 9).length;
  const countAboveHeavy = samples.filter(s => s.total_vehicles >= 16).length;
  const countBelowLow = samples.filter(s => s.total_vehicles <= 7).length;
  const countBelowMedium = samples.filter(s => s.total_vehicles <= 14).length;

  let nextState = currentState;

  if (currentState === 'LOW') {
    // Escalate to MEDIUM only if smoothed vehicles >= 9 AND >= 60% of window samples confirm
    if (smoothedVehicles >= 9 && (countAboveMedium / n) >= 0.6) {
      nextState = 'MEDIUM';
    }
  } else if (currentState === 'MEDIUM') {
    // Escalate to HEAVY only if smoothed vehicles >= 16 AND >= 60% of window confirm
    if (smoothedVehicles >= 16 && (countAboveHeavy / n) >= 0.6) {
      nextState = 'HEAVY';
    }
    // De-escalate to LOW only if smoothed vehicles <= 7 AND >= 60% of window confirm
    else if (smoothedVehicles <= 7 && (countBelowLow / n) >= 0.6) {
      nextState = 'LOW';
    }
  } else if (currentState === 'HEAVY') {
    // De-escalate to MEDIUM only if smoothed vehicles <= 14 AND >= 60% of window confirm
    if (smoothedVehicles <= 14 && (countBelowMedium / n) >= 0.6) {
      nextState = 'MEDIUM';
    }
  }

  const severityMap: Record<'LOW' | 'MEDIUM' | 'HEAVY', 'LOW' | 'MEDIUM' | 'HIGH'> = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HEAVY: 'HIGH',
  };

  return {
    state: nextState,
    severity: severityMap[nextState],
  };
}

/**
 * Aggregate observations over the recent window to produce a stable smoothed snapshot
 */
function computeSmoothedSnapshot(
  samples: YoloTrafficFrame[],
  publishedAt: number
): SmoothedTrafficSnapshot {
  if (samples.length === 0) {
    return initialSnapshot;
  }

  const n = samples.length;
  const avgTotal = samples.reduce((sum, s) => sum + s.total_vehicles, 0) / n;
  const smoothedVehicles = Math.round(avgTotal);

  const avgCars = Math.round(samples.reduce((sum, s) => sum + s.cars, 0) / n);
  const avgBikes = Math.round(samples.reduce((sum, s) => sum + s.bikes, 0) / n);
  const avgBuses = Math.round(samples.reduce((sum, s) => sum + s.buses, 0) / n);
  const avgTrucks = Math.round(samples.reduce((sum, s) => sum + s.trucks, 0) / n);

  // Reconcile classes so sum matches total vehicles exactly
  let adjustedCars = avgCars;
  const subtotal = adjustedCars + avgBikes + avgBuses + avgTrucks;
  if (subtotal !== smoothedVehicles) {
    adjustedCars = Math.max(0, adjustedCars + (smoothedVehicles - subtotal));
  }

  // Calculate density from capacity formula (Capacity: 20 vehicles in FOV)
  const densityScore = Math.min(100.0, Math.round((smoothedVehicles / 20.0) * 1000) / 10);

  // Apply hysteresis stabilization
  const { state: trafficState, severity } = resolveStabilizedCongestionState(
    smoothedVehicles,
    samples,
    previousCongestionState
  );
  previousCongestionState = trafficState;

  const avgConfidence = Math.round((samples.reduce((sum, s) => sum + s.confidence, 0) / n) * 100) / 100;

  return {
    total_vehicles: smoothedVehicles,
    cars: adjustedCars,
    bikes: avgBikes,
    buses: avgBuses,
    trucks: avgTrucks,
    density_score: densityScore,
    traffic_state: trafficState,
    severity,
    confidence: avgConfidence,
    published_at: publishedAt,
    sample_count: n,
    window_seconds: Math.round((n * (TICK_INTERVAL_MS / 1000)) * 10) / 10,
  };
}

export const useTrafficStreamStore = create<TrafficStreamState>((set, get) => ({
  isPlaying: true,
  currentFrameIndex: 0,
  currentFrame: initialRawFrame,
  smoothedSnapshot: initialSnapshot,
  currentEvent: trafficAdapter.normalizeYoloFrame(initialRawFrame),
  lastPublishedTimestamp: Date.now(),
  updateAgeSeconds: '0.1s ago',
  snapshotHistory: [initialSnapshot],
  cumulativeCount: initialRawFrame.total_vehicles,
  streamMeta: YOLO_TRAFFIC_STREAM_META,

  play: () => set({ isPlaying: true }),
  
  pause: () => set({ 
    isPlaying: false, 
    updateAgeSeconds: 'Stream Paused (Snapshot Frozen)' 
  }),

  toggle: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      set({ isPlaying: false, updateAgeSeconds: 'Stream Paused (Snapshot Frozen)' });
    } else {
      set({ 
        isPlaying: true, 
        lastPublishedTimestamp: Date.now(), 
        updateAgeSeconds: '0.1s ago' 
      });
    }
  },

  seek: (frameIdx: number) => {
    const safeIdx = Math.max(0, Math.min(YOLO_TRAFFIC_TELEMETRY_FRAMES.length - 1, frameIdx));
    const frame = YOLO_TRAFFIC_TELEMETRY_FRAMES[safeIdx];
    windowBuffer = [frame];
    const now = Date.now();
    const snapshot = computeSmoothedSnapshot(windowBuffer, now);

    set((state) => ({
      currentFrameIndex: safeIdx,
      currentFrame: frame,
      smoothedSnapshot: snapshot,
      currentEvent: trafficAdapter.normalizeYoloFrame({
        ...frame,
        total_vehicles: snapshot.total_vehicles,
        cars: snapshot.cars,
        bikes: snapshot.bikes,
        buses: snapshot.buses,
        trucks: snapshot.trucks,
        density_score: snapshot.density_score,
        traffic_state: snapshot.traffic_state,
        severity: snapshot.severity,
      }),
      lastPublishedTimestamp: now,
      updateAgeSeconds: '0.1s ago',
      snapshotHistory: [...state.snapshotHistory.slice(-19), snapshot],
    }));
  },

  tick: () => {
    const { 
      isPlaying, 
      currentFrameIndex, 
      lastPublishedTimestamp, 
      snapshotHistory, 
      cumulativeCount 
    } = get();
    
    if (!isPlaying) return;

    // Advance continuous video frame
    const nextIdx = (currentFrameIndex + 1) % YOLO_TRAFFIC_TELEMETRY_FRAMES.length;
    const nextFrame = YOLO_TRAFFIC_TELEMETRY_FRAMES[nextIdx];
    const now = Date.now();

    // Buffer the raw observation
    windowBuffer.push(nextFrame);

    // Calculate age since last published snapshot
    const elapsedMs = now - lastPublishedTimestamp;
    const ageSec = Math.max(0.1, Math.round((elapsedMs / 1000) * 10) / 10);

    // Check if the aggregation window (2.4s) has elapsed
    if (elapsedMs >= AGGREGATION_WINDOW_MS) {
      // Publish new smoothed traffic snapshot
      const newSnapshot = computeSmoothedSnapshot(windowBuffer, now);
      windowBuffer = []; // Reset buffer for next window

      // Form normalized event for downstream consumers
      const normalizedEvent = trafficAdapter.normalizeYoloFrame({
        ...nextFrame,
        total_vehicles: newSnapshot.total_vehicles,
        cars: newSnapshot.cars,
        bikes: newSnapshot.bikes,
        buses: newSnapshot.buses,
        trucks: newSnapshot.trucks,
        density_score: newSnapshot.density_score,
        traffic_state: newSnapshot.traffic_state,
        severity: newSnapshot.severity,
      });

      set({
        currentFrameIndex: nextIdx,
        currentFrame: nextFrame,
        smoothedSnapshot: newSnapshot,
        currentEvent: normalizedEvent,
        lastPublishedTimestamp: now,
        updateAgeSeconds: '0.1s ago',
        snapshotHistory: [...snapshotHistory.slice(-19), newSnapshot],
        cumulativeCount: cumulativeCount + (newSnapshot.total_vehicles > 0 ? 1 : 0),
      });
    } else {
      // Keep smoothed snapshot stable; update video frame position and freshness timer
      set({
        currentFrameIndex: nextIdx,
        currentFrame: nextFrame,
        updateAgeSeconds: `${ageSec.toFixed(1)}s ago`,
      });
    }
  },
}));
