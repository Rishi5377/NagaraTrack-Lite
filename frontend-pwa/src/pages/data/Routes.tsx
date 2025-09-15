import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, routesApi, getErrorMessage } from '@/lib/api';

type RouteRow = {
    route_id?: string | number;
    route_name?: string;
    route_color?: string;
    is_active?: boolean;
    coordinates?: [number, number][];
    stops?: string[];
};

export default function RoutesPage() {
    const [rows, setRows] = useState<RouteRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [openAdd, setOpenAdd] = useState(false);
    const [fId, setFId] = useState('');
    const [fName, setFName] = useState('');
    const [fColor, setFColor] = useState('#2563eb');
    const [fActive, setFActive] = useState(true);
    const [fStops, setFStops] = useState('');
    const [fCoords, setFCoords] = useState('');

    useEffect(() => {
        setLoading(true);
        routesApi
            .getAll()
            .then((list) => setRows(list))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!q) return rows;
        const qq = q.toLowerCase();
        return rows.filter(
            (r) => String(r.route_id ?? '').toLowerCase().includes(qq) || (r.route_name || '').toLowerCase().includes(qq)
        );
    }, [rows, q]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

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
                const requiredFields = ['route_id', 'route_name'];
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
                
                if (!confirm(`Import ${rows.length} Routes and replace existing data? This action cannot be undone.`)) return;
                
                // Attempt import with detailed progress
                console.log('Starting route import process...');
                const result = await api.post('/api/routes/import', { data: rows, mode: 'replace' });
                console.log('Route import successful:', result.data);
                
                // Refresh local state from API
                console.log('Refreshing route data from server...');
                const list = await routesApi.getAll();
                setRows(list);
                
                // Dispatch events for map refresh
                try { 
                    window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                    window.dispatchEvent(new CustomEvent('nt:routes-imported'));
                    window.dispatchEvent(new CustomEvent('nt:data-imported'));
                } catch { }
                
                alert(`Successfully imported ${result.data?.imported || rows.length} routes!`);
                
            } catch (e: any) {
                console.error('Route import error:', e);
                const errorMessage = getErrorMessage(e);
                alert(`Import failed: ${errorMessage}`);
            } finally {
                setLoading(false);
            }
        };
        input.click();
        setMenuOpen(false);
    };

    const onDeleteAll = async () => {
        if (!confirm('Delete ALL routes permanently? This cannot be undone.')) return;
        try {
            await api.delete('/api/routes');
            setRows([]);
            try { 
                window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                window.dispatchEvent(new CustomEvent('nt:data-imported'));
            } catch { }
        } catch (e: any) {
            alert(`Delete all failed: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
        } finally {
            setMenuOpen(false);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Route</h1>
                <div className="flex items-center gap-3">
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen((v: boolean) => !v)} className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-white hover:bg-gray-50" aria-label="More actions">⋯</button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow z-10">
                                <button onClick={onImport} className="w-full text-left px-3 py-2 hover:bg-gray-50">Import</button>
                                <button onClick={() => {
                                    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = 'routes.json'; a.click(); URL.revokeObjectURL(url);
                                    setMenuOpen(false);
                                }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Export</button>
                                <button onClick={() => { alert('Schema: { route_id, route_name, route_color, is_active, coordinates[[lat,lon]], stops[] }'); setMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Schema</button>
                                <button onClick={async () => {
                                    try {
                                        setLoading(true);
                                        await api.post('/api/routes/rebuild-coordinates');
                                        const list = await routesApi.getAll();
                                        setRows(list);
                                        try { 
                                            window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                                            window.dispatchEvent(new CustomEvent('nt:data-imported'));
                                        } catch { }
                                    } catch (e: any) {
                                        alert(`Rebuild failed: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
                                    } finally {
                                        setLoading(false);
                                        setMenuOpen(false);
                                    }
                                }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Rebuild coordinates</button>
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
                        placeholder="Search by id or name…"
                        className="w-full md:w-80 border rounded px-3 py-2 text-sm"
                    />
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-left text-gray-600 border-b">
                            <tr>
                                <th className="py-2 pr-4">route_id</th>
                                <th className="py-2 pr-4">route_name</th>
                                <th className="py-2 pr-4">route_color</th>
                                <th className="py-2 pr-4">is_active</th>
                                <th className="py-2 pr-4">coordinates</th>
                                <th className="py-2 pr-4">stops</th>
                                <th className="py-2 pr-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r, i) => (
                                <tr key={`${r.route_id}-${i}`} className="border-b last:border-0">
                                    <td className="py-2 pr-4 text-gray-700">{r.route_id ?? '—'}</td>
                                    <td className="py-2 pr-4">{r.route_name ?? '—'}</td>
                                    <td className="py-2 pr-4">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="inline-block w-3 h-3 rounded" style={{ background: r.route_color || '#2563eb' }} />
                                            <span className="font-mono text-xs">{r.route_color || '#2563eb'}</span>
                                        </span>
                                    </td>
                                    <td className="py-2 pr-4 font-mono">{String(r.is_active ?? true)}</td>
                                    <td className="py-2 pr-4 font-mono max-w-[280px] truncate" title={JSON.stringify(r.coordinates ?? [])}>{JSON.stringify(r.coordinates ?? [])}</td>
                                    <td className="py-2 pr-4 font-mono max-w-[220px] truncate" title={JSON.stringify(r.stops ?? [])}>{JSON.stringify(r.stops ?? [])}</td>
                                    <td className="py-2 pr-2 text-right">
                                        <button
                                            onClick={async () => {
                                                if (!r.route_id) return;
                                                if (!confirm('Delete this route?')) return;
                                                try {
                                                    await api.delete(`/api/routes/${encodeURIComponent(String(r.route_id))}`);
                                                    setRows((prev) => prev.filter((x) => String(x.route_id) !== String(r.route_id)));
                                                    try { 
                                                        window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                                                        window.dispatchEvent(new CustomEvent('nt:data-imported'));
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

            {openAdd && (
                <div className="fixed inset-0 z-40">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setOpenAdd(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-xl overflow-auto">
                        <div className="p-6 space-y-6">
                            <h2 className="text-xl font-semibold">Add New Route</h2>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">route_id</label>
                                <input value={fId} onChange={(e) => setFId(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">route_name</label>
                                <input value={fName} onChange={(e) => setFName(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">route_color</label>
                                <input value={fColor} onChange={(e) => setFColor(e.target.value)} className="w-full border rounded px-3 py-2 font-mono" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">is_active</label>
                                <div className="text-xs text-gray-500">Whether this route is currently active</div>
                                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={fActive} onChange={(e) => setFActive(e.target.checked)} /> Active</label>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">stops</label>
                                <div className="text-xs text-gray-500">List of stop IDs (comma or newline separated or JSON array)</div>
                                <textarea value={fStops} onChange={(e) => setFStops(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[72px]" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">coordinates</label>
                                <div className="text-xs text-gray-500">List of [lat, lon] pairs (comma/newline separated like "lat,lon" per line or JSON array)</div>
                                <textarea value={fCoords} onChange={(e) => setFCoords(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[120px] font-mono" />
                            </div>
                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button onClick={() => setOpenAdd(false)} className="px-3 py-2 rounded border">Cancel</button>
                                <button onClick={() => {
                                    const id = fId.trim();
                                    const name = fName.trim();
                                    if (!id || !name) { alert('Please fill route_id and route_name.'); return; }
                                    // parse stops
                                    let stops: string[] = [];
                                    const stopsText = fStops.trim();
                                    if (stopsText) {
                                        try {
                                            if (stopsText.startsWith('[')) { const arr = JSON.parse(stopsText); if (Array.isArray(arr)) stops = arr.map((t: any) => String(t).trim()).filter(Boolean); }
                                            else { stops = stopsText.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean); }
                                        } catch { }
                                    }
                                    // parse coordinates as tuple pairs [number, number][]
                                    let coordinates: [number, number][] = [];
                                    const coordsText = fCoords.trim();
                                    if (coordsText) {
                                        try {
                                            if (coordsText.startsWith('[')) {
                                                const arr = JSON.parse(coordsText);
                                                if (Array.isArray(arr)) {
                                                    coordinates = arr
                                                        .filter((p: any) => Array.isArray(p) && p.length === 2)
                                                        .map((p: any) => [Number(p[0]), Number(p[1])] as [number, number])
                                                        .filter((p: [number, number]) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
                                                }
                                            } else {
                                                coordinates = coordsText
                                                    .split(/\n+/)
                                                    .map((line) => line.split(/[\,\s]+/).map((x) => Number(x)))
                                                    .filter((p) => p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
                                                    .map((p) => [Number(p[0]), Number(p[1])] as [number, number]);
                                            }
                                        } catch { }
                                    }
                                    (async () => {
                                        try {
                                            const { data: created } = await api.post('/api/routes', {
                                                route_id: id,
                                                route_name: name,
                                                route_color: fColor || '#2563eb',
                                                is_active: !!fActive,
                                                coordinates,
                                                stops,
                                            });
                                            setRows((prev) => [
                                                ...prev,
                                                {
                                                    route_id: created.route_id,
                                                    route_name: created.route_name,
                                                    route_color: created.route_color,
                                                    is_active: !!created.is_active,
                                                    coordinates: Array.isArray(created.coordinates) ? created.coordinates : [],
                                                    stops: Array.isArray(created.stops) ? created.stops : [],
                                                },
                                            ]);
                                            setOpenAdd(false);
                                            setFId(''); setFName(''); setFColor('#2563eb'); setFActive(true); setFStops(''); setFCoords('');
                                            try { 
                                                window.dispatchEvent(new CustomEvent('nt:refresh-routes'));
                                                window.dispatchEvent(new CustomEvent('nt:data-imported'));
                                            } catch { }
                                        } catch (e: any) {
                                            alert(`Failed to save route: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
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
