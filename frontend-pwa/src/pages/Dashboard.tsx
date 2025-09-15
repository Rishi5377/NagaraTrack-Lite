import React, { useState } from 'react';
import SegmentedControl from '@/components/SegmentedControl';

export default function Dashboard() {
    const [mode, setMode] = useState<'dashboard' | 'preview'>('dashboard');
    const [refreshedAt, setRefreshedAt] = useState<string>('');

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-semibold">Dashboard</h1>

            {/* Segmented control demo */}
            <section className="bg-white border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <SegmentedControl
                        onModeChange={setMode}
                        onRefresh={() => setRefreshedAt(new Date().toLocaleTimeString())}
                    />
                    {refreshedAt && (
                        <div className="text-xs text-gray-500">Refreshed at {refreshedAt}</div>
                    )}
                </div>

                {/* Dynamic content area based on active tab */}
                {mode === 'dashboard' ? (
                    <div className="text-sm text-gray-700">
                        Showing Dashboard content. Use the tabs to switch to Preview.
                    </div>
                ) : (
                    <div className="text-sm text-gray-700 space-y-2">
                        <div>Preview mode active. Use the desktop/mobile icons to imagine different views.</div>
                        <div className="flex items-center gap-3">
                            <div className="border rounded w-40 h-24 flex items-center justify-center text-xs text-gray-500">Desktop mock</div>
                            <div className="border rounded w-20 h-24 flex items-center justify-center text-xs text-gray-500">Mobile mock</div>
                        </div>
                    </div>
                )}
            </section>

            <div className="grid gap-4 md:grid-cols-2">
                <section className="bg-white border rounded-lg p-4">
                    <h2 className="font-semibold mb-2">Overview</h2>
                    <p className="text-sm text-gray-600">Summary and quick metrics.</p>
                </section>
                <section className="bg-white border rounded-lg p-4">
                    <h2 className="font-semibold mb-2">User</h2>
                    <p className="text-sm text-gray-600">User-related information.</p>
                </section>
                <section className="bg-white border rounded-lg p-4">
                    <h2 className="font-semibold mb-2">Data</h2>
                    <p className="text-sm text-gray-600">Data sources and quality.</p>
                </section>
                <section className="bg-white border rounded-lg p-4">
                    <h2 className="font-semibold mb-2">Analytics</h2>
                    <p className="text-sm text-gray-600">Charts and insights.</p>
                </section>
            </div>
        </div>
    );
}
