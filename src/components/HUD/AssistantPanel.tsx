import { useEffect, useState } from 'react';
import { getMapsAssistance, getSuggestedPOIs, GroundingResult } from '../../lib/gemini';
import { useLocation } from '../../hooks/useLocation';
import { useStore } from '../../lib/store';
import { Sparkles, X, MapPin, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { POI } from '../../types';

interface AssistantPanelProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function AssistantPanel({ isOpen, setIsOpen }: AssistantPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GroundingResult | null>(null);
  const location = useLocation();
  const { setPois } = useStore();

  const [radius, setRadius] = useState<number>(5); // Radius in km

  const handleQuery = async (prompt: string) => {
    if (!location) return;
    setIsLoading(true);
    setResult(null);
    
    // If it's a standard POI type, we also update the map POIs
    const poiTypeMap: Record<string, POI['type']> = {
      'Gas Stations': 'gas_station',
      'Late Night Food': 'restaurant',
      'Repair Shops': 'car_repair',
      'Car Meets': 'parking'
    };

    const poiType = poiTypeMap[prompt];
    if (poiType) {
      const suggestedPois = await getSuggestedPOIs(poiType, { lat: location.lat, lng: location.lng });
      setPois(suggestedPois);
    }
    
    // Customize prompt based on selection
    let fullPrompt = `Find ${prompt} near me within ${radius}km. Return a list of specific locations.`;
    
    if (prompt === 'Scenic Routes') {
      fullPrompt = `Find scenic driving routes, coastal roads, mountain passes, or beautiful drives near me within ${radius}km. Focus on roads that are good for driving enthusiasts.`;
    }
    
    const res = await getMapsAssistance(fullPrompt, { lat: location.lat, lng: location.lng });
    setResult(res);
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center p-4 md:items-start md:justify-start md:p-0 md:absolute md:inset-auto md:bottom-full md:left-0 md:mb-4">
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 w-full max-w-sm md:w-96 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative"
          >
            {/* Decorative Glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-emerald-400 font-bold tracking-[0.2em] text-xs flex items-center gap-2 uppercase">
                <Sparkles size={14} className="animate-pulse" /> AI Co-Pilot
              </h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            {/* Radius Selector */}
            <div className="mb-6 relative z-10">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Search Radius</label>
                <span className="text-emerald-400 font-mono text-xs">{radius} KM</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={radius} 
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6 relative z-10">
              {['Scenic Routes', 'Repair Shops', 'Gas Stations', 'Late Night Food'].map((item) => (
                <button
                  key={item}
                  onClick={() => handleQuery(item)}
                  disabled={isLoading}
                  className="text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all border border-white/5 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
                >
                  {item}
                </button>
              ))}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-8 text-emerald-500/80 animate-pulse gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            {result && (
              <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar relative z-10 pr-2">
                <p className="text-xs text-gray-300 leading-relaxed font-medium">{result.text}</p>
                {result.locations.length > 0 && (
                  <div className="space-y-2">
                    {result.locations.map((loc, i) => (
                      <a 
                        key={i} 
                        href={loc.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group"
                      >
                        <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                          <MapPin size={12} />
                        </div>
                        <span className="text-xs font-bold text-emerald-100 truncate">{loc.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
