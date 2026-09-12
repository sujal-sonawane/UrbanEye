import { simulationEngine } from '../services/simulationEngine';
import { useEventStore } from '../store/useEventStore';
import { webSocketService } from '../services/websocket';
import { clusterEvents } from '../store/corroborationSelectors';

console.log('=== RUNNING FULL SIMULATION ENGINE SCENARIO TEST ===');

// Reset simulation & event store
simulationEngine.reset();
useEventStore.getState().clearEvents();

// Wire WebSocket listener to event store (as done in production UI)
const unsub = webSocketService.onEvent((evt) => {
  useEventStore.getState().addLiveEvent(evt);
});

// Start simulation at maximum speed
simulationEngine.start(50); // fast for testing

// Step through ticks
for (let t = 1; t <= 70; t++) {
  // Directly trigger internal tick
  (simulationEngine as any).tick();
  
  const currentEvents = useEventStore.getState().events;
  const clusters = clusterEvents(currentEvents);
  const potholeCluster = clusters.find(c => c.event_type === 'POTHOLE') as any;

  if (t === 35) {
    console.log(`[Tick ${t}] BUS-101 detected Pothole:`);
    console.log(`  Corroboration Count: ${potholeCluster?.corroboration_count}`);
    console.log(`  Buses: ${potholeCluster?.observing_bus_ids?.join(', ')}`);
    if (potholeCluster?.corroboration_count !== 1) {
      throw new Error(`Expected 1 at tick 35, got ${potholeCluster?.corroboration_count}`);
    }
  }

  if (t === 45) {
    console.log(`[Tick ${t}] BUS-204 detected SAME Pothole:`);
    console.log(`  Corroboration Count: ${potholeCluster?.corroboration_count}`);
    console.log(`  Buses: ${potholeCluster?.observing_bus_ids?.join(', ')}`);
    if (potholeCluster?.corroboration_count !== 2) {
      throw new Error(`Expected 2 at tick 45, got ${potholeCluster?.corroboration_count}`);
    }
  }

  if (t === 60) {
    console.log(`[Tick ${t}] BUS-310 detected SAME Pothole:`);
    console.log(`  Corroboration Count: ${potholeCluster?.corroboration_count}`);
    console.log(`  Buses: ${potholeCluster?.observing_bus_ids?.join(', ')}`);
    console.log(`  Status: ${potholeCluster?.corroboration_status}`);
    if (potholeCluster?.corroboration_count !== 3) {
      throw new Error(`Expected 3 at tick 60, got ${potholeCluster?.corroboration_count}`);
    }
  }
}

unsub();
simulationEngine.stop();
console.log('=== FULL SIMULATION SCENARIO PASSED CLEANLY! ===\n');
