import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Gauge, Navigation, Users, Radio, Play, Square, Map as MapIcon, Zap, Sun, Moon, Crosshair, Share2, X, Sparkles } from 'lucide-react';
import { AssistantPanel } from './AssistantPanel';
import { CrewPanel } from '../Session/CrewPanel';
import { LeaderboardPanel } from '../Leaderboard/LeaderboardPanel';
import { SearchBar } from './SearchBar';
import { useLocation } from '../../hooks/useLocation';
import { MapLegend } from './MapLegend';
import { gamifyName } from '../../lib/nameGamifier';
import { ShareStats } from '../Social/ShareStats';

// Helper: Haversine distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Helper: Format seconds to MM:SS
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function HUD() {
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);

  const { 
    currentRunStats, 
    isRecording, 
    setRecording, 
    mapStyle, 
    setMapStyle,
    isSimulatorActive,
    toggleSimulator,
    activeTarget,
    setActiveTarget
  } = useStore();
  
  const location = useLocation();
  
  const speed = currentRunStats?.speed || 0;
  const distance = currentRunStats?.distance || 0;
  const duration = currentRunStats?.duration || 0;

  // Calculate distance to active target
  const targetDistance = activeTarget && location ? getDistance(
    location.lat, location.lng, 
    activeTarget.location.lat, activeTarget.location.lng
  ) : null;

  // Calculate progress percentage
  const progress = activeTarget?.totalDistance && targetDistance !== null
    ? Math.max(0, Math.min(1, 1 - (targetDistance / activeTarget.totalDistance)))
    : 0;

  const handlePlaceSelect = (location: google.maps.LatLng, name?: string) => {
    // Call the global routing function exposed by GameMap
    if ((window as any).calculateRoute) {
      (window as any).calculateRoute(location, name);
    }
  };

  const handleLocateMe = async () => {
    // Request device orientation permission for iOS
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        await (DeviceOrientationEvent as any).requestPermission();
      } catch (e) {
        console.error("Compass permission denied", e);
      }
    }

    if (location && (window as any).panToLocation) {
      (window as any).panToLocation({ lat: location.lat, lng: location.lng });
    }
  };

  return (
    <>
      <ShareStats isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
      
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
        
        {/* Top Bar: Search, Crew, Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between pointer-events-auto w-full gap-2 p-4 md:p-6 z-50">
          
          {/* Row 1 (Mobile): Search Bar */}
          <div className="w-full md:w-auto md:flex-1 md:order-2 flex flex-col items-center gap-3 z-50 order-1">
            <div className="flex flex-col md:flex-row items-center gap-3 w-full justify-center">
              <SearchBar onPlaceSelect={handlePlaceSelect} />
            </div>
            
            {/* Active Target Indicator */}
            {activeTarget && (
              <div className="bg-black/80 backdrop-blur-xl text-white px-3 py-1.5 md:px-6 md:py-3 rounded-2xl border border-emerald-500/50 flex flex-col gap-1.5 md:gap-2 animate-in fade-in slide-in-from-top-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] w-auto min-w-[160px] md:min-w-[240px]">
                <div className="flex items-center justify-between gap-2 md:gap-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="relative">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-500 rounded-full animate-pulse" />
                      <div className="absolute inset-0 w-2 h-2 md:w-3 md:h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-400">Target</span>
                      <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-white truncate max-w-[80px] md:max-w-[120px]">
                        {gamifyName(activeTarget.name)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 md:h-8 w-px bg-white/10 mx-1 md:mx-2" />
                    <div className="flex items-center">
                      <span className="font-mono text-sm md:text-xl font-bold text-emerald-400 tabular-nums">
                        {targetDistance ? Math.round(targetDistance) : '?'}
                        <span className="text-[10px] md:text-xs ml-1 text-emerald-600">M</span>
                      </span>
                      <button 
                        onClick={() => {
                          setActiveTarget(null);
                          if ((window as any).clearRoute) {
                            (window as any).clearRoute();
                          }
                        }}
                        className="ml-1 md:ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                      >
                        <X size={12} className="md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {activeTarget.totalDistance && (
                  <div className="w-full flex flex-col gap-1">
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                      />
                    </div>
                    <div className="flex justify-between items-center px-0.5">
                      <span className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-tighter">Progress</span>
                      <span className="text-[8px] font-mono font-bold text-emerald-400">{Math.round(progress * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 2 (Mobile): Controls Row (Crew + Right Controls) */}
          <div className="w-full md:w-auto flex justify-between items-center md:contents order-2 md:order-1">
            {/* Left: Crew Panel */}
            <div className="flex-shrink-0 md:order-1">
              <CrewPanel />
            </div>

            {/* Right: Controls */}
            <div className="flex gap-1.5 md:gap-2 flex-shrink-0 items-center md:order-3">
              <MapLegend />
              
              {/* Assistant Toggle (Mobile) */}
              <button 
                onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                className={cn(
                  "w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 rounded-full md:rounded-2xl flex items-center justify-center border transition-all backdrop-blur-xl shadow-lg",
                  isAssistantOpen 
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                    : "bg-black/60 border-white/10 text-gray-400 hover:bg-black/80 hover:text-white"
                )}
                title="AI Assistant"
              >
                <Sparkles size={18} className={cn(isAssistantOpen && "fill-current")} />
                <span className="hidden md:inline text-xs font-bold uppercase tracking-wider ml-2">CO-PILOT</span>
              </button>

              <button 
                onClick={toggleSimulator}
                className={cn(
                  "w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 rounded-full md:rounded-2xl flex items-center justify-center border transition-all backdrop-blur-xl shadow-lg",
                  isSimulatorActive 
                    ? "bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]" 
                    : "bg-black/60 border-white/10 text-gray-400 hover:bg-black/80 hover:text-white"
                )}
                title={isSimulatorActive ? "Simulator On" : "Simulator Off"}
              >
                <Zap size={18} className={cn(isSimulatorActive && "fill-current")} />
                <span className="hidden md:inline text-xs font-bold uppercase tracking-wider ml-2">
                  {isSimulatorActive ? "SIM ON" : "SIM OFF"}
                </span>
              </button>
              
              <div className="hidden md:flex gap-2">
                <button
                  onClick={handleLocateMe}
                  className="p-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-gray-400 hover:text-white hover:bg-black/80 transition-all shadow-lg"
                  title="Locate Me"
                >
                  <Crosshair size={20} />
                </button>
                
                <div className="flex bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-1.5 shadow-lg gap-1">
                  <button
                    onClick={() => setMapStyle('game-day')}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      mapStyle === 'game-day' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Sun size={18} />
                  </button>
                  <button
                    onClick={() => setMapStyle('game-night')}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      mapStyle === 'game-night' ? "bg-slate-800 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Moon size={18} />
                  </button>
                </div>
              </div>

              {/* Leaderboard Button */}
              <LeaderboardPanel />
            </div>
          </div>
        </div>

        {/* Bottom Bar: Speedometer & Controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4 pb-4 md:pb-8 pointer-events-none">
          
          {/* Left: Controls */}
          <div className="flex flex-col gap-3 pointer-events-auto mb-2 md:mb-0">
             {/* Run Control */}
             <div className="flex flex-col gap-1 items-center">
               <button
                onClick={() => setRecording(!isRecording)}
                className={cn(
                  "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 transition-all shadow-lg hover:scale-105 active:scale-95",
                  isRecording 
                    ? "bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]" 
                    : "bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                )}
              >
                {isRecording ? <Square fill="currentColor" size={20} className="md:w-6 md:h-6" /> : <Play fill="currentColor" size={24} className="ml-1 md:w-7 md:h-7" />}
              </button>
              <div className="text-center font-mono text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                {isRecording ? "REC" : "START"}
              </div>
            </div>

            {/* Share Button */}
            <div className="flex flex-col gap-1 items-center">
               <button
                onClick={() => setIsShareOpen(true)}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-white/20 bg-black/60 backdrop-blur-xl text-white hover:bg-white/10 hover:border-white/40 transition-all shadow-lg hover:scale-105 active:scale-95"
                title="Share Stats"
              >
                <Share2 size={18} className="md:w-5 md:h-5" />
              </button>
            </div>

            {/* Recenter Button */}
            <div className="flex flex-col gap-1 items-center">
               <button
                onClick={handleLocateMe}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-emerald-500/50 bg-emerald-500/10 backdrop-blur-xl text-emerald-400 hover:bg-emerald-500/20 transition-all shadow-lg hover:scale-105 active:scale-95"
                title="Recenter Map"
              >
                <Crosshair size={18} className="md:w-5 md:h-5" />
              </button>
              <div className="text-center font-mono text-[8px] font-bold text-emerald-500/60 uppercase tracking-widest">
                CENTER
              </div>
            </div>
          </div>

          {/* Center: Speedometer */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 md:bottom-8 pointer-events-auto scale-[0.45] md:scale-[0.8] origin-bottom">
            <div className="relative group">
              {/* Glow Effect */}
              <div className={cn(
                "absolute inset-0 rounded-full blur-3xl opacity-20 transition-opacity duration-500",
                speed > 100 ? "bg-red-500" : "bg-emerald-500"
              )} />
              
              <svg width="240" height="240" viewBox="0 0 240 240" className="transform rotate-90 relative z-10">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                
                {/* Background Arc */}
                <circle cx="120" cy="120" r="100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" strokeDasharray="450" strokeDashoffset="100" strokeLinecap="round" />
                
                {/* Active Arc */}
                <motion.circle 
                  cx="120" 
                  cy="120" 
                  r="100" 
                  fill="none" 
                  stroke="url(#gaugeGradient)" 
                  strokeWidth="12" 
                  strokeDasharray="628" // 2 * pi * 100
                  strokeDashoffset={628 - (Math.min(speed, 240) / 240) * 450} // Map 0-240kmh to arc
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                />
                
                {/* Ticks */}
                {[...Array(13)].map((_, i) => (
                  <line 
                    key={i}
                    x1="120" y1="10" x2="120" y2="20" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="2"
                    transform={`rotate(${(i * 20) + 45} 120 120)`} // Start at 45deg
                  />
                ))}
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <div className={cn(
                  "text-7xl font-black tracking-tighter italic tabular-nums transition-colors duration-300 drop-shadow-lg", 
                  mapStyle === 'game-day' ? "text-slate-800" : "text-white"
                )}>
                  {Math.round(speed)}
                </div>
                <div className="text-sm font-bold text-gray-400 tracking-[0.3em] mt-2 uppercase">KM/H</div>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className={cn(
            "pointer-events-auto backdrop-blur-xl border border-white/10 rounded-2xl p-3 md:p-4 mb-2 md:mb-10 shadow-lg transition-all text-right",
            mapStyle === 'game-day' ? "bg-white/80 border-black/10" : "bg-black/60 border-white/20"
          )}>
            <div className="mb-2">
              <div className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Distance</div>
              <div className={cn("text-lg md:text-2xl font-mono font-bold", mapStyle === 'game-day' ? "text-slate-800" : "text-white")}>
                {distance.toFixed(1)} <span className="text-[10px] md:text-sm text-gray-500 font-normal">KM</span>
              </div>
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Time</div>
              <div className={cn("text-lg md:text-2xl font-mono font-bold", mapStyle === 'game-day' ? "text-slate-800" : "text-white")}>
                {formatDuration(duration)}
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Assistant Panel */}
      <AssistantPanel isOpen={isAssistantOpen} setIsOpen={setIsAssistantOpen} />
    </>
  );
}
