import React from 'react';
import logoUrl from '@/assets/logo.svg';
import { Link, useLocation } from 'react-router-dom';
import { Map as MapIcon, Activity, Database, BarChart3, Settings, ChevronDown, ChevronRight, Route as RouteIcon, Bus, MapPin } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [dataOpen, setDataOpen] = React.useState(true);
    const nav = [
        { title: 'Live Map', href: '/', icon: <MapIcon size={16} /> },
        { title: 'System Status', href: '/status', icon: <Activity size={16} /> },
        { title: 'Analytics', href: '/analytics', icon: <BarChart3 size={16} /> },
        { title: 'Settings', href: '/settings', icon: <Settings size={16} /> },
    ];

    return (
        <div className="min-h-screen flex bg-gray-50">
            <aside className="w-64 hidden md:block bg-white border-r">
                <div className="p-4 font-bold flex items-center gap-2">
                    <img src={logoUrl} alt="NagaraTrack logo" className="w-7 h-7" />
                    <div>
                        <div>NagaraTrack</div>
                        <div className="text-xs font-normal text-blue-600">Lite Edition</div>
                    </div>
                </div>
                <div className="px-4 text-xs uppercase tracking-wide text-gray-400">Navigation</div>
                <nav className="p-2 space-y-1">
                    {nav.map((n) => {
                        const active = location.pathname === n.href;
                        return (
                            <Link
                                key={n.href}
                                to={n.href}
                                aria-current={active ? 'page' : undefined}
                                className={`flex items-center gap-2 rounded px-3 py-2 transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50 hover:text-blue-700'}`}
                            >
                                <span className="text-gray-500">{n.icon}</span>
                                <span>{n.title}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-4 mt-2 text-xs uppercase tracking-wide text-gray-400">Data</div>
                <div className="p-2">
                    <button
                        className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => setDataOpen((v) => !v)}
                        aria-expanded={dataOpen}
                    >
                        <span className="flex items-center gap-2"><Database size={16} className="text-gray-500" /> Collections</span>
                        {dataOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {dataOpen && (
                        <div className="mt-1 ml-6 space-y-1">
                            {[
                                { title: 'Bus Stops', href: '/data/stops', icon: <MapPin size={14} /> },
                                { title: 'Routes', href: '/data/routes', icon: <RouteIcon size={14} /> },
                                { title: 'Vehicles', href: '/data/vehicles', icon: <Bus size={14} /> },
                            ].map((n) => {
                                const active = location.pathname === n.href;
                                return (
                                    <Link
                                        key={n.href}
                                        to={n.href}
                                        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50 hover:text-blue-700'}`}
                                    >
                                        <span className="text-gray-500">{n.icon}</span>
                                        <span>{n.title}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>
            <main className="flex-1 min-w-0 min-h-screen flex flex-col">{children}</main>
        </div>
    );
}
