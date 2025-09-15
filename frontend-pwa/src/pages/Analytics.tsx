import React, { useEffect, useMemo, useState } from 'react';
import { routesApi, vehiclesApi, type RouteFeature, type Vehicle } from '@/lib/api';

// Minimal, dependency-free tiny chart components (SVG)
function Bar({ label, value, max, color = '#111827' }: { label: string; value: number; max: number; color?: string }) {
    const pct = max > 0 ? (value / max) : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="truncate pr-2">{label}</span>
                <span className="tabular-nums">{value}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bar-fill" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
            </div>
        </div>
    );
}

export default function Analytics() {
    const [routes, setRoutes] = useState<RouteFeature[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [r, v] = await Promise.all([
                routesApi.getGeojson().then((x) => x.features),
                vehiclesApi.getAll(),
            ]);
            setRoutes(r);
            setVehicles(v);
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    };

    const refreshVehiclesOnly = async () => {
        try {
            const v = await vehiclesApi.getAll();
            setVehicles(v);
            setLastUpdated(new Date());
        } catch { }
    };

    useEffect(() => {
        void fetchAll();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => void refreshVehiclesOnly(), 15000);
        return () => clearInterval(id);
    }, [autoRefresh]);

    // 1) Vehicles by Route (bar chart)
    const vehiclesByRoute = useMemo(() => {
        const map = new Map<string, number>();
        vehicles.forEach((v: Vehicle) => {
            const key = String(v.route_id ?? 'N/A');
            map.set(key, (map.get(key) ?? 0) + 1);
        });
        const items = Array.from(map.entries())
            .map(([key, count]) => ({ key, count, label: (routes.find((r: RouteFeature) => String(r.route_id) === key)?.route_name ?? key) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
        const max = items.reduce((m, it) => Math.max(m, it.count), 0);
        return { items, max };
    }, [routes, vehicles]);

    // 2) Speed Distribution (histogram buckets)
    const speedBuckets = useMemo(() => {
        const buckets = [0, 10, 20, 30, 40, 50, 60];
        const counts = new Array(buckets.length).fill(0);
        vehicles.forEach((v: Vehicle) => {
            const s = Number(v.speed ?? 0);
            let idx = buckets.findIndex((b) => s < b);
            if (idx < 0) idx = buckets.length - 1;
            counts[idx]++;
        });
        const items = counts.map((c, i) => ({ key: `${i}`, label: i === 0 ? `< ${buckets[i]}` : i === buckets.length - 1 ? `≥ ${buckets[i]}` : `${buckets[i - 1]}–${buckets[i]}`, count: c }));
        const max = items.reduce((m, it) => Math.max(m, it.count), 0);
        return { items, max };
    }, [vehicles]);

    // 3) Active vs Inactive (last 60s)
    const activeSplit = useMemo(() => {
        const now = Date.now();
        let active = 0;
        let inactive = 0;
        vehicles.forEach((v: Vehicle) => {
            const t = new Date(String(v.timestamp)).getTime();
            if (Number.isFinite(t) && now - t <= 60_000) active++; else inactive++;
        });
        const total = Math.max(1, active + inactive);
        return { active, inactive, pctActive: Math.round((active / total) * 100), pctInactive: Math.round((inactive / total) * 100) };
    }, [vehicles]);

    // Build per-minute series for last 60 minutes
    const timeSeries = useMemo(() => {
        const minutes = 60;
        const now = Date.now();
        const startMinute = Math.floor((now - (minutes - 1) * 60_000) / 60_000); // minute index of first bucket
        const buckets: Array<{ ts: number; count: number; speedSum: number; n: number }> = Array.from({ length: minutes }, (_, i) => {
            const minuteIdx = startMinute + i;
            return { ts: minuteIdx * 60_000, count: 0, speedSum: 0, n: 0 };
        });
        const idxOf = (t: number) => Math.floor(t / 60_000) - startMinute;
        vehicles.forEach((v) => {
            const t = new Date(String(v.timestamp)).getTime();
            if (!Number.isFinite(t)) return;
            const idx = idxOf(t);
            if (idx < 0 || idx >= minutes) return;
            buckets[idx].count += 1;
            if (v.speed != null && Number.isFinite(Number(v.speed))) {
                buckets[idx].speedSum += Number(v.speed);
                buckets[idx].n += 1;
            }
        });
        const counts = buckets.map((b) => b.count);
        const avgSpeeds = buckets.map((b) => (b.n > 0 ? b.speedSum / b.n : 0));
        const labels = buckets.map((b) => new Date(b.ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
        return { counts, avgSpeeds, labels };
    }, [vehicles]);

    // Tiny, dependency-free line chart component
    function LineChart({ data, labels, color = '#2563eb', height = 160, strokeWidth = 2, fill = false }: { data: number[]; labels?: string[]; color?: string; height?: number; strokeWidth?: number; fill?: boolean }) {
        const [hover, setHover] = useState<number | null>(null);
        const width = 300; // responsive container can scale; keep simple intrinsic size
        const padding = 8;
        const n = data.length;
        const maxY = Math.max(1, ...data);
        const minY = 0;
        const xFor = (i: number) => padding + (i * (width - padding * 2)) / Math.max(1, n - 1);
        const yFor = (v: number) => padding + (height - padding * 2) * (1 - (v - minY) / (maxY - minY));
        const points = data.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
        const path = data
            .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(v)}`)
            .join(' ');
        const areaPath = `M ${xFor(0)} ${yFor(0)} ` +
            data.map((v, i) => `L ${xFor(i)} ${yFor(v)}`).join(' ') +
            ` L ${xFor(n - 1)} ${yFor(0)} Z`;
        const onMove = (e: any) => {
            const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const innerW = width - padding * 2;
            const t = Math.max(0, Math.min(1, (x - padding) / innerW));
            const idx = Math.round(t * (n - 1));
            setHover(idx);
        };
        const onLeave = () => setHover(null);
        return (
            <div className="relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px]" onMouseMove={onMove} onMouseLeave={onLeave}>
                    {/* baseline */}
                    <line x1={padding} y1={yFor(0)} x2={width - padding} y2={yFor(0)} stroke="#e5e7eb" strokeWidth={1} />
                    {fill && (
                        <path d={areaPath} fill={color + '22'} stroke="none" className="opacity-90" />
                    )}
                    <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} className="chart-line chart-draw" />
                    {/* hover marker */}
                    {hover != null && (
                        <g>
                            <line x1={xFor(hover)} y1={padding} x2={xFor(hover)} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
                            <circle cx={xFor(hover)} cy={yFor(data[hover])} r={3} fill={color} />
                        </g>
                    )}
                    {/* accessibility/points invisible overlay */}
                    <polyline points={points} fill="none" stroke="transparent" />
                </svg>
                {hover != null && labels && (
                    <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1 text-xs text-gray-700 border shadow-sm">
                        <div className="font-medium">{labels[hover]}</div>
                        <div>Value: <span className="tabular-nums">{Math.round(data[hover] * 100) / 100}</span></div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Analytics</h1>
                    <p className="text-sm text-gray-500">Key operational insights from your data</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}</div>
                    <button
                        onClick={() => setAutoRefresh((v: boolean) => !v)}
                        className={`inline-flex items-center rounded-full h-6 w-11 transition-colors ${autoRefresh ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        title="Toggle auto refresh (15s)"
                        role="switch"
                        aria-checked={autoRefresh}
                    >
                        <span className={`inline-block h-5 w-5 rounded-full bg-white transform transition ${autoRefresh ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                    <button onClick={() => void fetchAll()} className="inline-flex items-center rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Refresh</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Vehicles by Route */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h2 className="font-semibold mb-3">Vehicles by Route</h2>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : vehiclesByRoute.items.length === 0 ? (
                        <div className="text-sm text-gray-500">No data</div>
                    ) : (
                        <div className="space-y-2">
                            {vehiclesByRoute.items.map((it, idx) => (
                                <Bar key={it.key} label={it.label} value={it.count} max={vehiclesByRoute.max} color={['#111827', '#2563eb', '#059669', '#d97706'][idx % 4]} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Speed Distribution */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h2 className="font-semibold mb-3">Speed Distribution (km/h)</h2>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : (
                        <div className="space-y-2">
                            {speedBuckets.items.map((it, idx) => (
                                <Bar key={it.key} label={it.label} value={it.count} max={speedBuckets.max} color={['#2563eb', '#111827', '#059669', '#d97706'][idx % 4]} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Active vs Inactive */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <h2 className="font-semibold mb-3">Active vs Inactive (last 60s)</h2>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Active</span>
                                <span className="font-medium">{activeSplit.active}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-emerald-100">
                                <div className="h-2 rounded-full bg-emerald-500 bar-fill" style={{ width: `${activeSplit.pctActive}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Inactive</span>
                                <span className="font-medium">{activeSplit.inactive}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-gray-200">
                                <div className="h-2 rounded-full bg-gray-600 bar-fill" style={{ width: `${activeSplit.pctInactive}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Line charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-semibold">Vehicles per minute (last hour)</h2>
                    </div>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : (
                        <LineChart data={timeSeries.counts} color="#2563eb" fill />
                    )}
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-semibold">Avg speed per minute (last hour)</h2>
                    </div>
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : (
                        <LineChart data={timeSeries.avgSpeeds} color="#059669" fill />
                    )}
                </div>
            </div>
        </div>
    );
}
