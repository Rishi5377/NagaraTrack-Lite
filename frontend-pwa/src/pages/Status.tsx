import React, { useEffect, useMemo, useState } from 'react';
import { healthApi, type HealthStatus, stopsApi, routesApi, vehiclesApi } from '@/lib/api';
import { Activity, RefreshCcw, MapPin, Route as RouteIcon, Bus } from 'lucide-react';

export default function Status() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [stopsCount, setStopsCount] = useState<number | null>(null);
    const [routesCount, setRoutesCount] = useState<number | null>(null);
    const [vehiclesCount, setVehiclesCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [respTimeMs, setRespTimeMs] = useState<number | null>(null);
    const [freshnessSec, setFreshnessSec] = useState<number | null>(null);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
    const [activeVehicles, setActiveVehicles] = useState<number | null>(null);


    const overallStatus = useMemo(() => {
        if (!health) return 'unknown';
        // In CSV mode, treat healthy if /health responds and services.data === 'csv'
        return health.status?.toLowerCase?.() === 'healthy' ? 'healthy' : 'degraded';
    }, [health]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const t0 = performance.now();
            const healthPromise = healthApi.getStatus().catch(() => null);
            const [h, stops, routes, vehicles] = await Promise.all([
                healthPromise,
                stopsApi.getAll().catch(() => []),
                routesApi.getGeojson().catch(() => ({ features: [] })),
                vehiclesApi.getAll().catch(() => []),
            ]);
            const t1 = performance.now();
            setRespTimeMs(Math.max(0, Math.round(t1 - t0)));
            setHealth(h);
            setStopsCount(Array.isArray(stops) ? stops.length : 0);
            setRoutesCount(Array.isArray((routes as any)?.features) ? (routes as any).features.length : 0);
            const vCount = Array.isArray(vehicles) ? vehicles.length : 0;
            setVehiclesCount(vCount);
            if (Array.isArray(vehicles) && vehicles.length > 0) {
                const timestamps = vehicles
                    .map((v: any) => new Date(String(v.timestamp || v.updated_at || v.last_seen || v.time || 0)).getTime())
                    .filter((n: number) => Number.isFinite(n) && n > 0);
                const newest = timestamps.reduce((a: number, b: number) => Math.max(a, b), 0);
                if (newest > 0) {
                    const now = Date.now();
                    setFreshnessSec(Math.max(0, Math.round((now - newest) / 1000)));
                } else {
                    setFreshnessSec(null);
                }
                const nowMs = Date.now();
                const active = timestamps.filter((t) => nowMs - t <= 60_000).length;
                setActiveVehicles(active);
                const validCoords = vehicles.filter((v: any) => {
                    const lat = Number(v.lat ?? v.latitude);
                    const lon = Number(v.lon ?? v.lng ?? v.longitude);
                    return Number.isFinite(lat) && Number.isFinite(lon);
                }).length;
                setGpsAccuracy(Math.round((validCoords / vehicles.length) * 100));
            } else {
                setFreshnessSec(null);
                setActiveVehicles(null);
                setGpsAccuracy(null);
            }
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchAll();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => void fetchAll(), 15000);
        return () => clearInterval(id);
    }, [autoRefresh]);

    const serviceColor = (v?: string) => {
        const val = (v ?? 'unknown').toLowerCase();
        if (val === 'healthy' || val === 'ok' || val === 'csv' || val === 'running' || val === 'enabled') return 'text-green-700 bg-green-50 border-green-200';
        if (val === 'disabled' || val === 'unknown' || val === 'n/a') return 'text-gray-700 bg-gray-50 border-gray-200';
        if (val === 'degraded' || val === 'syncing' || val === 'starting') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
        return 'text-red-700 bg-red-50 border-red-200';
    };

    const Dot = ({ className }: { className: string }) => (
        <span className={`inline-block w-2 h-2 rounded-full ${className}`} />
    );

    const displayValue = (v?: string) => {
        const val = (v ?? 'unknown').toLowerCase();
        if (['healthy', 'ok', 'running', 'enabled', 'csv'].includes(val)) return val;
        if (val === 'disabled') return 'disabled';
        if (val === 'unknown' || val === 'n/a') return 'unknown';
        return val;
    }

    const ServiceBadge = ({ label, value }: { label: string; value?: string }) => {
        const styles = serviceColor(value);
        const dot = styles.includes('green') ? 'bg-green-500' : styles.includes('yellow') ? 'bg-yellow-500' : styles.includes('red') ? 'bg-red-500' : 'bg-gray-400';
        return (
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${styles}`}>
                <span className="text-sm flex items-center gap-2 text-gray-600">
                    <Dot className={dot} />
                    {label}
                </span>
                <span className="text-sm font-medium capitalize">{displayValue(value)}</span>
            </div>
        );
    };

    const formatUptime = (v?: string | null) => {
        if (!v) return '—';
        // Expect HH:MM:SS from backend; fall back to raw
        const m = v.match(/^(\d{2}):(\d{2}):(\d{2})$/);
        if (!m) return v;
        const [_, hh, mm, ss] = m;
        const h = parseInt(hh, 10);
        const parts = [] as string[];
        if (h > 0) parts.push(`${h}h`);
        if (mm !== '00') parts.push(`${parseInt(mm, 10)}m`);
        if (ss !== '00' || parts.length === 0) parts.push(`${parseInt(ss, 10)}s`);
        return parts.join(' ');
    };

    const KpiCard = ({ label, value, tone }: { label: string; value: number | string | null; tone?: 'green' | 'yellow' | 'red' | 'gray' }) => {
        const toneClasses = tone === 'green'
            ? 'border-green-200 bg-green-50 text-green-800'
            : tone === 'yellow'
                ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                : tone === 'red'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-gray-200 bg-white text-gray-900';
        const labelTone = tone && tone !== 'gray' ? 'text-current' : 'text-gray-500';
        return (
            <div className={`rounded-lg p-4 border ${toneClasses}`}>
                <div className={`text-xs uppercase tracking-wide ${labelTone}`}>{label}</div>
                <div className="text-2xl font-semibold mt-1">{value ?? '—'}</div>
            </div>
        );
    };

    const StatusPill = ({ state }: { state: string }) => {
        const styles = state === 'healthy'
            ? { pill: 'bg-green-100 text-green-800', dot: 'bg-green-500' }
            : state === 'degraded'
                ? { pill: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' }
                : { pill: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' };
        return (
            <span className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-sm font-medium ${styles.pill}`}>
                <span className="relative inline-flex items-center">
                    <span className={`absolute inline-flex h-2 w-2 rounded-full opacity-60 animate-ping ${styles.dot}`}></span>
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${styles.dot}`}></span>
                </span>
                <span className="capitalize">{state}</span>
            </span>
        );
    };



    const StatCard = ({
        label,
        value,
        sublabel,
        icon,
        color = 'indigo',
    }: {
        label: string;
        value: string | number | null;
        sublabel?: string | null;
        icon: React.ReactNode;
        color?: 'indigo' | 'purple' | 'emerald' | 'orange';
    }) => {
        const colorMap: Record<string, string> = {
            indigo: 'bg-indigo-50 text-indigo-600',
            purple: 'bg-purple-50 text-purple-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            orange: 'bg-orange-50 text-orange-600',
        };
        return (
            <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-500">{label}</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">{value ?? '—'}</div>
                        {sublabel ? (
                            <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>
                        ) : null}
                    </div>
                    <div className={`h-10 w-10 grid place-items-center rounded-lg border ${colorMap[color]}`}>
                        {icon}
                    </div>
                </div>
            </div>
        );
    };

    const formatMs = (ms: number | null) => {
        if (ms == null) return '—';
        if (ms < 1000) return `${ms} ms`;
        return `${(ms / 1000).toFixed(2)} s`;
    };

    const BarMetric = ({ label, valueText, percent }: { label: string; valueText: string; percent: number }) => {
        const pct = Math.max(0, Math.min(100, Math.round(percent)));
        return (
            <div>
                <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>{label}</span>
                    <span className="text-gray-600">{valueText}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-gray-900" style={{ width: `${pct}%` }} />
                </div>
            </div>
        );
    };

    const responsePct = respTimeMs != null ? Math.max(0, Math.min(100, Math.round(100 - (respTimeMs / 2000) * 100))) : 0;
    const freshnessPct = freshnessSec != null ? Math.max(0, Math.min(100, Math.round(100 - (freshnessSec / 120) * 100))) : 0;
    const gpsPct = gpsAccuracy != null ? Math.max(0, Math.min(100, gpsAccuracy)) : 0;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">System Status</h1>
                    <p className="text-sm text-gray-500">Real-time monitoring and health metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void fetchAll()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                        title={lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
                    >
                        <RefreshCcw size={16} />
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Bus Stops"
                    value={stopsCount}
                    sublabel={typeof stopsCount === 'number' ? `of ${stopsCount} total` : null}
                    icon={<MapPin size={18} />}
                    color="indigo"
                />
                <StatCard
                    label="Routes"
                    value={routesCount}
                    sublabel={typeof routesCount === 'number' ? `of ${routesCount} total` : null}
                    icon={<RouteIcon size={18} />}
                    color="purple"
                />
                <StatCard
                    label="Active Vehicles"
                    value={typeof activeVehicles === 'number' ? activeVehicles : vehiclesCount}
                    sublabel={typeof vehiclesCount === 'number' ? `of ${vehiclesCount} total` : null}
                    icon={<Bus size={18} />}
                    color="emerald"
                />
                <StatCard
                    label="System Uptime"
                    value={formatUptime(health?.uptime ?? null)}
                    sublabel={overallStatus === 'healthy' ? 'Excellent' : overallStatus}
                    icon={<Activity size={18} />}
                    color="orange"
                />
            </div>

            {/* Lower Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-emerald-700">
                        <Activity size={18} />
                        <h2 className="font-semibold">System Health</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <ServiceBadge label="API Gateway" value={health ? health.status : 'unknown'} />
                        <ServiceBadge label="GPS Tracking" value={health?.services?.traccar} />
                        <ServiceBadge label="Database" value={health?.services?.database} />
                        <ServiceBadge label="Route Engine" value={health?.services?.data} />
                        <ServiceBadge label="Real-time Updates" value={overallStatus} />
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-emerald-700">
                        <Activity size={18} />
                        <h2 className="font-semibold">Performance Metrics</h2>
                    </div>
                    <div className="space-y-3">
                        <BarMetric label="Response Time" valueText={formatMs(respTimeMs)} percent={responsePct} />
                        <BarMetric label="GPS Accuracy" valueText={gpsAccuracy != null ? `${gpsAccuracy}%` : '—'} percent={gpsPct} />
                        <BarMetric label="Data Freshness" valueText={freshnessSec != null ? `${freshnessSec}s ago` : '—'} percent={freshnessPct} />
                    </div>
                </div>
            </div>

            {/* Debug (collapsible) */}
            <details className="bg-white border rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-medium">Raw Health</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-64">{JSON.stringify(health, null, 2)}</pre>
            </details>
        </div>
    );
}
