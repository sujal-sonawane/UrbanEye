import { StyleSpecification } from 'maplibre-gl';

/**
 * URBANEYE — Centralized GIS Map Configuration
 * Real Pune Municipal Corporation (PMC) Basemap Configuration
 * 
 * Provider: CARTO Dark Matter (OSM-derived raster vector tiles)
 * Legal Attribution: © OpenStreetMap contributors © CARTO
 */

export const PUNE_DEFAULT_VIEWPORT = {
  center: [73.8567, 18.5204] as [number, number], // Pune PMC Centroid (Shivajinagar/Swargate axis)
  zoom: 12.5,
  minZoom: 9,
  maxZoom: 19,
  pitch: 0,
  bearing: 0,
};

export const PUNE_CITY_BOUNDS: [[number, number], [number, number]] = [
  [73.65, 18.35], // Southwest coordinates [lng, lat]
  [74.10, 18.75], // Northeast coordinates [lng, lat]
];

export const MAP_ATTRIBUTION = 
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

export const PUNE_BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark-osm': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: MAP_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: 'carto-dark-base',
      type: 'raster',
      source: 'carto-dark-osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};
