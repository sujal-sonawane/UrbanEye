import { PunePriorityRoute } from '../types/events';

/**
 * URBANEYE — Pune Priority Monitoring Corridors (PMPML Bus Fleet)
 * 
 * SCOPE: Pune Municipal Corporation (PMC) city jurisdiction.
 * Official PMPML route geometries, bidirectional corridors, and authenticated stops.
 */

export const PUNE_CITY_CENTROID: [number, number] = [73.8567, 18.5204]; // [lng, lat]

export const SEEDED_PUNE_PRIORITY_ROUTES: PunePriorityRoute[] = [
  {
    route_id: '201',
    route_name: '201 — Alandi ↔ Swargate',
    origin: 'Alandi Bus Terminus',
    destination: 'Swargate Bus Station',
    city: 'Pune',
    jurisdiction: 'PMC',
    enabled: true,
    priority_rank: 1,
    direction: 'BIDIRECTIONAL',
    coordinates: [
      [73.8967, 18.6775], // Alandi Bus Terminus
      [73.8950, 18.6480], // Charholi Phata
      [73.8890, 18.6180], // Dighi Gaon
      [73.8830, 18.5980], // Magazine Chowk
      [73.8790, 18.5630], // Vishrantwadi Junction
      [73.8760, 18.5520], // Tingre Nagar Phata
      [73.8730, 18.5440], // Yerwada / Deccan College
      [73.8810, 18.5360], // Bund Garden Bridge
      [73.8743, 18.5284], // Pune Railway Station
      [73.8710, 18.5250], // Sassoon Hospital
      [73.8750, 18.5210], // Sadhu Vaswani Chowk
      [73.8965, 18.5130], // Pune Camp / Pulgate
      [73.8850, 18.5080], // Golibar Maidan
      [73.8720, 18.5040], // Seven Loves Chowk
      [73.8580, 18.5018], // Swargate Bus Station
    ],
    stops: [
      { stop_id: 'ST-201-01', stop_name: 'Alandi Bus Terminus', latitude: 18.6775, longitude: 73.8967, sequence: 1 },
      { stop_id: 'ST-201-02', stop_name: 'Charholi Phata', latitude: 18.6480, longitude: 73.8950, sequence: 2 },
      { stop_id: 'ST-201-03', stop_name: 'Dighi Gaon', latitude: 18.6180, longitude: 73.8890, sequence: 3 },
      { stop_id: 'ST-201-04', stop_name: 'Magazine Chowk', latitude: 18.5980, longitude: 73.8830, sequence: 4 },
      { stop_id: 'ST-201-05', stop_name: 'Vishrantwadi Chowk', latitude: 18.5630, longitude: 73.8790, sequence: 5 },
      { stop_id: 'ST-201-06', stop_name: 'Yerwada / Deccan College', latitude: 18.5440, longitude: 73.8730, sequence: 6 },
      { stop_id: 'ST-201-07', stop_name: 'Bund Garden', latitude: 18.5360, longitude: 73.8810, sequence: 7 },
      { stop_id: 'ST-201-08', stop_name: 'Pune Railway Station', latitude: 18.5284, longitude: 73.8743, sequence: 8 },
      { stop_id: 'ST-201-09', stop_name: 'Sassoon Hospital', latitude: 18.5250, longitude: 73.8710, sequence: 9 },
      { stop_id: 'ST-201-10', stop_name: 'Pulgate (Pune Camp)', latitude: 18.5130, longitude: 73.8965, sequence: 10 },
      { stop_id: 'ST-201-11', stop_name: 'Golibar Maidan', latitude: 18.5080, longitude: 73.8850, sequence: 11 },
      { stop_id: 'ST-201-12', stop_name: 'Seven Loves Chowk', latitude: 18.5040, longitude: 73.8720, sequence: 12 },
      { stop_id: 'ST-201-13', stop_name: 'Swargate Bus Station', latitude: 18.5018, longitude: 73.8580, sequence: 13 },
    ],
    risk_score: 0,
    event_count: 0,
    pothole_count: 0,
    waterlogging_count: 0,
    damaged_sign_count: 0,
    traffic_event_count: 0,
    corroborated_event_count: 0,
  },
  {
    route_id: '291',
    route_name: '291 — Hadapsar Gadital ↔ Katraj',
    origin: 'Hadapsar Gadital',
    destination: 'Katraj Bus Terminus',
    city: 'Pune',
    jurisdiction: 'PMC',
    enabled: true,
    priority_rank: 2,
    direction: 'BIDIRECTIONAL',
    coordinates: [
      [73.9298, 18.5020], // Hadapsar Gadital
      [73.9180, 18.5010], // Vaiduwadi
      [73.9050, 18.5000], // Fatima Nagar
      [73.8980, 18.4950], // Bhairoba Nala
      [73.8910, 18.4890], // Lullanagar
      [73.8780, 18.4750], // Bibwewadi Chowk
      [73.8640, 18.4700], // Market Yard / Gangadham
      [73.8590, 18.4610], // Padmavati Gate
      [73.8570, 18.4570], // Bharati Vidyapeeth
      [73.8550, 18.4529], // Katraj Bus Terminus
    ],
    stops: [
      { stop_id: 'ST-291-01', stop_name: 'Hadapsar Gadital', latitude: 18.5020, longitude: 73.9298, sequence: 1 },
      { stop_id: 'ST-291-02', stop_name: 'Fatima Nagar', latitude: 18.5000, longitude: 73.9050, sequence: 2 },
      { stop_id: 'ST-291-03', stop_name: 'Lullanagar', latitude: 18.4890, longitude: 73.8910, sequence: 3 },
      { stop_id: 'ST-291-04', stop_name: 'Bibwewadi Chowk', latitude: 18.4750, longitude: 73.8780, sequence: 4 },
      { stop_id: 'ST-291-05', stop_name: 'Market Yard', latitude: 18.4700, longitude: 73.8640, sequence: 5 },
      { stop_id: 'ST-291-06', stop_name: 'Padmavati', latitude: 18.4610, longitude: 73.8590, sequence: 6 },
      { stop_id: 'ST-291-07', stop_name: 'Bharati Vidyapeeth', latitude: 18.4570, longitude: 73.8570, sequence: 7 },
      { stop_id: 'ST-291-08', stop_name: 'Katraj Bus Terminus', latitude: 18.4529, longitude: 73.8550, sequence: 8 },
    ],
    risk_score: 0,
    event_count: 0,
    pothole_count: 0,
    waterlogging_count: 0,
    damaged_sign_count: 0,
    traffic_event_count: 0,
    corroborated_event_count: 0,
  },
  {
    route_id: '148',
    route_name: '148 — Pune Station ↔ Hinjawadi Phase 1',
    origin: 'Pune Railway Station',
    destination: 'Hinjawadi Shivaji Chowk',
    city: 'Pune',
    jurisdiction: 'PMC',
    enabled: true,
    priority_rank: 3,
    direction: 'BIDIRECTIONAL',
    coordinates: [
      [73.8743, 18.5284], // Pune Railway Station
      [73.8550, 18.5300], // Sancheti Chowk
      [73.8520, 18.5314], // Shivajinagar Station
      [73.8440, 18.5380], // Agriculture College
      [73.8320, 18.5520], // Pune University Chowk
      [73.8080, 18.5600], // Bremen Chowk (Aundh)
      [73.8010, 18.5710], // Rajiv Gandhi Bridge
      [73.7880, 18.5850], // Jagtap Dairy
      [73.7750, 18.5950], // Wakad Flyover
      [73.7550, 18.5990], // Bhumkar Chowk
      [73.7380, 18.5910], // Hinjawadi Phase 1
    ],
    stops: [
      { stop_id: 'ST-148-01', stop_name: 'Pune Railway Station', latitude: 18.5284, longitude: 73.8743, sequence: 1 },
      { stop_id: 'ST-148-02', stop_name: 'Shivajinagar Station', latitude: 18.5314, longitude: 73.8520, sequence: 2 },
      { stop_id: 'ST-148-03', stop_name: 'Agriculture College', latitude: 18.5380, longitude: 73.8440, sequence: 3 },
      { stop_id: 'ST-148-04', stop_name: 'Pune University Gate', latitude: 18.5520, longitude: 73.8320, sequence: 4 },
      { stop_id: 'ST-148-05', stop_name: 'Bremen Chowk (Aundh)', latitude: 18.5600, longitude: 73.8080, sequence: 5 },
      { stop_id: 'ST-148-06', stop_name: 'Jagtap Dairy', latitude: 18.5850, longitude: 73.7880, sequence: 6 },
      { stop_id: 'ST-148-07', stop_name: 'Wakad Bridge', latitude: 18.5950, longitude: 73.7750, sequence: 7 },
      { stop_id: 'ST-148-08', stop_name: 'Hinjawadi Phase 1', latitude: 18.5910, longitude: 73.7380, sequence: 8 },
    ],
    risk_score: 0,
    event_count: 0,
    pothole_count: 0,
    waterlogging_count: 0,
    damaged_sign_count: 0,
    traffic_event_count: 0,
    corroborated_event_count: 0,
  },
  {
    route_id: '103',
    route_name: '103 — Katraj ↔ Kothrud Depot',
    origin: 'Katraj Bus Terminus',
    destination: 'Kothrud Depot',
    city: 'Pune',
    jurisdiction: 'PMC',
    enabled: true,
    priority_rank: 4,
    direction: 'BIDIRECTIONAL',
    coordinates: [
      [73.8550, 18.4529], // Katraj Bus Terminus
      [73.8570, 18.4800], // Padmavati / Satara Road
      [73.8580, 18.5018], // Swargate
      [73.8520, 18.5040], // Sarasbaug
      [73.8470, 18.5090], // Tilak Road
      [73.8440, 18.5140], // Alka Talkies Chowk
      [73.8400, 18.5170], // Deccan Gymkhana
      [73.8360, 18.5120], // Garware College
      [73.8320, 18.5080], // Nal Stop (Karve Road)
      [73.8240, 18.5060], // Paud Phata
      [73.8150, 18.5040], // Karve Statue
      [73.8050, 18.5030], // Kothrud Depot
    ],
    stops: [
      { stop_id: 'ST-103-01', stop_name: 'Katraj Bus Terminus', latitude: 18.4529, longitude: 73.8550, sequence: 1 },
      { stop_id: 'ST-103-02', stop_name: 'Padmavati (Satara Rd)', latitude: 18.4800, longitude: 73.8570, sequence: 2 },
      { stop_id: 'ST-103-03', stop_name: 'Swargate Bus Station', latitude: 18.5018, longitude: 73.8580, sequence: 3 },
      { stop_id: 'ST-103-04', stop_name: 'Alka Talkies Chowk', latitude: 18.5140, longitude: 73.8440, sequence: 4 },
      { stop_id: 'ST-103-05', stop_name: 'Deccan Gymkhana', latitude: 18.5170, longitude: 73.8400, sequence: 5 },
      { stop_id: 'ST-103-06', stop_name: 'Nal Stop', latitude: 18.5080, longitude: 73.8320, sequence: 6 },
      { stop_id: 'ST-103-07', stop_name: 'Karve Statue (Kothrud)', latitude: 18.5040, longitude: 73.8150, sequence: 7 },
      { stop_id: 'ST-103-08', stop_name: 'Kothrud Depot', latitude: 18.5030, longitude: 73.8050, sequence: 8 },
    ],
    risk_score: 0,
    event_count: 0,
    pothole_count: 0,
    waterlogging_count: 0,
    damaged_sign_count: 0,
    traffic_event_count: 0,
    corroborated_event_count: 0,
  },
  {
    route_id: '118',
    route_name: '118 — Swargate ↔ Vadgaon Budruk',
    origin: 'Swargate Bus Terminus',
    destination: 'Vadgaon Budruk (Sinhagad Rd)',
    city: 'Pune',
    jurisdiction: 'PMC',
    enabled: true,
    priority_rank: 5,
    direction: 'BIDIRECTIONAL',
    coordinates: [
      [73.8580, 18.5018], // Swargate Bus Terminus
      [73.8540, 18.5025], // Mitra Mandal Chowk
      [73.8470, 18.4970], // Dandekar Bridge
      [73.8420, 18.4920], // Parvati Water Works
      [73.8390, 18.4880], // PL Deshpande Garden
      [73.8350, 18.4810], // Anandnagar
      [73.8310, 18.4750], // Hingne Khurd
      [73.8270, 18.4690], // Manikbaug
      [73.8220, 18.4620], // Sinhagad Institute
      [73.8250, 18.4650], // Vadgaon Budruk
    ],
    stops: [
      { stop_id: 'ST-118-01', stop_name: 'Swargate Bus Station', latitude: 18.5018, longitude: 73.8580, sequence: 1 },
      { stop_id: 'ST-118-02', stop_name: 'Dandekar Bridge', latitude: 18.4970, longitude: 73.8470, sequence: 2 },
      { stop_id: 'ST-118-03', stop_name: 'Parvati Water Works', latitude: 18.4920, longitude: 73.8420, sequence: 3 },
      { stop_id: 'ST-118-04', stop_name: 'PL Deshpande Garden', latitude: 18.4880, longitude: 73.8390, sequence: 4 },
      { stop_id: 'ST-118-05', stop_name: 'Anandnagar (Sinhagad Rd)', latitude: 18.4810, longitude: 73.8350, sequence: 5 },
      { stop_id: 'ST-118-06', stop_name: 'Hingne Khurd', latitude: 18.4750, longitude: 73.8310, sequence: 6 },
      { stop_id: 'ST-118-07', stop_name: 'Manikbaug', latitude: 18.4690, longitude: 73.8270, sequence: 7 },
      { stop_id: 'ST-118-08', stop_name: 'Vadgaon Budruk', latitude: 18.4650, longitude: 73.8250, sequence: 8 },
    ],
    risk_score: 0,
    event_count: 0,
    pothole_count: 0,
    waterlogging_count: 0,
    damaged_sign_count: 0,
    traffic_event_count: 0,
    corroborated_event_count: 0,
  },
  {
    route_id: '98',
    route_name: '98 — Pune Station ↔ Warje Malwadi',
    origin: 'Pune Railway Station',
    destination: 'Ganpati Matha (Warje)',
    city: 'Pune',
    jurisdiction: 'PMC',
    enabled: true,
    priority_rank: 6,
    direction: 'BIDIRECTIONAL',
    coordinates: [
      [73.8743, 18.5284], // Pune Railway Station
      [73.8710, 18.5250], // Sassoon Hospital
      [73.8640, 18.5270], // Collector Office
      [73.8553, 18.5195], // Shaniwar Wada
      [73.8400, 18.5170], // Deccan Gymkhana
      [73.8320, 18.5080], // Nal Stop
      [73.8180, 18.4980], // Cummins College
      [73.8120, 18.4920], // Karve Nagar
      [73.8010, 18.4850], // Warje Bridge / Flyover
      [73.7920, 18.4800], // Ganpati Matha (Warje Malwadi)
    ],
    stops: [
      { stop_id: 'ST-98-01', stop_name: 'Pune Railway Station', latitude: 18.5284, longitude: 73.8743, sequence: 1 },
      { stop_id: 'ST-98-02', stop_name: 'Collector Office', latitude: 18.5270, longitude: 73.8640, sequence: 2 },
      { stop_id: 'ST-98-03', stop_name: 'Shaniwar Wada', latitude: 18.5195, longitude: 73.8553, sequence: 3 },
      { stop_id: 'ST-98-04', stop_name: 'Deccan Gymkhana', latitude: 18.5170, longitude: 73.8400, sequence: 4 },
      { stop_id: 'ST-98-05', stop_name: 'Nal Stop', latitude: 18.5080, longitude: 73.8320, sequence: 5 },
      { stop_id: 'ST-98-06', stop_name: 'Karve Nagar', latitude: 18.4920, longitude: 73.8120, sequence: 6 },
      { stop_id: 'ST-98-07', stop_name: 'Warje Flyover', latitude: 18.4850, longitude: 73.8010, sequence: 7 },
      { stop_id: 'ST-98-08', stop_name: 'Ganpati Matha (Warje)', latitude: 18.4800, longitude: 73.7920, sequence: 8 },
    ],
    risk_score: 0,
    event_count: 0,
    pothole_count: 0,
    waterlogging_count: 0,
    damaged_sign_count: 0,
    traffic_event_count: 0,
    corroborated_event_count: 0,
  },
  {
    route_id: '117',
    route_name: '117 — Swargate ↔ Dhayari Gaon',
    origin: 'Swargate Bus Station',
    destination: 'Dhayari Gaon',
    city: 'Pune',
    jurisdiction: 'PMC',
    enabled: true,
    priority_rank: 7,
    direction: 'BIDIRECTIONAL',
    coordinates: [
      [73.8580, 18.5018], // Swargate Bus Station
      [73.8460, 18.4970], // Dandekar Bridge
      [73.8420, 18.4920], // Parvati Water Works
      [73.8340, 18.4810], // Hingne Khurd
      [73.8280, 18.4720], // Manikbaug
      [73.8190, 18.4610], // Wadgaon Bridge
      [73.8140, 18.4550], // Dhayari Phata
      [73.8090, 18.4480], // Dhayari Gaon
    ],
    stops: [
      { stop_id: 'ST-117-01', stop_name: 'Swargate Bus Station', latitude: 18.5018, longitude: 73.8580, sequence: 1 },
      { stop_id: 'ST-117-02', stop_name: 'Dandekar Bridge', latitude: 18.4970, longitude: 73.8460, sequence: 2 },
      { stop_id: 'ST-117-03', stop_name: 'Parvati Paytha', latitude: 18.4920, longitude: 73.8420, sequence: 3 },
      { stop_id: 'ST-117-04', stop_name: 'Hingne Khurd', latitude: 18.4810, longitude: 73.8340, sequence: 4 },
      { stop_id: 'ST-117-05', stop_name: 'Manikbaug', latitude: 18.4720, longitude: 73.8280, sequence: 5 },
      { stop_id: 'ST-117-06', stop_name: 'Wadgaon Bridge', latitude: 18.4610, longitude: 73.8190, sequence: 6 },
      { stop_id: 'ST-117-07', stop_name: 'Dhayari Phata', latitude: 18.4550, longitude: 73.8140, sequence: 7 },
      { stop_id: 'ST-117-08', stop_name: 'Dhayari Gaon', latitude: 18.4480, longitude: 73.8090, sequence: 8 },
    ],
    risk_score: 0,
    event_count: 0,
    pothole_count: 0,
    waterlogging_count: 0,
    damaged_sign_count: 0,
    traffic_event_count: 0,
    corroborated_event_count: 0,
  },
];
