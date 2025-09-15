import React, { useEffect, useMemo, useState } from 'react';
import MapView from '@/components/MapView';
import { routesApi } from '@/lib/api';

export default function Index() {
  type RouteRow = { id: string | number | undefined; name: string | undefined; color: string; coords: [number, number][] };
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [focusRoute, setFocusRoute] = useState<[number, number][]>([]);
  const [highlight, setHighlight] = useState<{ coords: [number, number][], color?: string } | undefined>();
  const [selectedId, setSelectedId] = useState<string | number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Clear any previously persisted selection so refresh starts with none selected
    try { window.localStorage.removeItem('nt:selectedRouteId'); } catch { }
    
    const loadRoutes = () => {
      routesApi
        .getGeojson()
        .then(({ features }) => {
          const rows: RouteRow[] = features.map((f) => ({
            id: f.route_id,
            name: f.route_name,
            color: f.color || '#2563eb',
            // Convert backend [lon, lat] to [lat, lon]
            coords: (f.coordinates || []).map(([lon, lat]) => [lat, lon] as [number, number]),
          }));
          setRoutes(rows);
        })
        .finally(() => setLoading(false));
    };

    loadRoutes();

    // Listen for data import events to refresh active routes
    const handleDataImport = () => {
      setLoading(true);
      loadRoutes();
    };

    window.addEventListener('nt:data-imported', handleDataImport);
    window.addEventListener('nt:routes-imported', handleDataImport);
    window.addEventListener('nt:stops-imported', handleDataImport); // Routes may change when stops change
    window.addEventListener('nt:refresh-routes', handleDataImport);

    return () => {
      window.removeEventListener('nt:data-imported', handleDataImport);
      window.removeEventListener('nt:routes-imported', handleDataImport);
      window.removeEventListener('nt:stops-imported', handleDataImport);
      window.removeEventListener('nt:refresh-routes', handleDataImport);
    };
  }, []);

  const routeCount = routes.length;
  const filtered = useMemo<RouteRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter((r: RouteRow) =>
      (r.name ?? '').toLowerCase().includes(q) || String(r.id ?? '').toLowerCase().includes(q)
    );
  }, [routes, search]);

  const selectRoute = (r: RouteRow) => {
    setSelectedId(r.id);
    setFocusRoute(r.coords);
    setHighlight({ coords: r.coords, color: r.color });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <div className="p-4 border-b bg-white">
        <h1 className="text-xl font-semibold">Live Map</h1>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-0">
        <div className="lg:col-span-3 min-h-0">
          <div className="h-full">
            <MapView focusRoute={focusRoute} highlightRoute={highlight} />
          </div>
        </div>
        <aside className="lg:col-span-1 border-l bg-white min-h-0 flex flex-col">
          <div className="p-4 border-b space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-semibold">Active Routes</div>
              <div className="text-xs text-gray-500">{loading ? 'Loading…' : `${routeCount} routes`}</div>
            </div>
            <div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or ID"
                className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring focus:border-blue-500"
                aria-label="Search routes"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="divide-y">
              {filtered.map((r, idx) => (
                <li key={`${r.id}-${idx}`}>
                  <button
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 ${String(selectedId) === String(r.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => selectRoute(r)}
                    title="Zoom to route"
                  >
                    <span className="inline-block w-3 h-3 rounded" style={{ background: r.color }} />
                    <span className="truncate">{r.name ?? `Route ${r.id ?? idx + 1}`}</span>
                    {String(selectedId) === String(r.id) && (
                      <span className="ml-auto text-[10px] text-blue-700 font-medium">Selected</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}