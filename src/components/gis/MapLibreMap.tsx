import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { UrbanEyeEvent, BusTelemetry } from '../../types/events';
import { useEventStore } from '../../store/useEventStore';
import { useFleetStore } from '../../store/useFleetStore';
import { useFilterStore } from '../../store/useFilterStore';
import { SEEDED_PUNE_PRIORITY_ROUTES } from '../../services/puneRoutes';
import { calculatePuneRouteAnalytics } from '../../store/routeSelectors';
import { PUNE_BASEMAP_STYLE, PUNE_DEFAULT_VIEWPORT, PUNE_CITY_BOUNDS } from '../../config/mapConfig';
import { useFilteredPmpmlFleet } from '../../utils/puneRouteMatcher';
import { 
  Layers, 
  AlertTriangle, 
  RefreshCw, 
  Droplets, 
  OctagonAlert, 
  Car, 
  Route as RouteIcon, 
  Bus as BusIcon,
  ExternalLink 
} from 'lucide-react';

interface MapLibreMapProps {
  events: UrbanEyeEvent[];
  fleet?: BusTelemetry[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  interactive?: boolean;
  className?: string;
  showLayerControls?: boolean;
  focusLocation?: [number, number] | null;
  selectedRouteId?: string | null;
  isFullscreen?: boolean;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  events,
  fleet: propsFleet,
  center = PUNE_DEFAULT_VIEWPORT.center,
  zoom = PUNE_DEFAULT_VIEWPORT.zoom,
  className = 'w-full h-[550px]',
  showLayerControls = true,
  focusLocation = null,
  selectedRouteId = null,
  isFullscreen = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const busMarkersRef = useRef<Map<string, { marker: maplibregl.Marker; popup: maplibregl.Popup; el: HTMLElement }>>(new Map());

  const { setSelectedEvent } = useEventStore();
  const { routes, setSelectedBus } = useFleetStore();
  const { selectedJurisdiction, onlyPunePriorityRoutes, selectedRoute: globalSelectedRoute, focusLocation: storeFocusLocation } = useFilterStore();

  const [mapError, setMapError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Active route id: explicit prop takes precedence over global filter store
  const activeRouteId = selectedRouteId || (globalSelectedRoute !== 'ALL' ? globalSelectedRoute : null);

  // Centrally filter and normalize PMPML fleet BEFORE rendering (Only 7 Priority Corridors)
  const fleetToRender = useFilteredPmpmlFleet(propsFleet, activeRouteId);

  // Strict Layer Visibility Toggles (Icon Legend)
  const [layers, setLayers] = useState({
    potholes: true,
    waterlogging: true,
    signs: true,
    traffic: true,
    puneRoutes: true,
    buses: true,
  });

  // Handle "OPEN FULL MAP" -> opens dedicated full-screen GIS page in a new tab
  const handleOpenFullMap = () => {
    const params = new URLSearchParams();
    params.set('view', 'fullscreen');
    if (layers.potholes) params.append('layer', 'potholes');
    if (layers.waterlogging) params.append('layer', 'waterlogging');
    if (layers.signs) params.append('layer', 'signs');
    if (layers.traffic) params.append('layer', 'traffic');
    if (layers.puneRoutes) params.append('layer', 'puneRoutes');
    if (layers.buses) params.append('layer', 'buses');
    if (activeRouteId) params.set('route', activeRouteId);
    
    const url = `/gis/fullscreen?${params.toString()}`;
    window.open(url, '_blank');
  };

  // Initialize Map with Real Pune Basemap (Carto Dark Matter OSM-derived)
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    setMapError(null);
    let map: maplibregl.Map | null = null;

    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: PUNE_BASEMAP_STYLE,
        center: center,
        zoom: zoom,
        minZoom: PUNE_DEFAULT_VIEWPORT.minZoom,
        maxZoom: PUNE_DEFAULT_VIEWPORT.maxZoom,
        maxBounds: PUNE_CITY_BOUNDS,
      });

      map.on('error', (e) => {
        if (e && (e.error?.message?.includes('WebGL') || e.error?.message?.includes('context') || e.error?.message?.includes('Failed to initialize'))) {
          setMapError('WebGL Context Notice: Hardware acceleration unavailable');
        }
      });
    } catch {
      setMapError('GIS Map Renderer Notice: WebGL hardware acceleration unavailable');
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // 1. Add Traffic Corridors GeoJSON Source
      const corridorFeatures = routes.map((rt) => {
        const hasRealtime = typeof rt.congestion_score === 'number' && rt.congestion_score > 0;
        let color = '#64748b'; // muted slate for monitored corridor without external feed
        const score = rt.congestion_score || 0;
        if (hasRealtime) {
          if (score >= 85) color = '#ef4444'; // severe / gridlock
          else if (score >= 70) color = '#f97316'; // heavy / orange
          else if (score >= 40) color = '#f59e0b'; // moderate / yellow
          else color = '#10b981'; // green (<40)
        }

        return {
          type: 'Feature' as const,
          properties: {
            route_id: rt.route_id,
            route_name: rt.route_name,
            has_realtime: hasRealtime,
            congestion_score: score,
            avg_speed_kmh: rt.avg_speed_kmh || 0,
            vehicle_count: rt.vehicle_count || 0,
            density: rt.density || (hasRealtime ? 'MODERATE' : 'AWAITING_FEED'),
            color: color,
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: rt.coordinates,
          },
        };
      });

      map.addSource('traffic-corridors', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: corridorFeatures,
        },
      });

      map.addLayer({
        id: 'traffic-corridors-line',
        type: 'line',
        source: 'traffic-corridors',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: layers.traffic ? 'visible' : 'none',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5,
          'line-opacity': 0.85,
        },
      });

      map.on('click', 'traffic-corridors-line', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        const hasRealtime = Boolean(props.has_realtime);
        new maplibregl.Popup({ offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="text-xs font-sans p-1">
              <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5 mb-1.5">
                <span class="font-bold text-white font-mono">Route ${props.route_id} Corridor</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${hasRealtime ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                  ${hasRealtime ? `${props.congestion_score}% CONGESTION` : 'FEED UNAVAILABLE'}
                </span>
              </div>
              <p class="text-slate-300 font-medium mb-1.5">${props.route_name}</p>
              <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div class="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span class="text-slate-400 block text-[9px]">Speed</span>
                  <span class="${hasRealtime ? 'text-amber-400' : 'text-slate-500'} font-bold">${hasRealtime ? `${props.avg_speed_kmh} km/h` : 'Unavailable'}</span>
                </div>
                <div class="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span class="text-slate-400 block text-[9px]">Status</span>
                  <span class="text-slate-300 font-bold">${hasRealtime ? `${props.density}` : 'PMPML Fleet Only'}</span>
                </div>
              </div>
              <div class="text-[10px] text-slate-400 mt-1.5 text-right font-mono">
                Source: <strong class="text-slate-300">${hasRealtime ? 'Real-Time Telemetry' : 'External Feed Unavailable'}</strong>
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'traffic-corridors-line', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'traffic-corridors-line', () => {
        map.getCanvas().style.cursor = '';
      });

      // 2. Add Pune Priority Monitoring Corridors GeoJSON Source
      const puneAnalytics = calculatePuneRouteAnalytics(events, SEEDED_PUNE_PRIORITY_ROUTES);
      const puneFeatures = puneAnalytics.map((rt) => {
        let color = '#38bdf8'; // Sky blue
        if (rt.risk_score >= 70) color = '#ef4444';
        else if (rt.risk_score >= 40) color = '#f59e0b';
        else if (rt.event_count > 0) color = '#3b82f6';

        return {
          type: 'Feature' as const,
          properties: {
            route_id: rt.route_id,
            route_name: rt.route_name,
            origin: rt.origin,
            destination: rt.destination,
            city: rt.city,
            jurisdiction: rt.jurisdiction,
            priority_rank: rt.priority_rank,
            risk_score: rt.risk_score,
            event_count: rt.event_count,
            pothole_count: rt.pothole_count,
            waterlogging_count: rt.waterlogging_count,
            damaged_sign_count: rt.damaged_sign_count,
            traffic_event_count: rt.traffic_event_count,
            corroborated_event_count: rt.corroborated_event_count,
            leading_issue_type: rt.leading_issue_type,
            direction: rt.direction || 'BIDIRECTIONAL',
            color: color,
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: rt.coordinates,
          },
        };
      });

      map.addSource('pune-priority-corridors', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: puneFeatures,
        },
      });

      map.addLayer({
        id: 'pune-priority-corridors-line',
        type: 'line',
        source: 'pune-priority-corridors',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: layers.puneRoutes ? 'visible' : 'none',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5.5,
          'line-opacity': 0.9,
        },
      });

      // Pune Corridor Click Popup
      map.on('click', 'pune-priority-corridors-line', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        new maplibregl.Popup({ offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="text-xs font-sans p-1">
              <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5 mb-1.5">
                <span class="font-bold text-white font-mono">Route ${props.route_id} Corridor</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Rank #${props.priority_rank} • ${props.jurisdiction}
                </span>
              </div>
              <p class="text-slate-100 font-semibold mb-1">${props.route_name}</p>
              <p class="text-[11px] text-slate-400 mb-1.5">${props.origin} ↔ ${props.destination}</p>
              <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div class="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span class="text-slate-400 block text-[9px]">Risk Score</span>
                  <span class="text-amber-400 font-bold">${props.risk_score}/100</span>
                </div>
                <div class="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span class="text-slate-400 block text-[9px]">Active Events</span>
                  <span class="text-white font-bold">${props.event_count}</span>
                </div>
              </div>
              <div class="text-[10px] text-slate-400 mt-1.5 font-mono">
                Leading Issue: <strong class="text-slate-200">${props.leading_issue_type}</strong>
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'pune-priority-corridors-line', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'pune-priority-corridors-line', () => {
        map.getCanvas().style.cursor = '';
      });

      // 3. Add PMPML Stops GeoJSON Source
      const stopFeatures: any[] = [];
      SEEDED_PUNE_PRIORITY_ROUTES.forEach((rt) => {
        if (rt.stops) {
          rt.stops.forEach((st) => {
            stopFeatures.push({
              type: 'Feature',
              properties: {
                stop_id: st.stop_id,
                stop_name: st.stop_name,
                sequence: st.sequence,
                route_id: rt.route_id,
                route_name: rt.route_name,
              },
              geometry: {
                type: 'Point',
                coordinates: [st.longitude, st.latitude],
              },
            });
          });
        }
      });

      map.addSource('pmpml-stops', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: stopFeatures,
        },
      });

      map.addLayer({
        id: 'pmpml-stops-circle',
        type: 'circle',
        source: 'pmpml-stops',
        layout: {
          visibility: layers.puneRoutes ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': 4.5,
          'circle-color': '#38bdf8',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0f172a',
        },
      });

      map.on('click', 'pmpml-stops-circle', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="text-xs font-sans p-1">
              <div class="flex items-center gap-1.5 border-b border-slate-700 pb-1 mb-1 font-mono text-[10px] text-cyan-400 font-bold">
                <span>PMPML BUS STOP #${props.sequence}</span>
                <span class="text-slate-400">• Rt ${props.route_id}</span>
              </div>
              <strong class="text-white text-xs block">${props.stop_name}</strong>
              <span class="text-[10px] text-slate-400 block mt-0.5">${props.route_name}</span>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'pmpml-stops-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'pmpml-stops-circle', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapInstance.current = map;
    const markersMap = busMarkersRef.current;

    return () => {
      markersMap.forEach((e) => e.marker.remove());
      markersMap.clear();
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // Update Traffic Corridor layer visibility
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('traffic-corridors-line')) {
      map.setLayoutProperty(
        'traffic-corridors-line',
        'visibility',
        layers.traffic ? 'visible' : 'none'
      );
    }
  }, [layers.traffic]);

  // Update Pune Priority Corridor & Stops layer visibility
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('pune-priority-corridors-line')) {
      map.setLayoutProperty(
        'pune-priority-corridors-line',
        'visibility',
        layers.puneRoutes ? 'visible' : 'none'
      );
    }

    if (map.getLayer('pmpml-stops-circle')) {
      map.setLayoutProperty(
        'pmpml-stops-circle',
        'visibility',
        layers.puneRoutes ? 'visible' : 'none'
      );
    }
  }, [layers.puneRoutes]);

  // Fit bounds to selected route when a specific priority route is active
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (activeRouteId) {
      const targetRoute = SEEDED_PUNE_PRIORITY_ROUTES.find(r => r.route_id === activeRouteId);
      if (targetRoute && targetRoute.coordinates && targetRoute.coordinates.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        targetRoute.coordinates.forEach(coord => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, essential: true });
        return;
      }
    }

    // Default Pune center or focusLocation
    const activeFocus = focusLocation || storeFocusLocation;
    if (activeFocus) {
      map.flyTo({ center: activeFocus, zoom: 15, essential: true });
    } else if (onlyPunePriorityRoutes || selectedJurisdiction === 'PMC_PUNE') {
      map.flyTo({ center: PUNE_DEFAULT_VIEWPORT.center, zoom: 12.5, essential: true });
    }
  }, [activeRouteId, focusLocation, storeFocusLocation, onlyPunePriorityRoutes, selectedJurisdiction]);

  // Update Hazard Event Markers (Strict Layer Filtering)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    events.forEach((evt) => {
      // Strict visibility rule: if unchecked, do not render or make clickable
      if (evt.event_type === 'POTHOLE' && !layers.potholes) return;
      if (evt.event_type === 'WATERLOGGING' && !layers.waterlogging) return;
      if (evt.event_type === 'DAMAGED_SIGN' && !layers.signs) return;
      if (evt.event_type === 'TRAFFIC' && !layers.traffic) return;

      const el = document.createElement('div');
      el.className = 'cursor-pointer transition-transform hover:scale-125 z-10';

      // Professional Lucide SVG icons instead of emojis
      let iconSvg = '';
      if (evt.event_type === 'POTHOLE') {
        iconSvg = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      } else if (evt.event_type === 'WATERLOGGING') {
        iconSvg = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
      } else if (evt.event_type === 'DAMAGED_SIGN') {
        iconSvg = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      } else if (evt.event_type === 'TRAFFIC') {
        iconSvg = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
      }

      const priorityLevel = (evt as any).priority_level;
      let bgClass = 'bg-slate-600 text-white shadow-slate-500/40';
      let borderClass = 'border-slate-400';

      if (priorityLevel === 'CRITICAL') {
        bgClass = 'bg-rose-600 text-white shadow-rose-500/50';
        borderClass = 'border-rose-400';
      } else if (priorityLevel === 'HIGH') {
        bgClass = 'bg-amber-500 text-slate-950 shadow-amber-500/40';
        borderClass = 'border-amber-400';
      } else if (priorityLevel === 'MEDIUM') {
        bgClass = 'bg-blue-600 text-white shadow-blue-500/40';
        borderClass = 'border-blue-400';
      } else if (priorityLevel === 'LOW') {
        bgClass = 'bg-emerald-600 text-white shadow-emerald-500/40';
        borderClass = 'border-emerald-400';
      } else {
        if (evt.severity === 'CRITICAL') { bgClass = 'bg-rose-600 text-white'; borderClass = 'border-rose-400'; }
        else { bgClass = 'bg-slate-600 text-white'; borderClass = 'border-slate-400'; }
      }

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-7 h-7 rounded-full ${bgClass} border-2 ${borderClass} flex items-center justify-center shadow-lg">
            ${iconSvg}
          </div>
          ${
            (evt as any).priority_score
              ? `<span class="absolute -top-2 -right-3 bg-slate-900 text-white text-[9px] font-mono font-bold px-1 py-0.5 rounded border border-slate-700">${(evt as any).priority_score}</span>`
              : evt.corroboration_count > 1
              ? `<span class="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">${evt.corroboration_count}</span>`
              : ''
          }
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedEvent(evt);
        map.flyTo({ center: [evt.longitude, evt.latitude], zoom: Math.max(map.getZoom(), 14), essential: true });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([evt.longitude, evt.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [events, layers, setSelectedEvent]);

  // Update Bus Fleet Markers (Strictly Monitored Priority Corridors Only)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (!layers.buses) {
      busMarkersRef.current.forEach((entry) => entry.marker.remove());
      busMarkersRef.current.clear();
      return;
    }

    const currentIds = new Set(fleetToRender.map((b) => b.bus_id));

    // Remove markers for buses no longer in monitored fleet
    for (const [id, entry] of busMarkersRef.current.entries()) {
      if (!currentIds.has(id)) {
        entry.marker.remove();
        busMarkersRef.current.delete(id);
      }
    }

    fleetToRender.forEach((bus) => {
      const isDepot = !!bus.near_depot;
      const routeLabel = bus.route_number || bus.route_id || 'PMPML';
      const isLiveFeed = bus.source === 'PMPML_LIVE';

      const title = `Bus #${bus.bus_id} (${bus.route_name || 'Route ' + routeLabel}) - ${isDepot ? 'Near Depot' : 'Running'}`;

      const popupHtml = isLiveFeed ? `
        <div class="text-xs font-sans p-2 min-w-[220px]">
          <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1 mb-1.5">
            <span class="font-bold text-white font-mono">Bus #${bus.bus_id}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${bus.near_depot ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
              ${bus.near_depot ? 'IN DEPOT' : 'RUNNING'}
            </span>
          </div>
          <div class="text-blue-400 font-mono font-bold text-xs">
            Rt ${bus.route_number || bus.route_id}
          </div>
          <div class="text-slate-200 font-medium text-[11px] leading-tight mt-0.5">
            ${bus.route_name || ('Corridor #' + bus.route_id)}
          </div>
          <div class="text-slate-400 text-[10px] font-mono mt-1.5">
            ${bus.latitude.toFixed(5)}°N, ${bus.longitude.toFixed(5)}°E
          </div>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono mt-2">
            <div class="bg-slate-900 p-1.5 rounded border border-slate-800">
              <span class="text-slate-400 block text-[9px]">Operational</span>
              <span class="text-slate-200 font-bold">${bus.near_depot ? 'Near Depot' : 'Active Transit'}</span>
            </div>
            <div class="bg-slate-900 p-1.5 rounded border border-slate-800">
              <span class="text-slate-400 block text-[9px]">Data Age</span>
              <span class="text-blue-400 font-bold">${bus.data_age_seconds != null ? `${bus.data_age_seconds}s ago` : 'Live'}</span>
            </div>
          </div>
          <div class="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              PMPML LIVE TELEMETRY
            </span>
            <span class="text-[9px] font-mono text-slate-400">
              Priority Corridor
            </span>
          </div>
        </div>
      ` : `
        <div class="text-xs font-sans p-1.5 min-w-[200px]">
          <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-1 mb-1.5">
            <span class="font-bold text-white font-mono">Bus #${bus.bus_id}</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
              DEMO SIM
            </span>
          </div>
          <div class="text-slate-300 font-medium">${bus.route_name}</div>
          <div class="text-slate-400 text-[11px] mt-1">Driver: <span class="text-slate-200">${bus.driver_name || 'Demo Driver'}</span></div>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono mt-2">
            <div class="bg-slate-900 p-1 rounded border border-slate-800">
              <span class="text-slate-400 block text-[9px]">Speed</span>
              <span class="text-amber-400 font-bold">${bus.speed_kmh ?? 0} km/h</span>
            </div>
            <div class="bg-slate-900 p-1 rounded border border-slate-800">
              <span class="text-slate-400 block text-[9px]">Edge AI</span>
              <span class="text-blue-400 font-bold">${bus.ai_fps ?? 30} FPS</span>
            </div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800">
            <span>Cam: <strong class="text-emerald-400">${bus.camera_status || 'STREAMING'}</strong></span>
            <span>GPS: <strong class="text-slate-200">${bus.gps_signal || 'EXCELLENT'}</strong></span>
          </div>
        </div>
      `;

      const existing = busMarkersRef.current.get(bus.bus_id);
      if (existing) {
        existing.marker.setLngLat([bus.longitude, bus.latitude]);
        existing.popup.setHTML(popupHtml);
        existing.el.title = title;
      } else {
        const el = document.createElement('div');
        el.className = 'cursor-pointer transition-transform hover:scale-125 z-10';
        el.title = title;

        el.innerHTML = isDepot ? `
          <div class="relative flex items-center justify-center">
            <div class="px-1.5 py-0.5 rounded-md bg-slate-900/90 text-slate-300 font-mono text-[9px] font-semibold border border-slate-700 shadow-md flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              <span>Rt ${routeLabel}</span>
            </div>
          </div>
        ` : `
          <div class="relative flex items-center justify-center">
            <div class="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold border border-blue-400 shadow-lg flex items-center gap-1 hover:bg-blue-500 transition-colors">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Rt ${routeLabel}</span>
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 15 }).setHTML(popupHtml);

        el.addEventListener('click', () => {
          setSelectedBus(bus);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([bus.longitude, bus.latitude])
          .setPopup(popup)
          .addTo(map);

        busMarkersRef.current.set(bus.bus_id, { marker, popup, el });
      }
    });
  }, [fleetToRender, layers.buses, setSelectedBus]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Load / WebGL Error Fallback */}
      {mapError && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
            GIS Map Stream Notice
          </h4>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
            {mapError}. Spatial hazard telemetry and road inspection tables below remain fully operational.
          </p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all font-mono shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry GIS Initialization
          </button>
        </div>
      )}

      {/* Top Controls: OPEN FULL MAP Button */}
      {!isFullscreen && (
        <div className="absolute top-3 right-12 z-30">
          <button
            type="button"
            onClick={handleOpenFullMap}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#090d16] hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-mono font-semibold shadow-2xl transition-all cursor-pointer select-none"
            title="Open complete GIS map in new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>OPEN FULL MAP</span>
          </button>
        </div>
      )}

      {/* Interactive Layer Filter Overlay — Solid Opaque Stacking above Map & Markers */}
      {showLayerControls && (
        <div className="absolute top-3 left-3 bg-[#090d16] border border-slate-700/80 rounded-xl p-3 shadow-2xl shadow-black/80 text-xs space-y-2 z-30 min-w-[215px] pointer-events-auto select-none">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> GIS Map Layers
            </span>
          </div>

          <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1 select-none">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Potholes</span>
            </span>
            <input
              type="checkbox"
              checked={layers.potholes}
              onChange={(e) => setLayers({ ...layers, potholes: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1 select-none">
            <span className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>Waterlogging</span>
            </span>
            <input
              type="checkbox"
              checked={layers.waterlogging}
              onChange={(e) => setLayers({ ...layers, waterlogging: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1 select-none">
            <span className="flex items-center gap-2">
              <OctagonAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Damaged Signs</span>
            </span>
            <input
              type="checkbox"
              checked={layers.signs}
              onChange={(e) => setLayers({ ...layers, signs: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1 select-none">
            <span className="flex items-center gap-2">
              <Car className="w-3.5 h-3.5 text-purple-400" />
              <span>Traffic Density</span>
            </span>
            <input
              type="checkbox"
              checked={layers.traffic}
              onChange={(e) => setLayers({ ...layers, traffic: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1 select-none">
            <span className="flex items-center gap-2">
              <RouteIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Pune Priority Routes</span>
            </span>
            <input
              type="checkbox"
              checked={layers.puneRoutes}
              onChange={(e) => setLayers({ ...layers, puneRoutes: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-1 select-none">
            <span className="flex items-center gap-2">
              <BusIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bus Fleet ({fleetToRender.length})</span>
            </span>
            <input
              type="checkbox"
              checked={layers.buses}
              onChange={(e) => setLayers({ ...layers, buses: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </label>
        </div>
      )}

      {/* Map Legend Overlay with Traffic Segment & Hazard Semantics */}
      <div className="absolute bottom-3 right-3 bg-[#090d16] border border-slate-700/80 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-300 z-30 flex flex-wrap items-center gap-3 shadow-2xl shadow-black/80 select-none">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Running Bus</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> In Depot</span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal (&lt;40%)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Moderate (40-70%)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> Heavy (70-85%)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Severe (&gt;85%)</span>
      </div>
    </div>
  );
};
