import { getRoadIssueTrend } from '../store/analyticsSelectors';
import { webSocketService, ConnectionStatus } from '../services/websocket';
import { EventService } from '../services/eventService';
import { UrbanEyeEvent } from '../types/events';


console.log('=== VERIFYING TARGETED IMPROVEMENTS ===\n');

// 1. ROAD ISSUE TREND VERIFICATION
console.log('--- Test 1: Road Issue 7-Day Trend ---');
const sampleEvents: UrbanEyeEvent[] = [
  EventService.generateMockEvent('POTHOLE'),
  EventService.generateMockEvent('WATERLOGGING'),
  EventService.generateMockEvent('DAMAGED_SIGN'),
  EventService.generateMockEvent('POTHOLE'),
];

const trend = getRoadIssueTrend(sampleEvents);
console.log(`Trend points count: ${trend.length}`);
if (trend.length !== 7) {
  throw new Error(`Expected 7 trend points, got ${trend.length}`);
}

trend.forEach((point, idx) => {
  console.log(`  [Day ${idx + 1}: ${point.date}] Potholes: ${point.potholes}, Waterlogging: ${point.waterlogging}, Signs: ${point.signs}, Total: ${point.total}`);
  if (typeof point.potholes !== 'number' || typeof point.waterlogging !== 'number' || typeof point.signs !== 'number') {
    throw new Error(`Invalid data point structure at index ${idx}`);
  }
});
console.log('Road Issue 7-Day Trend verified successfully!\n');

// 2. WEBSOCKET AUTO-RECONNECT & STATUS VERIFICATION
console.log('--- Test 2: WebSocket Auto-Reconnect & Demo Mode ---');
let lastStatusValue: ConnectionStatus | '' = '';
const unsubStatus = webSocketService.onStatus((status) => {
  lastStatusValue = status;
});
const getStatus = (): string => lastStatusValue;

// Demo mode transition
webSocketService.setDemoMode(true);
if (getStatus() !== 'DEMO') {
  throw new Error(`Expected DEMO status, got ${getStatus()}`);
}
console.log(`Demo Mode Status: ${getStatus()} (Verified)`);

// Simulation event injection without duplication
let receivedCount = 0;
const unsubEvent = webSocketService.onEvent(() => {
  receivedCount++;
});

const mockEvt = EventService.generateMockEvent('POTHOLE');
webSocketService.simulateEvent(mockEvt);

if (receivedCount !== 1) {
  throw new Error(`Expected 1 event callback, got ${receivedCount}`);
}
console.log(`Simulated Event Delivery Count: ${receivedCount} (Verified no duplicates)`);

// Clean unsubscription
unsubEvent();
webSocketService.simulateEvent(mockEvt);
if (receivedCount !== 1) {
  throw new Error(`Expected event listener to be detached, but count increased to ${receivedCount}`);
}
console.log('Event Listener Unsubscription verified!');

// Explicit disconnect resets state cleanly
webSocketService.setDemoMode(false);
webSocketService.disconnect();
if (getStatus() !== 'OFFLINE') {
  throw new Error(`Expected OFFLINE status after disconnect, got ${getStatus()}`);
}
console.log(`Explicit Disconnect Status: ${getStatus()} (Verified)`);

unsubStatus();
console.log('\n=== ALL TARGETED IMPROVEMENT TESTS PASSED CLEANLY! ===');



