import { useEffect, useState } from 'react';
import { getMapsAssistance, GroundingResult } from '../../lib/gemini';
import { useLocation } from '../../hooks/useLocation';
import { Zap, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GroundingResult | null>(null);
  const location = useLocation();

  const handleQuery = async (prompt: string) => {
    if (!location) return;
    setIsLoading(true);
    setResult(null);
    
    // Customize prompt based on selection
    let fullPrompt = `Find ${prompt} near me. Return a list of specific locations.`;
    
    if (prompt === 'Scenic Routes') {
      fullPrompt = "Find scenic driving routes, coastal roads, mountain passes, or beautiful drives near me. Focus on roads that are good for driving enthusiasts.";
    }
    
    const res = await getMapsAssistance(fullPrompt, { lat: location.lat, lng: location.lng });
    setResult(res);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-32 left-6 z-30">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-96 mb-4 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-emerald-400 font-bold tracking-wider flex items-center gap-2">
                <Zap size={16} /> CO-PILOT
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {['Scenic Routes', 'Car Meets', 'Gas Stations', 'Late Night Food'].map((item) => (
                <button
                  key={item}
                  onClick={() => handleQuery(item)}
                  disabled={isLoading}
                  className="block w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-200 transition-colors border border-white/5"
                >
                  {item}
                </button>
              ))}
            </div>

            {isLoading && (
              <div className="text-center py-4 text-gray-500 animate-pulse">
                Analyzing map data...
              </div>
            )}

            {result && (
              <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
                <p className="text-sm text-gray-300 leading-relaxed">{result.text}</p>
                {result.locations.length > 0 && (
                  <div className="space-y-2">
                    {result.locations.map((loc, i) => (
                      <a 
                        key={i} 
                        href={loc.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded bg-emerald-900/20 border border-emerald-500/20 hover:bg-emerald-900/40 transition-colors group"
                      >
                        <MapPin size={14} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-emerald-100 truncate">{loc.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold p-4 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95"
      >
        <Zap size={24} fill="currentColor" />
      </button>
    </div>
  );
}
