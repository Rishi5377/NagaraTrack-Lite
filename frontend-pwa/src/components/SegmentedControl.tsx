import React, { useEffect, useRef } from 'react';

type Props = {
    onRefresh?: () => void;
    onModeChange?: (mode: 'dashboard' | 'preview') => void;
};

// A reusable segmented control with Dashboard/Preview tabs, refresh icon,
// and preview options (desktop/mobile) that fade in when Preview is active.
export default function SegmentedControl({ onRefresh, onModeChange }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const tab = target.closest('.tab') as HTMLButtonElement | null;
            if (!tab) return;

            // Toggle active state
            const currentActive = el.querySelector('.tab.tab--active');
            if (currentActive && currentActive !== tab) currentActive.classList.remove('tab--active');
            tab.classList.add('tab--active');

            const previewOptions = el.querySelector('.preview-options');
            const isPreview = tab.classList.contains('tab--preview');
            if (previewOptions) {
                previewOptions.classList.toggle('preview-options--visible', isPreview);
            }

            if (onModeChange) onModeChange(isPreview ? 'preview' : 'dashboard');
        };

        el.addEventListener('click', onClick);
        return () => el.removeEventListener('click', onClick);
    }, [onModeChange]);

    return (
        <div ref={containerRef} className="segmented-control flex items-center gap-2 rounded-lg px-1 py-1 bg-gray-100 border">
            <button className="tab tab--dashboard tab--active px-3 py-1.5 text-sm rounded-md hover:bg-white">Dashboard</button>
            <button className="tab tab--preview px-3 py-1.5 text-sm rounded-md hover:bg-white">Preview</button>
            <button
                className="icon-refresh ml-1 p-1.5 rounded-md hover:bg-white"
                aria-label="Refresh"
                onClick={(e) => {
                    e.stopPropagation();
                    onRefresh?.();
                }}
                title="Refresh"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <path d="M21 3v6h-6" />
                </svg>
            </button>

            <div className="preview-options opacity-0 invisible transition-opacity duration-300 ease-in-out flex items-center gap-1 ml-2">
                <button className="p-1.5 rounded-md hover:bg-white" aria-label="Desktop preview" title="Desktop">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <path d="M7 20h10" />
                    </svg>
                </button>
                <button className="p-1.5 rounded-md hover:bg-white" aria-label="Mobile preview" title="Mobile">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <rect x="7" y="2" width="10" height="20" rx="2" />
                        <path d="M11 18h2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
