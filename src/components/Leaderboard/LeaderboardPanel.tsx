import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Trophy, X, Clock, Zap, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RunSummary } from '../../types';

export function LeaderboardPanel() {
  const user = useStore(state => state.user);
  const setGhostPath = useStore(state => state.setGhostPath);
  
  const [isOpen, setIsOpen] = useState(false);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async () => {
    if (!db) return;
    setLoading(true);
    try {
      // In a real app, this would query a specific segment or global leaderboard
      // Here we just fetch recent runs
      const q = query(
        collection(db, 'runs'),
        orderBy('startTime', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RunSummary));
      setRuns(data);
    } catch (e) {
      console.error("Error fetching leaderboard", e);
    }
    setLoading(false);
  };

  const showRunOnMap = (run: RunSummary) => {
    try {
      const path = JSON.parse(run.pathEncoded);
      setGhostPath(path);
      setIsOpen(false); // Close modal to show map
    } catch (e) {
      console.error("Failed to parse path", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  return (
    <>
      {/* Trigger */}
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full md:rounded-xl p-2.5 md:p-4 text-white hover:bg-white/5 transition-colors group h-full"
      >
        <div className="flex items-center gap-2 text-yellow-400">
          <Trophy size={20} />
          <span className="font-bold text-sm tracking-wider hidden group-hover:inline">LEADERBOARD</span>
        </div>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  <Trophy className="text-yellow-500" /> RECENT RUNS
                </h2>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading stats...</div>
                ) : runs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No runs recorded yet. Go drive!</div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {runs.map((run, i) => (
                      <div key={run.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-black text-white/20 w-8 text-center">{i + 1}</div>
                          <div>
                            <div className="text-white font-bold">Run {run.id.slice(0, 4)}</div>
                            <div className="text-xs text-gray-500">{new Date(run.startTime).toLocaleDateString()}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-6 text-right items-center">
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Dist</div>
                            <div className="text-emerald-400 font-mono font-bold">{run.distanceKm.toFixed(1)} km</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 uppercase">Time</div>
                            <div className="text-white font-mono font-bold">{(run.durationSec / 60).toFixed(1)} m</div>
                          </div>
                          
                          <button 
                            onClick={() => showRunOnMap(run)}
                            className="p-2 bg-white/10 rounded-lg hover:bg-emerald-500 hover:text-black transition-colors"
                            title="View Ghost"
                          >
                            <MapIcon size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
