import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Gauge, Navigation, Users, Radio, Play, Square, Map as MapIcon, Zap, Sun, Moon, Crosshair } from 'lucide-react';
import { AssistantPanel } from './AssistantPanel';
import { CrewPanel } from '../Session/CrewPanel';
import { LeaderboardPanel } from '../Leaderboard/LeaderboardPanel';
import { SearchBar } from './SearchBar';
import { useLocation } from '../../hooks/useLocation';
import { MapLegend } from './MapLegend';

export function HUD() {
  const { 
    currentRunStats, 
    isRecording, 
    setRecording, 
    mapStyle, 
    setMapStyle,
    isSimulatorActive,
    toggleSimulator
  } = useStore();
  
  const location = useLocation();

  const speed = currentRunStats?.speed || 0;
  const distance = currentRunStats?.distance || 0;

  const handlePlaceSelect = (location: google.maps.LatLng) => {
    // Call the global routing function exposed by GameMap
    if ((window as any).calculateRoute) {
      (window as any).calculateRoute(location);
    }
  };

  const handleLocateMe = () => {
    if (location && (window as any).panToLocation) {
      (window as any).panToLocation({ lat: location.lat, lng: location.lng });
    }
  };

  return (
    <>
      <CrewPanel />
      <LeaderboardPanel />
      
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
        
        {/* Top Bar: Search & Controls */}
        <div className="flex justify-between items-start pointer-events-auto w-full gap-4">
          {/* Left Spacer for CrewPanel */}
          <div className="w-16 md:w-72 flex-shrink-0" /> 
          
          {/* Centered Search Bar */}
          <div className="flex-grow flex justify-center">
            <SearchBar onPlaceSelect={handlePlaceSelect} />
          </div>

          {/* Right Side: Style Toggles & Locate */}
          <div className="flex gap-2 flex-shrink-0 items-start">
            <MapLegend />
            
             <button 
              onClick={toggleSimulator}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors backdrop-blur-md",
                isSimulatorActive 
                  ? "bg-purple-500/20 border-purple-500 text-purple-400" 
                  : "bg-black/40 border-white/10 text-gray-400"
              )}
            >
              {isSimulatorActive ? "SIM ON" : "SIM OFF"}
            </button>
            
            <button
              onClick={handleLocateMe}
              className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white transition-colors"
              title="Locate Me"
            >
              <Crosshair size={18} />
            </button>
            
            <div className="flex bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-1">
              <button
                onClick={() => setMapStyle('game-day')}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  mapStyle === 'game-day' ? "bg-white text-black" : "text-gray-400 hover:text-white"
                )}
              >
                <Sun size={18} />
              </button>
              <button
                onClick={() => setMapStyle('game-night')}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  mapStyle === 'game-night' ? "bg-slate-800 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                <Moon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Speedometer & Controls */}
        <div className="flex items-end justify-end pointer-events-auto">
          
          {/* Speedometer Cluster */}
          <div className="flex items-end gap-6">
            {/* Run Controls */}
            <div className="flex flex-col gap-2 mb-4">
               <button
                onClick={() => setRecording(!isRecording)}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]",
                  isRecording 
                    ? "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30" 
                    : "bg-emerald-500/20 border-emerald-500 text-emerald-500 hover:bg-emerald-500/30"
                )}
              >
                {isRecording ? <Square fill="currentColor" /> : <Play fill="currentColor" />}
              </button>
              <div className="text-center font-mono text-xs text-gray-400 uppercase tracking-widest">
                {isRecording ? "REC" : "START"}
              </div>
            </div>

            {/* Main Gauge */}
            <div className="relative">
              <svg width="200" height="200" viewBox="0 0 200 200" className="transform rotate-90">
                {/* Background Arc */}
                <circle cx="100" cy="100" r="90" fill="none" stroke={mapStyle === 'game-day' ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} strokeWidth="10" strokeDasharray="400" strokeDashoffset="100" />
                {/* Active Arc */}
                <motion.circle 
                  cx="100" 
                  cy="100" 
                  r="90" 
                  fill="none" 
                  stroke={speed > 100 ? "#ef4444" : "#10b981"} 
                  strokeWidth="10" 
                  strokeDasharray="565" // 2 * pi * 90
                  strokeDashoffset={565 - (Math.min(speed, 200) / 200) * 400} // Map 0-200kmh to arc
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn("text-6xl font-black tracking-tighter italic", mapStyle === 'game-day' ? "text-slate-800" : "text-white")}>
                  {Math.round(speed)}
                </div>
                <div className="text-sm font-bold text-gray-500 tracking-widest mt-1">KM/H</div>
              </div>
            </div>

            {/* Stats */}
            <div className={cn(
              "backdrop-blur-md border-l-2 pl-4 py-2 mb-8",
              mapStyle === 'game-day' ? "bg-white/60 border-black/10" : "bg-black/60 border-white/20"
            )}>
              <div className="mb-2">
                <div className="text-xs text-gray-500 font-mono uppercase">Distance</div>
                <div className={cn("text-xl font-mono", mapStyle === 'game-day' ? "text-slate-800" : "text-white")}>
                  {distance.toFixed(1)} <span className="text-sm text-gray-500">KM</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-mono uppercase">Time</div>
                <div className={cn("text-xl font-mono", mapStyle === 'game-day' ? "text-slate-800" : "text-white")}>
                  00:00
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Assistant Panel */}
      <div className="absolute bottom-0 left-0 z-20 pointer-events-auto">
        <AssistantPanel />
      </div>
    </>
  );
}
