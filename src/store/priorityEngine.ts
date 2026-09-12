import { useMemo } from 'react';
import { EventType, SeverityLevel, UrbanEyeEvent } from '../types/events';
import { CorroboratedCluster } from './corroborationSelectors';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type PrioritizedEvent = CorroboratedCluster & {
  priority_level: PriorityLevel;
  priority_reasons: string[];
  recommended_action: string;
};

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  CRITICAL: 40,
  HIGH: 30,
  MEDIUM: 20,
  LOW: 10,
};

/**
 * Derives the recommended authority action based on event type and priority level.
 */
export const getRecommendedAction = (eventType: EventType, priorityLevel: PriorityLevel): string => {
  if (eventType === 'POTHOLE') {
    if (priorityLevel === 'CRITICAL') return 'Schedule immediate road inspection / repair';
    if (priorityLevel === 'HIGH') return 'Inspect road segment';
    return 'Create maintenance task';
  }
  if (eventType === 'WATERLOGGING') {
    if (priorityLevel === 'CRITICAL') return 'Dispatch drainage / field response';
    if (priorityLevel === 'HIGH') return 'Inspect drainage condition';
    return 'Monitor situation';
  }
  if (eventType === 'DAMAGED_SIGN') {
    if (priorityLevel === 'CRITICAL' || priorityLevel === 'HIGH') return 'Schedule sign inspection/replacement';
    return 'Create maintenance task';
  }
  if (eventType === 'TRAFFIC') {
    if (priorityLevel === 'CRITICAL') return 'Investigate bottleneck / traffic management response';
    if (priorityLevel === 'HIGH') return 'Monitor and investigate road segment';
    return 'Normal monitoring';
  }
  return 'Review event';
};

/**
 * Calculates priority score, level, and generates explanations for a corroborated cluster.
 */
export const calculatePriority = (cluster: any): PrioritizedEvent => {
  let score = 0;
  const reasons: string[] = [];

  // 1. Severity Weight
  const severityScore = SEVERITY_WEIGHTS[cluster.severity as SeverityLevel] || 0;
  score += severityScore;
  if (cluster.severity === 'CRITICAL' || cluster.severity === 'HIGH') {
    reasons.push(`${cluster.severity} severity`);
  }

  // 2. Corroboration Weight
  if (cluster.corroboration_count >= 3) {
    score += 20;
    reasons.push(`${cluster.corroboration_count}-bus corroboration`);
  } else if (cluster.corroboration_count === 2) {
    score += 10;
    reasons.push('Multiple bus corroboration');
  } else {
    reasons.push('Single bus detection');
  }

  // 3. Traffic Impact Weight
  // If it's a TRAFFIC event, congestion is the impact.
  // If it's a hazard, we approximate based on the route or ward.
  if (cluster.event_type === 'TRAFFIC' && cluster.traffic_details) {
    const congestion = cluster.traffic_details.congestion_score;
    if (congestion >= 80) {
      score += 20;
      reasons.push('High traffic congestion');
    } else if (congestion >= 50) {
      score += 10;
      reasons.push('Moderate traffic congestion');
    }
  } else {
    // For hazards, we apply a base traffic impact based on whether they are on major routes.
    // As a simplification, if it's on an ORR (Outer Ring Road) or 100 Feet, we treat as high traffic.
    const isMajorRoute = cluster.location_name?.toLowerCase().includes('ring road') || cluster.location_name?.toLowerCase().includes('100 feet');
    if (isMajorRoute) {
      score += 15;
      reasons.push('High traffic segment impact');
    } else {
      score += 5;
    }
  }

  // 4. Recurrence Weight (Over time)
  // If last_seen is more than 5 minutes after first_seen, it's repeatedly observed
  if (cluster.is_cluster && cluster.first_seen && cluster.last_seen) {
    const diffMins = (new Date(cluster.last_seen).getTime() - new Date(cluster.first_seen).getTime()) / 60000;
    if (diffMins > 5) {
      score += 15;
      reasons.push('Repeated observations over time');
    }
  }

  // 5. AI Confidence
  const confScore = cluster.confidence * 10;
  score += confScore;
  if (cluster.confidence >= 0.9) {
    reasons.push(`High AI confidence (${(cluster.confidence * 100).toFixed(0)}%)`);
  }

  // Cap score at 100
  const finalScore = Math.min(100, Math.round(score));

  // Determine Level
  let level: PriorityLevel;
  if (finalScore >= 80) {
    level = 'CRITICAL';
  } else if (finalScore >= 60) {
    level = 'HIGH';
  } else if (finalScore >= 40) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  const action = getRecommendedAction(cluster.event_type, level);

  return {
    ...cluster,
    priority_score: finalScore, // Override existing raw priority_score
    priority_level: level,
    priority_reasons: reasons,
    recommended_action: action,
  };
};

/**
 * React Hook to memoize the prioritized events array.
 * Takes the output of `useCorroboratedEvents`.
 */
export const usePrioritizedEvents = (events: UrbanEyeEvent[]) => {
  return useMemo(() => {
    return events.map(calculatePriority).sort((a, b) => b.priority_score - a.priority_score);
  }, [events]);
};
