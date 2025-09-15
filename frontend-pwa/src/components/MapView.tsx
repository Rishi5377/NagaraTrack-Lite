import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { stopsApi, routesApi, vehiclesApi, type Stop, type Vehicle } from '@/lib/api';

// Adjust Leaflet default icon assets if needed (we'll use custom div icons below)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Google-like pin using a CSS-based DivIcon (blue with white border)
const googleLikePin = (color = '#4285F4') =>
  L.divIcon({
    className: 'google-like-pin',
    html: `
      <div style="position: relative; width: 22px; height: 22px;">
        <div style="
          width: 22px; height: 22px; border-radius: 50%;
          background: ${color}; border: 3px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,.3);
        "></div>
        <div style="
          position: absolute; left: 50%; transform: translateX(-50%);
          bottom: -6px; width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${color};
          filter: drop-shadow(0 1px 1px rgba(0,0,0,.25));
        "></div>
      </div>
    `,
    iconSize: [22, 28],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });

export default function MapView({ focusRoute, highlightRoute }: { focusRoute?: [number, number][]; highlightRoute?: { coords: [number, number][]; color?: string } }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const vehiclesLayerRef = useRef<L.LayerGroup | null>(null);
  const highlightLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20.5937, 78.9629], // India center-ish as a default
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const stopsLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    const vehiclesLayer = L.layerGroup().addTo(map);
    const highlightLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    stopsLayerRef.current = stopsLayer;
    routesLayerRef.current = routesLayer;
    vehiclesLayerRef.current = vehiclesLayer;
    highlightLayerRef.current = highlightLayer;

    // Initial load function and event-based refresh
    const loadAll = async () => {
      try {
        const [stops, routes, vehicles] = await Promise.all([
          stopsApi.getAll(),
          routesApi.getGeojson(),
          vehiclesApi.getAll(),
        ]);
        addRoutesToMap(routes.features);
        addStopsToMap(stops);
        addVehiclesToMap(vehicles);
        fitToData();
      } catch (e) {
        console.error('Failed to load map data', e);
      }
    };
    loadAll();

    const onRefreshStops = () => {
      (async () => {
        try {
          const stops = await stopsApi.getAll();
          addStopsToMap(stops);
        } catch (e) {
          console.error('Failed to refresh stops', e);
        }
      })();
    };

    const onRefreshRoutes = () => {
      (async () => {
        try {
          const routes = await routesApi.getGeojson();
          addRoutesToMap(routes.features);
        } catch (e) {
          console.error('Failed to refresh routes', e);
        }
      })();
    };

    const onRefreshVehicles = () => {
      (async () => {
        try {
          const vehicles = await vehiclesApi.getAll();
          addVehiclesToMap(vehicles);
        } catch (e) {
          console.error('Failed to refresh vehicles', e);
        }
      })();
    };

    // Enhanced event handler that refreshes all data types when any import occurs
    const onDataImported = () => {
      (async () => {
        try {
          const [stops, routes, vehicles] = await Promise.all([
            stopsApi.getAll(),
            routesApi.getGeojson(),
            vehiclesApi.getAll(),
          ]);
          addRoutesToMap(routes.features);
          addStopsToMap(stops);
          addVehiclesToMap(vehicles);
          fitToData();
        } catch (e) {
          console.error('Failed to refresh all data after import', e);
        }
      })();
    };

    // Listen to individual refresh events
    window.addEventListener('nt:refresh-stops', onRefreshStops as any);
    window.addEventListener('nt:refresh-routes', onRefreshRoutes as any);
    window.addEventListener('nt:refresh-vehicles', onRefreshVehicles as any);
    
    // Listen to comprehensive data import events for real-time updates
    window.addEventListener('nt:data-imported', onDataImported as any);
    window.addEventListener('nt:stops-imported', onDataImported as any);
    window.addEventListener('nt:routes-imported', onDataImported as any);
    window.addEventListener('nt:vehicles-imported', onDataImported as any);

    return () => {
      window.removeEventListener('nt:refresh-stops', onRefreshStops as any);
      window.removeEventListener('nt:refresh-routes', onRefreshRoutes as any);
      window.removeEventListener('nt:refresh-vehicles', onRefreshVehicles as any);
      window.removeEventListener('nt:data-imported', onDataImported as any);
      window.removeEventListener('nt:stops-imported', onDataImported as any);
      window.removeEventListener('nt:routes-imported', onDataImported as any);
      window.removeEventListener('nt:vehicles-imported', onDataImported as any);
      map.remove();
      mapRef.current = null;
      stopsLayerRef.current = null;
      routesLayerRef.current = null;
      vehiclesLayerRef.current = null;
      highlightLayerRef.current = null;
    };
  }, []);

  const addStopsToMap = (stops: Stop[]) => {
    if (!mapRef.current || !stopsLayerRef.current) return;

    const markers: L.Marker[] = [];
    stopsLayerRef.current.clearLayers();

    stops.forEach((s) => {
      const marker = L.marker([s.latitude, s.longitude], { icon: googleLikePin('#4285F4') });
      marker.bindPopup(`<strong>${s.name ?? 'Stop'}</strong>`);
      marker.addTo(stopsLayerRef.current!);
      markers.push(marker);
    });

    // bounds handled by fitToData
  };

  const addRoutesToMap = (features: { color?: string; coordinates: [number, number][] }[]) => {
    if (!mapRef.current || !routesLayerRef.current) return;
    routesLayerRef.current.clearLayers();
    features.forEach((f) => {
      // Backend provides [lon, lat]; Leaflet needs [lat, lon]
      const latlngs = f.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
      if (latlngs.length) {
        L.polyline(latlngs, { color: f.color || '#2563eb', weight: 4, opacity: 0.9 }).addTo(routesLayerRef.current!);
      }
    });
  };

  const busIcon = L.divIcon({
    className: 'bus-icon',
    html: `
      <div style="
        width: 18px; height: 18px; border-radius: 4px; background:#EF4444; color:#fff;
        display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;
        border:2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3);
      ">🚌</div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  const addVehiclesToMap = (vehicles: Vehicle[]) => {
    if (!mapRef.current || !vehiclesLayerRef.current) return;
    vehiclesLayerRef.current.clearLayers();
    vehicles.forEach((v) => {
      if (!Number.isFinite(v.latitude) || !Number.isFinite(v.longitude)) return;
      const m = L.marker([v.latitude, v.longitude], { icon: busIcon });
      m.bindPopup(`
        <div style="min-width: 140px">
          <div style="font-weight:600">Bus #${v.id}</div>
          ${v.route_id ? `<div style=\"color:#555\">Route: ${v.route_id}</div>` : ''}
          ${v.speed != null ? `<div style=\"color:#555\">Speed: ${v.speed} km/h</div>` : ''}
        </div>
      `);
      m.addTo(vehiclesLayerRef.current!);
    });
  };

  const fitToData = () => {
    if (!mapRef.current) return;
    const layers: L.Layer[] = [];
    if (stopsLayerRef.current) layers.push(...stopsLayerRef.current.getLayers());
    if (routesLayerRef.current) layers.push(...routesLayerRef.current.getLayers());
    if (vehiclesLayerRef.current) layers.push(...vehiclesLayerRef.current.getLayers());
    if (highlightLayerRef.current) layers.push(...highlightLayerRef.current.getLayers());
    if (layers.length === 0) return;
    const group = L.featureGroup(layers as any);
    const bounds = group.getBounds();
    if (bounds.isValid()) {
      mapRef.current!.fitBounds(bounds, { padding: [24, 24] });
    }
  };

  // Focus on a specific route when provided (expects [lat, lon] pairs)
  useEffect(() => {
    if (!mapRef.current || !focusRoute || focusRoute.length === 0) return;
    const bounds = L.latLngBounds(focusRoute.map(([lat, lon]) => L.latLng(lat, lon)));
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [focusRoute]);

  // Highlight the selected route if provided
  useEffect(() => {
    if (!mapRef.current || !highlightLayerRef.current) return;
    highlightLayerRef.current.clearLayers();
    if (!highlightRoute || !highlightRoute.coords || highlightRoute.coords.length === 0) return;
    const latlngs = highlightRoute.coords;
    // Add a soft outline then the main colored line for visual emphasis
    L.polyline(latlngs, { color: '#0ea5e9', opacity: 0.25, weight: 10 }).addTo(highlightLayerRef.current);
    L.polyline(latlngs, { color: highlightRoute.color || '#2563eb', opacity: 1, weight: 6 }).addTo(highlightLayerRef.current);
  }, [highlightRoute]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 bg-white" />
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-2 rounded shadow text-sm space-y-1">
        <div className="font-semibold">Legend</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#4285F4', border: '2px solid #fff' }}></span> Stops</div>
        <div className="flex items-center gap-2"><span className="inline-block w-4 h-[2px]" style={{ background: '#2563eb' }}></span> Routes</div>
        <div className="flex items-center gap-2"><span className="inline-flex items-center justify-center w-4 h-4 rounded" style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700 }}>🚌</span> Vehicles</div>
      </div>
    </div>
  );
}