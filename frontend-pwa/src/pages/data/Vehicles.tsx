import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, vehiclesApi, type Vehicle, getErrorMessage } from '@/lib/api';

export default function VehiclesPage() {
    const [rows, setRows] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [openAdd, setOpenAdd] = useState(false);
    const [fId, setFId] = useState('');
    const [fRoute, setFRoute] = useState('');
    const [fLat, setFLat] = useState('');
    const [fLon, setFLon] = useState('');
    const [fBearing, setFBearing] = useState('');
    const [fSpeed, setFSpeed] = useState('');

    useEffect(() => {
        setLoading(true);
        vehiclesApi.getAll().then(setRows).finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!q) return rows;
        return rows.filter((v) => String(v.id).includes(q) || String(v.route_id ?? '').includes(q));
    }, [rows, q]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, []);

    const fmt = (ts?: string) => {
        if (!ts) return '—';
        try {
            const d = new Date(ts);
            if (Number.isNaN(d.getTime())) return ts;
            return d.toLocaleString();
        } catch {
            return ts;
        }
    };

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
                const requiredFields = ['vehicle_id', 'latitude', 'longitude'];
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
                
                if (!confirm(`Import ${rows.length} Vehicles and replace existing data? This action cannot be undone.`)) return;
                
                // Attempt import with detailed progress
                console.log('Starting vehicle import process...');
                const result = await api.post('/api/vehicles/import', { data: rows, mode: 'replace' });
                console.log('Vehicle import successful:', result.data);
                
                // Refresh local state from API
                console.log('Refreshing vehicle data from server...');
                const list = await vehiclesApi.getAll();
                setRows(list);
                
                // Dispatch events for map refresh
                try { 
                    window.dispatchEvent(new CustomEvent('nt:refresh-vehicles'));
                    window.dispatchEvent(new CustomEvent('nt:vehicles-imported'));
                    window.dispatchEvent(new CustomEvent('nt:data-imported'));
                } catch { }
                
                alert(`Successfully imported ${result.data?.imported || rows.length} vehicles!`);
                
            } catch (e: any) {
                console.error('Vehicle import error:', e);
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
        if (!confirm('Delete ALL vehicles permanently? This cannot be undone.')) return;
        try {
            await api.delete('/api/vehicles');
            setRows([]);
            try { 
                window.dispatchEvent(new CustomEvent('nt:refresh-vehicles'));
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
                <h1 className="text-xl font-semibold">Vehicle</h1>
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
                                    a.href = url; a.download = 'vehicles.json'; a.click(); URL.revokeObjectURL(url);
                                    setMenuOpen(false);
                                }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Export</button>
                                <button onClick={() => { alert('Schema: { vehicle_id, route_id, latitude, longitude, bearing?, speed?, status?, last_updated? }'); setMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Schema</button>
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
                        placeholder="Search by id or route…"
                        className="w-full md:w-80 border rounded px-3 py-2 text-sm"
                    />
                </div>
                <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-left text-gray-600 border-b">
                            <tr>
                                <th className="py-2 pr-4">vehicle_id</th>
                                <th className="py-2 pr-4">route_id</th>
                                <th className="py-2 pr-4">latitude</th>
                                <th className="py-2 pr-4">longitude</th>
                                <th className="py-2 pr-4">bearing</th>
                                <th className="py-2 pr-4">speed</th>
                                <th className="py-2 pr-4">status</th>
                                <th className="py-2 pr-4">last_updated</th>
                                <th className="py-2 pr-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((v) => (
                                <tr key={`${v.device_id ?? v.id}-${v.latitude}-${v.longitude}`} className="border-b last:border-0">
                                    <td className="py-2 pr-4 text-gray-700">{v.device_id ?? v.id}</td>
                                    <td className="py-2 pr-4">{v.route_id ?? '—'}</td>
                                    <td className="py-2 pr-4 font-mono">{Number.isFinite(v.latitude) ? v.latitude.toFixed(6) : '—'}</td>
                                    <td className="py-2 pr-4 font-mono">{Number.isFinite(v.longitude) ? v.longitude.toFixed(6) : '—'}</td>
                                    <td className="py-2 pr-4">{v.bearing != null ? v.bearing : '—'}</td>
                                    <td className="py-2 pr-4">{v.speed != null ? `${v.speed} km/h` : '—'}</td>
                                    <td className="py-2 pr-4">{(v as any).status ?? '—'}</td>
                                    <td className="py-2 pr-4">{fmt(v.timestamp)}</td>
                                    <td className="py-2 pr-2 text-right">
                                        <button
                                            onClick={async () => {
                                                const vid = String(v.device_id ?? v.id);
                                                if (!confirm('Delete this vehicle?')) return;
                                                try {
                                                    await api.delete(`/api/vehicles/${encodeURIComponent(vid)}`);
                                                    setRows((prev) => prev.filter((x) => String(x.device_id ?? x.id) !== vid));
                                                    try { 
                                                        window.dispatchEvent(new CustomEvent('nt:refresh-vehicles'));
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
                            <h2 className="text-xl font-semibold">Add New Vehicle</h2>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">vehicle_id</label>
                                <input value={fId} onChange={(e) => setFId(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">route_id</label>
                                <input value={fRoute} onChange={(e) => setFRoute(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">latitude</label>
                                <input value={fLat} onChange={(e) => setFLat(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium">longitude</label>
                                <input value={fLon} onChange={(e) => setFLon(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">bearing</label>
                                    <input value={fBearing} onChange={(e) => setFBearing(e.target.value)} className="w-full border rounded px-3 py-2" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">speed</label>
                                    <input value={fSpeed} onChange={(e) => setFSpeed(e.target.value)} className="w-full border rounded px-3 py-2" />
                                </div>
                            </div>
                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button onClick={() => setOpenAdd(false)} className="px-3 py-2 rounded border">Cancel</button>
                                <button onClick={() => {
                                    const id = fId.trim();
                                    const route = fRoute.trim();
                                    const lat = Number(fLat);
                                    const lon = Number(fLon);
                                    if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) { alert('Please fill vehicle_id, latitude, and longitude correctly.'); return; }
                                    const bearing = fBearing ? Number(fBearing) : undefined;
                                    const speed = fSpeed ? Number(fSpeed) : undefined;
                                    (async () => {
                                        try {
                                            const { data: created } = await api.post('/api/vehicles', {
                                                vehicle_id: id,
                                                route_id: route || undefined,
                                                latitude: lat,
                                                longitude: lon,
                                                bearing,
                                                speed,
                                                status: 'active',
                                            });
                                            setRows((prev) => [...prev, {
                                                id: prev.length + 1,
                                                device_id: created.vehicle_id,
                                                route_id: created.route_id,
                                                latitude: created.latitude,
                                                longitude: created.longitude,
                                                speed: created.speed,
                                                bearing: created.bearing,
                                                timestamp: created.last_updated,
                                            }]);
                                            setOpenAdd(false);
                                            setFId(''); setFRoute(''); setFLat(''); setFLon(''); setFBearing(''); setFSpeed('');
                                            try { 
                                                window.dispatchEvent(new CustomEvent('nt:refresh-vehicles'));
                                                window.dispatchEvent(new CustomEvent('nt:data-imported'));
                                            } catch { }
                                        } catch (e: any) {
                                            alert(`Failed to save vehicle: ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
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
