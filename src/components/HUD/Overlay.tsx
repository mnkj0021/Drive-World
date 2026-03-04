import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Gauge, Navigation, Users, Radio, Play, Square, Map as MapIcon, Zap, Sun, Moon, Crosshair, Share2, X, Sparkles, Camera, Eye, EyeOff, Settings, Trophy, Signal } from 'lucide-react';
import { AssistantPanel } from './AssistantPanel';
import { CrewPanel } from '../Session/CrewPanel';
import { LeaderboardPanel } from '../Leaderboard/LeaderboardPanel';
import { SearchBar } from './SearchBar';
import { WeatherWidget } from './WeatherWidget';
import { WelcomeBanner } from './WelcomeBanner';
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
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [showCompletion, setShowCompletion] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<any>(null);

  const currentRunStats = useStore(state => state.currentRunStats);
  const history = useStore(state => state.history);
  const isRecording = useStore(state => state.isRecording);
  const setRecording = useStore(state => state.setRecording);
  const mapStyle = useStore(state => state.mapStyle);
  const setMapStyle = useStore(state => state.setMapStyle);
  const isSimulatorActive = useStore(state => state.isSimulatorActive);
  const toggleSimulator = useStore(state => state.toggleSimulator);
  const cameraSettings = useStore(state => state.cameraSettings);
  const setCameraSettings = useStore(state => state.setCameraSettings);
  const followUser = useStore(state => state.followUser);
  const setFollowUser = useStore(state => state.setFollowUser);
  const activeTarget = useStore(state => state.activeTarget);
  const setActiveTarget = useStore(state => state.setActiveTarget);
  const showHUD = useStore(state => state.showHUD);
  const setShowHUD = useStore(state => state.setShowHUD);
  const toggleSettings = useStore(state => state.toggleSettings);
  
  const challenges = useStore(state => state.challenges);
  const [completedChallenge, setCompletedChallenge] = React.useState<any | null>(null);
  const prevChallenges = React.useRef(challenges);

  React.useEffect(() => {
    const newCompletion = challenges.find(c => c.completed && !prevChallenges.current.find(pc => pc.id === c.id)?.completed);
    if (newCompletion) {
      setCompletedChallenge(newCompletion);
      setTimeout(() => setCompletedChallenge(null), 5000);
    }
    prevChallenges.current = challenges;
  }, [challenges]);

  const location = useLocation();
  
  // Track recording state to show completion summary
  const prevIsRecording = React.useRef(isRecording);
  React.useEffect(() => {
    if (prevIsRecording.current && !isRecording && history.length > 0) {
      setLastRun(history[0]);
      setShowCompletion(true);
      setTimeout(() => setShowCompletion(false), 5000);
    }
    prevIsRecording.current = isRecording;
  }, [isRecording, history]);

  const speed = currentRunStats?.speed || 0;
  const distance = currentRunStats?.distance || 0;
  const duration = currentRunStats?.duration || 0;

  // Calculate distance to active target (straight line)
  const targetDistance = activeTarget && location ? getDistance(
    location.lat, location.lng, 
    activeTarget.location.lat, activeTarget.location.lng
  ) : null;

  // Calculate estimated road distance remaining
  // We use the ratio of current straight-line distance to initial straight-line distance
  // to scale the initial road distance.
  const estimatedRoadDistance = activeTarget?.totalDistance && activeTarget?.initialDistance && targetDistance !== null
    ? (targetDistance / activeTarget.initialDistance) * activeTarget.totalDistance
    : targetDistance;

  // Calculate progress percentage
  // We use the straight-line distance ratio to ensure it starts at 0% and ends at 100%
  const progress = activeTarget?.initialDistance && activeTarget.initialDistance > 0 && targetDistance !== null
    ? Math.max(0, Math.min(1, 1 - (targetDistance / activeTarget.initialDistance)))
    : 0;

  const handlePlaceSelect = (location: { lat: number, lng: number }, name?: string) => {
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
      setFollowUser(true);
    }
  };

  return (
    <>
      {showHUD && <WelcomeBanner />}
      <ShareStats isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />

      {showHUD && completedChallenge && (
        <motion.div 
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.5)] border border-yellow-400/50 flex flex-col items-center gap-2 min-w-[280px]"
        >
          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-200 animate-bounce" size={24} />
            <span className="text-lg font-black uppercase tracking-tighter italic">Challenge Complete!</span>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-yellow-100">{completedChallenge.title}</div>
            <div className="text-xs text-yellow-200/80 mt-1">+{completedChallenge.rewardXP} XP Awarded</div>
          </div>
        </motion.div>
      )}

      {/* Run Completion Toast */}
      {showHUD && showCompletion && lastRun && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.5)] border border-emerald-400/50 flex flex-col items-center gap-2 min-w-[280px]"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="text-emerald-200 animate-pulse" />
            <span className="text-lg font-black uppercase tracking-tighter italic">Destination Reached!</span>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full mt-2 border-t border-emerald-500/30 pt-3">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-emerald-200/70">Dist</span>
              <span className="font-mono font-bold">{lastRun.distanceKm.toFixed(1)}km</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-emerald-200/70">Avg</span>
              <span className="font-mono font-bold">{Math.round(lastRun.avgSpeedKmh)}km/h</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-emerald-200/70">Time</span>
              <span className="font-mono font-bold">{formatDuration(lastRun.durationSec)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* History Overlay */}
      {showHUD && isHistoryOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-bottom border-white/10 flex items-center justify-between bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <Navigation size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">Run History</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{history.length} Completed Runs</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                  <MapIcon size={48} className="opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-sm">No runs recorded yet</p>
                </div>
              ) : (
                history.map((run) => (
                  <div key={run.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <Zap size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-wider">
                            {new Date(run.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Completed Run</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-emerald-400">{run.distanceKm.toFixed(2)} KM</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{formatDuration(run.durationSec)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                      <div className="flex items-center justify-between px-2 py-1 bg-black/20 rounded-lg">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Avg Speed</span>
                        <span className="text-xs font-mono font-bold text-white">{Math.round(run.avgSpeedKmh)} km/h</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 bg-black/20 rounded-lg">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Top Speed</span>
                        <span className="text-xs font-mono font-bold text-white">{Math.round(run.topSpeedKmh)} km/h</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* HUD Toggle (Persistent) */}
      <div className="fixed top-6 right-6 z-[120] pointer-events-auto flex flex-col gap-2">
        {/* GPS Signal Indicator */}
        {location && location.accuracy && (
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-xl shadow-lg transition-all",
            location.accuracy < 20 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" :
            location.accuracy < 50 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" :
            "bg-red-500/20 text-red-400 border-red-500/50"
          )} title={`GPS Accuracy: ±${Math.round(location.accuracy)}m`}>
            <Signal size={18} />
          </div>
        )}

        <button 
          onClick={toggleSettings}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-white/10 bg-black/60 backdrop-blur-xl text-gray-400 hover:bg-black/80 hover:text-white transition-all shadow-lg"
          title="Settings"
        >
          <Settings size={18} />
        </button>

        <button 
          onClick={() => setShowHUD(!showHUD)}
          className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-all backdrop-blur-xl shadow-lg",
            showHUD 
              ? "bg-black/60 border-white/10 text-gray-400 hover:bg-black/80 hover:text-white"
              : "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          )}
          title={showHUD ? "Hide HUD" : "Show HUD"}
        >
          {showHUD ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className={cn(
        "absolute inset-0 pointer-events-none z-10 flex flex-col justify-between transition-opacity duration-500",
        !showHUD && "opacity-0 pointer-events-none"
      )}>
        
        {/* Top Bar: Search, Crew, Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between pointer-events-auto w-full gap-2 p-4 md:p-6 z-50">
          
          {/* Row 1 (Mobile): Search Bar */}
          <div className="w-full md:w-auto md:flex-1 md:order-2 flex flex-col items-center gap-3 z-50 order-1">
            <div className="flex flex-col md:flex-row items-center gap-3 w-full justify-center">
              <WeatherWidget />
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
                        {estimatedRoadDistance ? Math.round(estimatedRoadDistance) : '?'}
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
              
              {/* History Button */}
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 rounded-full md:rounded-2xl flex items-center justify-center border border-white/10 bg-black/60 backdrop-blur-xl text-gray-400 hover:bg-black/80 hover:text-white transition-all shadow-lg"
                title="Run History"
              >
                <MapIcon size={18} />
                <span className="hidden md:inline text-xs font-bold uppercase tracking-wider ml-2">LOGS</span>
              </button>

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

              {/* Camera Toggle */}
              <button 
                onClick={() => setCameraSettings({ showFeed: !cameraSettings.showFeed })}
                className={cn(
                  "w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 rounded-full md:rounded-2xl flex items-center justify-center border transition-all backdrop-blur-xl shadow-lg",
                  cameraSettings.showFeed 
                    ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                    : "bg-black/60 border-white/10 text-gray-400 hover:bg-black/80 hover:text-white"
                )}
                title="Vehicle Camera"
              >
                <Camera size={18} className={cn(cameraSettings.showFeed && "fill-current")} />
                <span className="hidden md:inline text-xs font-bold uppercase tracking-wider ml-2">CAM</span>
              </button>
              
              <div className="hidden md:flex gap-2">
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

            {/* Follow Toggle */}
            <div className="flex flex-col gap-1 items-center">
               <button
                onClick={() => setFollowUser(!followUser)}
                className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-all shadow-lg hover:scale-105 active:scale-95",
                  followUser 
                    ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                    : "bg-black/60 border-white/20 text-gray-400 hover:bg-black/80 hover:text-white"
                )}
                title={followUser ? "Follow On" : "Follow Off"}
              >
                <Navigation size={18} className={cn("md:w-5 md:h-5", followUser && "fill-current")} />
              </button>
              <div className="text-center font-mono text-[8px] font-bold text-blue-500/60 uppercase tracking-widest">
                FOLLOW
              </div>
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
      {showHUD && <AssistantPanel isOpen={isAssistantOpen} setIsOpen={setIsAssistantOpen} />}
    </>
  );
}
