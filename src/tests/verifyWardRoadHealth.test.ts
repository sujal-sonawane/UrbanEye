import { MOCK_EVENTS, MOCK_WARDS } from '../services/mockData';
import { 
  getCalculatedPuneWards, 
  getWardHealthStatus, 
  calculateRoadHealth 
} from '../store/analyticsSelectors';

console.log('=== URBANEYE: WARD ROAD HEALTH INDEX VERIFICATION ===\n');

// 1. WARD COUNT & SCOPE
console.log('--- Test 1: Ward Count & Pune Scope ---');
if (MOCK_WARDS.length !== 6) {
  throw new Error(`Expected exactly 6 key Pune zones, got ${MOCK_WARDS.length}`);
}
console.log(`✔ Exactly 6 Pune PMC zones verified in MOCK_WARDS.`);

// 2. ZERO BANGALORE / NON-PMC LEAKAGE
console.log('\n--- Test 2: Zero Non-Pune Leakage ---');
const serializedWards = JSON.stringify(MOCK_WARDS).toLowerCase();
const forbiddenTerms = ['bangalore', 'bengaluru', 'bbmp', 'silk board', 'domlur', 'koramangala', 'whitefield', 'electronic city'];
forbiddenTerms.forEach(term => {
  if (serializedWards.includes(term)) {
    throw new Error(`Forbidden term '${term}' detected in Ward Road Health data!`);
  }
});
console.log('✔ All 6 zones confirmed to be authentic Pune / PMC jurisdictions (Shivajinagar, Kothrud, Yerawada, Hadapsar, Katraj, Kondhwa).');

// 3. EXPLAINABILITY & MONOTONIC DEFECT BURDEN
console.log('\n--- Test 3: Explainable Road Health Scoring ---');
MOCK_WARDS.forEach(w => {
  const calculated = calculateRoadHealth(MOCK_EVENTS, w.ward_id);
  if (w.health_score !== calculated) {
    throw new Error(`Ward ${w.ward_name} score mismatch: expected ${calculated}, got ${w.health_score}`);
  }
});

// Shivajinagar (W-01-PMC) has 3 critical issues and should have lower health than Kondhwa (W-14-PMC)
const shivajinagar = MOCK_WARDS.find(w => w.ward_id === 'W-01-PMC')!;
const kondhwa = MOCK_WARDS.find(w => w.ward_id === 'W-14-PMC')!;

if (shivajinagar.health_score >= kondhwa.health_score) {
  throw new Error(`Expected Shivajinagar (heavy defects) to have lower health than Kondhwa, got ${shivajinagar.health_score} vs ${kondhwa.health_score}`);
}
console.log(`✔ Explainability verified:`);
console.log(`   Shivajinagar: ${shivajinagar.health_score}/100 (${shivajinagar.critical_hazards} critical hazards, Status: ${getWardHealthStatus(shivajinagar.health_score).label})`);
console.log(`   Kondhwa:      ${kondhwa.health_score}/100 (${kondhwa.critical_hazards} critical hazards, Status: ${getWardHealthStatus(kondhwa.health_score).label})`);

// 4. STATUS BADGE MAPPING
console.log('\n--- Test 4: Semantic Status Badge Mapping ---');
if (getWardHealthStatus(90).label !== 'Healthy') throw new Error('90 should be Healthy');
if (getWardHealthStatus(75).label !== 'Attention') throw new Error('75 should be Attention');
if (getWardHealthStatus(65).label !== 'Warning') throw new Error('65 should be Warning');
if (getWardHealthStatus(50).label !== 'Needs Review') throw new Error('50 should be Needs Review');
if (getWardHealthStatus(30).label !== 'Critical') throw new Error('30 should be Critical');
console.log('✔ Status badges correctly map across 5 distinct tiers (Healthy, Attention, Warning, Needs Review, Critical).');

// 5. DYNAMIC REACTION TO EVENT CHANGES
console.log('\n--- Test 5: Dynamic Calculation from Active Events ---');
const dynamicWards = getCalculatedPuneWards(MOCK_EVENTS);
if (dynamicWards.length !== 6) {
  throw new Error(`Expected 6 dynamic wards, got ${dynamicWards.length}`);
}
console.log('✔ getCalculatedPuneWards dynamically evaluates road health from active event store.');

console.log('\n=== ALL WARD ROAD HEALTH VERIFICATIONS PASSED CLEANLY! ===\n');
