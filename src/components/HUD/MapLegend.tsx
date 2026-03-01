import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';

export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const { mapStyle } = useStore();

  // SVG Paths from PlaceManager.tsx
  const wrenchPath = "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";
  const gasPath = "M19.8 18.4a1.8 1.8 0 0 0 1.2-1.7V8.3a1.8 1.8 0 0 0-1.8-1.8h-1.4V4.8A1.8 1.8 0 0 0 16 3H8a1.8 1.8 0 0 0-1.8 1.8v13.4H5v-2h1.2V4.8A3 3 0 0 0 3.2 7.8v8.4H2v2h16v-2h-1.2v-6.8h2.4v7.3c0 .5.4.9.9.9s.9-.4.9-.9v-1.3zM8 15V6h6v9H8z";
  const parkingPath = "M13.5 4h-6a1 1 0 0 0-1 1v14a1 1 0 0 0 2 0v-5h5a5 5 0 0 0 0-10zm0 8h-5V6h5a3 3 0 0 1 0 6z";
  const foodPath = "M12 2C7.58 2 4 4.24 4 7v2h16V7c0-2.76-3.58-5-8-5zm-8 6v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V8H4z";

  const items = [
    { label: "Mechanic / Repair", path: wrenchPath, color: "#fbbf24" },
    { label: "Gas Station", path: gasPath, color: "#ef4444" },
    { label: "Parking / Hideout", path: parkingPath, color: "#3b82f6" },
    { label: "Food / Takeaway", path: foodPath, color: "#10b981" },
  ];

  return (
    <div className="relative pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-xl border backdrop-blur-md transition-all shadow-lg",
          mapStyle === 'game-night'
            ? "bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white"
            : "bg-white/90 border-slate-200 text-slate-500 hover:text-slate-800"
        )}
        title="Map Legend"
      >
        {isOpen ? <X size={20} /> : <Info size={20} />}
      </button>

      {isOpen && (
        <div className={cn(
          "absolute top-full right-0 mt-2 w-48 p-3 rounded-xl border backdrop-blur-md shadow-xl z-50",
          mapStyle === 'game-night'
            ? "bg-slate-900/95 border-slate-700 text-white"
            : "bg-white/95 border-slate-200 text-slate-800"
        )}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-70">Map Icons</h3>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill={item.color}>
                    <path d={item.path} />
                  </svg>
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
