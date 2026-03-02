import { useState } from 'react';
import { useStore } from '../../lib/store';
import { rtdb } from '../../lib/firebase';
import { ref, set, get, child } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { Users, Plus, LogIn, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { gamifyName } from '../../lib/nameGamifier';

export function CrewPanel() {
  const user = useStore(state => state.user);
  const crew = useStore(state => state.crew);
  const setCrew = useStore(state => state.setCrew);
  const members = useStore(state => state.members);
  
  const [isOpen, setIsOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const createSession = async () => {
    // Fallback for simulation if no DB
    if (!rtdb) {
      const sessionId = uuidv4().slice(0, 6).toUpperCase();
      const newCrew = {
        id: sessionId,
        ownerId: user?.uid || 'guest',
        joinCode: sessionId,
        createdAt: Date.now(),
        name: `${user?.displayName || 'Racer'}'s Crew`
      };
      setCrew(newCrew);
      setIsOpen(false);
      
      // Simulate members joining after a delay
      setTimeout(() => {
        useStore.getState().updateMember('sim-1', {
          uid: 'sim-1',
          displayName: 'Ghost Rider',
          location: { lat: 37.7749, lng: -122.4194, heading: 0, speed: 0, timestamp: Date.now() },
          status: 'online',
          lastSeen: Date.now()
        });
      }, 5000);
      return;
    }

    if (!user) return;
    
    const sessionId = uuidv4().slice(0, 6).toUpperCase();
    const newCrew = {
      id: sessionId,
      ownerId: user.uid,
      joinCode: sessionId,
      createdAt: Date.now(),
      name: `${user.displayName}'s Crew`
    };

    try {
      await set(ref(rtdb, `sessions/${sessionId}`), {
        created: Date.now(),
        owner: user.uid
      });
      setCrew(newCrew);
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      setError('Failed to create session');
    }
  };

  const joinSession = async () => {
    // Fallback for simulation
    if (!rtdb) {
      if (joinCode.length === 6) {
        setCrew({
          id: joinCode,
          ownerId: 'sim-owner',
          joinCode: joinCode,
          createdAt: Date.now(),
          name: `Crew ${joinCode}`
        });
        setIsOpen(false);
        setJoinCode('');
      } else if (joinCode.length > 3) {
        // Handle Place Name Joining (Gamified)
        const gamified = gamifyName(joinCode);
        setCrew({
          id: 'LOC-' + Math.floor(Math.random() * 1000),
          ownerId: 'sim-owner',
          joinCode: 'LOC',
          createdAt: Date.now(),
          name: `${gamified} Crew`
        });
        setIsOpen(false);
        setJoinCode('');
        
        // Simulate members joining
        setTimeout(() => {
           useStore.getState().updateMember('sim-loc-1', {
            uid: 'sim-loc-1',
            displayName: 'Local Legend',
            location: { lat: 37.7749, lng: -122.4194, heading: 0, speed: 0, timestamp: Date.now() },
            status: 'online',
            lastSeen: Date.now()
          });
        }, 2000);

      } else {
        setError('Invalid Code (Simulated)');
      }
      return;
    }

    if (!user || !joinCode) return;
    
    try {
      const snapshot = await get(child(ref(rtdb), `sessions/${joinCode}`));
      if (snapshot.exists()) {
        setCrew({
          id: joinCode,
          ownerId: snapshot.val().owner,
          joinCode: joinCode,
          createdAt: snapshot.val().created,
          name: `Crew ${joinCode}`
        });
        setIsOpen(false);
        setJoinCode('');
      } else {
        setError('Session not found');
      }
    } catch (e) {
      console.error(e);
      setError('Error joining session');
    }
  };

  const leaveSession = () => {
    setCrew(null);
    setIsOpen(false);
  };

  const copyCode = () => {
    if (crew) {
      navigator.clipboard.writeText(crew.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <div className="z-20 pointer-events-auto">
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full md:rounded-xl w-10 h-10 md:w-64 md:h-auto flex items-center justify-center md:block md:p-4 text-white hover:bg-white/5 transition-colors text-left group"
        >
          <div className="flex items-center justify-center md:justify-start gap-0 md:gap-2 md:mb-2 text-emerald-400">
            <Users size={20} className="md:w-4 md:h-4" />
            <span className="hidden md:inline font-bold text-sm tracking-wider">CREW: {crew ? crew.id : 'SOLO'}</span>
          </div>
          <div className="hidden md:block text-xs text-gray-400 group-hover:text-white transition-colors">
            {crew ? `${Object.keys(members).length + 1} Active Members` : 'Tap to Create or Join'}
          </div>
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white tracking-wide">CREW SESSION</h2>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {!crew ? (
                  // No Session State
                  <div className="space-y-4">
                    <button 
                      onClick={createSession}
                      className="w-full py-4 bg-emerald-500/10 border border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center gap-3 transition-all font-bold tracking-wider"
                    >
                      <Plus size={20} />
                      CREATE NEW SESSION
                    </button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-zinc-900 px-2 text-gray-500">Or Join Existing</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="ENTER CODE OR PLACE" 
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 font-mono text-center tracking-widest uppercase"
                        maxLength={20}
                      />
                      <button 
                        onClick={joinSession}
                        disabled={!joinCode}
                        className="px-6 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold"
                      >
                        <LogIn size={20} />
                      </button>
                    </div>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                  </div>
                ) : (
                  // Active Session State
                  <div className="space-y-6">
                    <div className="bg-black/50 rounded-xl p-4 border border-white/10 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-2">Session Code</div>
                      <div className="text-3xl font-mono font-bold text-emerald-400 tracking-[0.2em] flex items-center justify-center gap-4">
                        {crew.joinCode}
                        <button onClick={copyCode} className="text-gray-500 hover:text-white">
                          {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Members</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {/* Self */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                            <span className="text-white font-medium">{user?.displayName} (You)</span>
                          </div>
                          <span className="text-xs text-emerald-500 font-mono">ONLINE</span>
                        </div>
                        
                        {/* Others */}
                        {Object.values(members).map((member) => (
                          <div key={member.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${member.status === 'online' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                              <span className="text-gray-300">{member.displayName}</span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono uppercase">{member.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={leaveSession}
                      className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold tracking-wider"
                    >
                      LEAVE SESSION
                    </button>
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
