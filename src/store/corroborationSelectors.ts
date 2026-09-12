import { useMemo } from 'react';
import { UrbanEyeEvent } from '../types/events';

// Configuration Defaults
export const CORROBORATION_RADIUS_METERS = 30; // Within 30 meters
export const CORROBORATION_TIME_WINDOW_MS = 30 * 60 * 1000; // Within 30 minutes

/**
 * Helper to calculate haversine distance in meters
 */
const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; 
};

/**
 * Extension for clustered properties without mutating the base UrbanEyeEvent schema.
 */
export type CorroboratedCluster = UrbanEyeEvent & {
  is_cluster: true;
  member_events: UrbanEyeEvent[];
  first_seen: string;
  last_seen: string;
};

/**
 * Core clustering logic that takes raw observations and fuses them.
 * Traffic events are returned as-is without clustering.
 */
export const clusterEvents = (
  events: UrbanEyeEvent[],
  radius = CORROBORATION_RADIUS_METERS,
  timeWindow = CORROBORATION_TIME_WINDOW_MS
): UrbanEyeEvent[] => {
  const clusters: CorroboratedCluster[] = [];
  const trafficEvents: UrbanEyeEvent[] = [];

  events.forEach((evt) => {
    // We do not spatially cluster Traffic events here as they represent road segments.
    if (evt.event_type === 'TRAFFIC') {
      trafficEvents.push(evt);
      return;
    }

    const evtTime = new Date(evt.timestamp).getTime();

    // Find if there is an active cluster that matches
    const matchIndex = clusters.findIndex(c => {
      if (c.event_type !== evt.event_type) return false;
      const timeDiff = Math.abs(new Date(c.last_seen).getTime() - evtTime);
      if (timeDiff > timeWindow) return false;
      
      const dist = getDistanceMeters(c.latitude, c.longitude, evt.latitude, evt.longitude);
      return dist <= radius;
    });

    if (matchIndex >= 0) {
      // Add to existing cluster
      const cluster = clusters[matchIndex];
      cluster.member_events.push(evt);
      
      // Update temporal boundaries
      if (evtTime < new Date(cluster.first_seen).getTime()) {
        cluster.first_seen = evt.timestamp;
      }
      if (evtTime > new Date(cluster.last_seen).getTime()) {
        cluster.last_seen = evt.timestamp;
      }
      
      // Update derived location (average)
      cluster.latitude = (cluster.latitude * (cluster.member_events.length - 1) + evt.latitude) / cluster.member_events.length;
      cluster.longitude = (cluster.longitude * (cluster.member_events.length - 1) + evt.longitude) / cluster.member_events.length;

      // Update bus count (unique buses only)
      if (!cluster.observing_bus_ids) cluster.observing_bus_ids = [];
      if (!cluster.observing_bus_ids.includes(evt.bus_id)) {
        cluster.observing_bus_ids.push(evt.bus_id);
        cluster.corroboration_count = cluster.observing_bus_ids.length;
        cluster.corroboration_status = cluster.corroboration_count > 1 ? 'CORROBORATED' : 'UNVERIFIED';
        
        // Fleet confidence boost
        cluster.confidence = Math.min(1.0, cluster.confidence + 0.05); // Boost confidence for new independent observation
      }

      // Update severity to highest observed
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const currentSevIdx = severities.indexOf(cluster.severity);
      const newSevIdx = severities.indexOf(evt.severity);
      if (newSevIdx > currentSevIdx) {
        cluster.severity = evt.severity;
      }

    } else {
      // Create new cluster base
      const newCluster: CorroboratedCluster = {
        ...evt,
        event_id: `CLUSTER-${evt.event_id}`,
        is_cluster: true,
        member_events: [evt],
        observing_bus_ids: [evt.bus_id],
        corroboration_count: 1, // Will only be > 1 if another DIFFERENT bus sees it
        corroboration_status: 'UNVERIFIED',
        first_seen: evt.timestamp,
        last_seen: evt.timestamp,
      };
      clusters.push(newCluster);
    }
  });

  return [...trafficEvents, ...clusters];
};

/**
 * React Hook to memoize the clustered events array to prevent O(N^2) re-renders on UI updates.
 */
export const useCorroboratedEvents = (events: UrbanEyeEvent[]) => {
  return useMemo(() => clusterEvents(events), [events]);
};
