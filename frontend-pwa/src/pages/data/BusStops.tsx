import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, stopsApi, type Stop, getErrorMessage } from '@/lib/api';

type StopExtended = Stop & { routes?: (string | number)[]; accessibility?: boolean };

export default function BusStopsPage() {
    const [data, setData] = useState<StopExtended[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [openAdd, setOpenAdd] = useState(false);
    const [fStopId, setFStopId] = useState<string>('');
    const [fName, setFName] = useState<string>('');
    const [fLat, setFLat] = useState<string>('');
    const [fLon, setFLon] = useState<string>('');
    const [fRoutes, setFRoutes] = useState<string>('');

    useEffect(() => {
        setLoading(true);
        stopsApi.getAll().then((rows: Stop[]) => {
            const ext: StopExtended[] = rows.map((s: Stop) => ({
                ...s,
                routes: Array.isArray((s as any).routes) ? (s as any).routes : [],
                accessibility: (s as any).accessibility ?? true,
            }));
            setData(ext);
        }).finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!q) return data;
        const qq = q.toLowerCase();
        return data.filter((s: StopExtended) => (s.name || '').toLowerCase().includes(qq) || String(s.id ?? '').toLowerCase().includes(qq));
    }, [data, q]);

    // Actions menu handlers (stubs)
    const onImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            
            setLoading(true);
            try {
                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    alert('File is too large. Please select a file smaller than 10MB.');
                    return;
                }
                
                const text = await file.text();
                let rows: any[] = [];
                const isLikelyJSON = text.trim().startsWith('[') || text.trim().startsWith('{');
                
                if (file.name.toLowerCase().endsWith('.json') || isLikelyJSON) {
                    try {
                        const parsed = JSON.parse(text);
                        rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : []);
                    } catch (parseError) {
                        alert('Invalid JSON format. Please check your file format and try again.');
                        return;
                    }
                } else {
                    // minimal CSV parser (comma-separated, simple headers)
                    const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
                    if (lines.length > 0) {
                        const headers = lines[0].split(',').map((h) => h.trim());
                        for (let i = 1; i < lines.length; i++) {
                            const cols = lines[i].split(',');
                            const obj: Record<string, string> = {};
                            headers.forEach((h, idx) => { obj[h] = (cols[idx] ?? '').trim(); });
                            rows.push(obj);
                        }
                    }
                }
                
                if (!Array.isArray(rows) || rows.length === 0) {
                    alert('No valid data rows found in the selected file. Please check the file format.');
                    return;
                }
                
                // Validate data structure
                const requiredFields = ['stop_id', 'name', 'latitude', 'longitude'];
                const invalidRows = rows.filter(row => 
                    !requiredFields.every(field => row[field] !== undefined && row[field] !== '')
                );
                
                if (invalidRows.length > 0) {
                    const confirmed = confirm(`Found ${invalidRows.length} rows with missing required fields (${requiredFields.join(', ')}). Continue with valid rows only?`);
                    if (!confirmed) return;
                    rows = rows.filter(row => 
                        requiredFields.every(field => row[field] !== undefined && row[field] !== '')
                    );
                }
                
                if (rows.length === 0) {
                    alert('No valid rows remaining after validation. Please check your data format.');
                    return;
                }
                
                if (!confirm(`Import ${rows.length} BusStops and replace existing data? This action cannot be undone.`)) return;
                
                // Attempt import with detailed progress
                console.log('Starting import process...');
                const result = await api.post('/api/stops/import', { data: rows, mode: 'replace' });
                console.log('Import successful:', result.data);
                
                // Refresh local state from API
                console.log('Refreshing data from server...');
                const fresh = await stopsApi.getAll();
                const ext: StopExtended[] = fresh.map((s: Stop) => ({
                    ...s,
                    routes: Array.isArray((s as any).routes) ? (s as any).routes : [],
                    accessibility: (s as any).accessibility ?? true,
                }));
                setData(ext);
                
                // Dispatch events for map refresh
                try {
                    window.dispatchEvent(new CustomEvent('nt:refresh-stops'));
                    window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                    window.dispatchEvent(new CustomEvent('nt:stops-imported'));
                    window.dispatchEvent(new CustomEvent('nt:data-imported'));
                } catch { }
                
                alert(`Successfully imported ${result.data?.imported || rows.length} bus stops!`);
                
            } catch (e: any) {
                console.error('Import error:', e);
                const errorMessage = getErrorMessage(e);
                alert(`Import failed: ${errorMessage}`);
            } finally {
                setLoading(false);
            }
        };
        input.click();
        setMenuOpen(false);
    };
    const onExport = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bus_stops.json';
        a.click();
        URL.revokeObjectURL(url);
        setMenuOpen(false);
    };
    const onSchema = () => {
        alert('Schema: { stop_id, name, latitude, longitude, routes[], accessibility }');
        setMenuOpen(false);
    };
    const onDeleteAll = async () => {
        if (!confirm('Delete ALL bus stops permanently? This cannot be undone.')) return;
        try {
            await api.delete('/api/stops');
            setData([]);
            try {
                window.dispatchEvent(new CustomEvent('nt:refresh-stops'));
                window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                window.dispatchEvent(new CustomEvent('nt:data-imported'));
            } catch { }
        } catch (e: any) {
            alert(`Delete all failed: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
        } finally {
            setMenuOpen(false);
        }
    };

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">BusStop</h1>
                <div className="flex items-center gap-3">
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen((v: boolean) => !v)} className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-white hover:bg-gray-50" aria-label="More actions">⋯</button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow z-10">
                                <button onClick={onImport} className="w-full text-left px-3 py-2 hover:bg-gray-50">Import</button>
                                <button onClick={onExport} className="w-full text-left px-3 py-2 hover:bg-gray-50">Export</button>
                                <button onClick={onSchema} className="w-full text-left px-3 py-2 hover:bg-gray-50">Schema</button>
                                <button onClick={onDeleteAll} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50">Delete All</button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-2 rounded-md bg-black text-white px-3 py-2 text-sm">+ Add</button>
                </div>
            </div>
            <div className="bg-white border rounded-lg p-3">
                <div className="mb-3 flex items-center gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by name or id…"
                        className="w-full md:w-80 border rounded px-3 py-2 text-sm"
                    />
                    <div className="ml-auto text-sm text-gray-500">{loading ? 'Loading…' : `${filtered.length} of ${data.length}`}</div>
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-left text-gray-600 border-b">
                            <tr>
                                <th className="py-2 pr-4">stop_id</th>
                                <th className="py-2 pr-4">name</th>
                                <th className="py-2 pr-4">latitude</th>
                                <th className="py-2 pr-4">longitude</th>
                                <th className="py-2 pr-4">routes</th>
                                <th className="py-2 pr-4">accessibility</th>
                                <th className="py-2 pr-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s: StopExtended) => (
                                <tr key={`${s.id}-${s.latitude}-${s.longitude}`} className="border-b last:border-0">
                                    <td className="py-2 pr-4 text-gray-700">{s.id ?? '—'}</td>
                                    <td className="py-2 pr-4">{s.name ?? '—'}</td>
                                    <td className="py-2 pr-4 font-mono">{s.latitude.toFixed(6)}</td>
                                    <td className="py-2 pr-4 font-mono">{s.longitude.toFixed(6)}</td>
                                    <td className="py-2 pr-4 font-mono text-gray-500">{JSON.stringify(s.routes ?? [])}</td>
                                    <td className="py-2 pr-4">{String(s.accessibility ?? true)}</td>
                                    <td className="py-2 pr-2 text-right">
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Delete this stop?')) return;
                                                try {
                                                    await api.delete(`/api/stops/${encodeURIComponent(String(s.id))}`);
                                                    setData((rows: StopExtended[]) => rows.filter((x: StopExtended) => String(x.id) !== String(s.id)));
                                                    try {
                                                        window.dispatchEvent(new CustomEvent('nt:refresh-stops'));
                                                        window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                                                    } catch { }
                                                } catch (e: any) {
                                                    alert(`Failed to delete: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
                                                }
                                            }}
                                            className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-red-50 text-red-600"
                                            title="Delete row"
                                            aria-label="Delete row"
                                        >🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Add New BusStop Drawer */}
            {openAdd && (
                <div className="fixed inset-0 z-40">
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50" onClick={() => setOpenAdd(false)} aria-hidden="true" />
                    {/* Panel */}
                    <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl overflow-auto">
                        <div className="p-6 space-y-6">
                            <h2 className="text-xl font-semibold">Add New BusStop</h2>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">stop_id</label>
                                <div className="text-xs text-gray-500">Unique identifier for the bus stop</div>
                                <input value={fStopId} onChange={(e) => setFStopId(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">name</label>
                                <div className="text-xs text-gray-500">Display name of the bus stop</div>
                                <input value={fName} onChange={(e) => setFName(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">latitude</label>
                                <div className="text-xs text-gray-500">Latitude coordinate</div>
                                <input value={fLat} onChange={(e) => setFLat(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">longitude</label>
                                <div className="text-xs text-gray-500">Longitude coordinate</div>
                                <input value={fLon} onChange={(e) => setFLon(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">routes</label>
                                <div className="text-xs text-gray-500">List of route IDs that serve this stop</div>
                                <textarea value={fRoutes} onChange={(e) => setFRoutes(e.target.value)} placeholder="enter values..." className="w-full border rounded px-3 py-2 min-h-[80px]" />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button onClick={() => setOpenAdd(false)} className="px-3 py-2 rounded border">Cancel</button>
                                <button onClick={() => {
                                    const id = fStopId.trim();
                                    const name = fName.trim();
                                    const lat = Number(fLat);
                                    const lon = Number(fLon);
                                    if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
                                        alert('Please fill stop_id, name, latitude, and longitude correctly.');
                                        return;
                                    }
                                    const text = fRoutes.trim();
                                    let routes: string[] = [];
                                    if (text) {
                                        try {
                                            if (text.startsWith('[')) {
                                                const arr = JSON.parse(text);
                                                if (Array.isArray(arr)) routes = arr.map((t: any) => String(t).trim()).filter(Boolean);
                                            } else {
                                                routes = text.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean).map((t) => String(t));
                                            }
                                        } catch { /* ignore parse errors */ }
                                    }
                                    (async () => {
                                        try {
                                            const { data: created } = await api.post(`/api/stops`, {
                                                stop_id: id,
                                                name,
                                                latitude: lat,
                                                longitude: lon,
                                                routes,
                                                accessibility: true,
                                            });
                                            const row: StopExtended = { id: created.stop_id, name: created.name, latitude: created.latitude, longitude: created.longitude, routes: created.routes, accessibility: created.accessibility };
                                            setData((rows: StopExtended[]) => [...rows, row]);
                                            setOpenAdd(false);
                                            setFStopId(''); setFName(''); setFLat(''); setFLon(''); setFRoutes('');
                                            try {
                                                window.dispatchEvent(new CustomEvent('nt:refresh-stops'));
                                                window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                                                window.dispatchEvent(new CustomEvent('nt:data-imported'));
                                            } catch { }
                                        } catch (e: any) {
                                            alert(`Failed to save stop: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
                                        }
                                    })();
                                }} className="px-3 py-2 rounded bg-black text-white">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
