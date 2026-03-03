import React from 'react';
import { useStore } from '../../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { X, Map, Camera, Eye, User, Trophy, Navigation } from 'lucide-react';

export function SettingsPanel() {
  const isSettingsOpen = useStore(state => state.isSettingsOpen);
  const toggleSettings = useStore(state => state.toggleSettings);
  const mapStyle = useStore(state => state.mapStyle);
  const setMapStyle = useStore(state => state.setMapStyle);
  const showHUD = useStore(state => state.showHUD);
  const setShowHUD = useStore(state => state.setShowHUD);
  const cameraSettings = useStore(state => state.cameraSettings);
  const setCameraSettings = useStore(state => state.setCameraSettings);
  const user = useStore(state => state.user);
  const challenges = useStore(state => state.challenges);

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSettings}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Driver Profile</h2>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Settings & Preferences</p>
                </div>
              </div>
              <button 
                onClick={toggleSettings}
                className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Profile Section */}
              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Identity</h3>
                <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-4 border border-white/5">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-slate-900"
                    style={{ backgroundColor: user?.avatarColor || '#cbd5e1' }}
                  >
                    {user?.displayName?.substring(0, 2).toUpperCase() || 'DR'}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{user?.displayName || 'Anonymous Driver'}</div>
                    <div className="text-sm text-slate-400">ID: {user?.uid || '---'}</div>
                  </div>
                </div>
              </section>

              {/* Map Preferences */}
              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Map size={14} /> Map Interface
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setMapStyle('game-day')}
                    className={`p-4 rounded-xl border-2 transition-all ${mapStyle === 'game-day' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  >
                    <div className="font-bold text-white mb-1">Day Mode</div>
                    <div className="text-xs text-slate-400">High visibility, bright style</div>
                  </button>
                  <button 
                    onClick={() => setMapStyle('game-night')}
                    className={`p-4 rounded-xl border-2 transition-all ${mapStyle === 'game-night' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  >
                    <div className="font-bold text-white mb-1">Night Mode</div>
                    <div className="text-xs text-slate-400">Dark theme, neon accents</div>
                  </button>
                </div>
              </section>

              {/* HUD & Camera */}
              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Navigation size={14} /> Cockpit Controls
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Eye size={18} /></div>
                      <div>
                        <div className="font-bold text-white">Heads-Up Display</div>
                        <div className="text-xs text-slate-400">Show speed, map, and status overlays</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowHUD(!showHUD)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${showHUD ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showHUD ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 text-red-400 rounded-lg"><Camera size={18} /></div>
                      <div>
                        <div className="font-bold text-white">Rear Camera Feed</div>
                        <div className="text-xs text-slate-400">Picture-in-picture rear view</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setCameraSettings({ showFeed: !cameraSettings.showFeed })}
                      className={`w-12 h-6 rounded-full relative transition-colors ${cameraSettings.showFeed ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${cameraSettings.showFeed ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </section>

              {/* Active Challenges */}
              <section>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Trophy size={14} /> Active Challenges
                </h3>
                <div className="space-y-3">
                  {challenges.map(challenge => (
                    <div key={challenge.id} className="p-4 bg-white/5 rounded-xl border border-white/5 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                          <div className="font-bold text-white">{challenge.title}</div>
                          <div className="text-xs text-slate-400">{challenge.description}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${challenge.completed ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          {challenge.completed ? 'Completed' : `${challenge.rewardXP} XP`}
                        </div>
                      </div>
                      
                      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden z-10">
                        <div 
                          className={`absolute top-0 left-0 h-full ${challenge.completed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, (challenge.currentValue / challenge.targetValue) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-500 relative z-10">
                        <span>{challenge.currentValue.toFixed(1)} {challenge.unit}</span>
                        <span>{challenge.targetValue} {challenge.unit}</span>
                      </div>

                      {challenge.completed && (
                        <div className="absolute inset-0 bg-emerald-500/10 z-0" />
                      )}
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
