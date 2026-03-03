import React, { useEffect, useState } from 'react';
import { Search, Navigation, X, CarFront } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { useLocation } from '../../hooks/useLocation';
import { gamifyName } from '../../lib/nameGamifier';

interface SearchBarProps {
  onPlaceSelect: (location: { lat: number, lng: number }, name?: string) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    name?: string;
    city?: string;
    road?: string;
  };
}

export function SearchBar({ onPlaceSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchingScenic, setIsSearchingScenic] = useState(false);
  
  const { mapStyle, activeTarget, setActiveTarget } = useStore();
  const location = useLocation();

  // Sync query with active target name if it changes externally
  useEffect(() => {
    if (activeTarget) {
      setQuery(gamifyName(activeTarget.name));
    } else if (!isOpen) {
      setQuery('');
    }
  }, [activeTarget, isOpen]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    
    if (!val || val.length < 3) {
      setPredictions([]);
      return;
    }

    try {
      // Use Nominatim for free search
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`);
      const data = await response.json();
      setPredictions(data);
      setIsOpen(true);
    } catch (e) {
      console.warn("Nominatim search failed", e);
    }
  };

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(',')[0];
    
    onPlaceSelect({ lat, lng }, name);
    setQuery(gamifyName(name));
    setIsOpen(false);
    setPredictions([]);
  };

  const handleCruise = async () => {
    if (!location) return;
    
    setIsSearchingScenic(true);
    setQuery("Finding meetup spot...");

    try {
      // Search for nearby points of interest using Overpass API (Free)
      const query = `[out:json];node(around:5000,${location.lat},${location.lng})["amenity"~"cafe|restaurant|pub|parking"];out 10;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      setIsSearchingScenic(false);
      
      if (data.elements && data.elements.length > 0) {
        const randomPlace = data.elements[Math.floor(Math.random() * data.elements.length)];
        const lat = randomPlace.lat;
        const lng = randomPlace.lon;
        const name = randomPlace.tags.name || "Secret Spot";
        
        onPlaceSelect({ lat, lng }, name);
        setQuery(`Cruise to: ${gamifyName(name)}`);
        setPredictions([]);
        setIsOpen(false);
      } else {
        setQuery("No spots found nearby");
        setTimeout(() => setQuery(""), 2000);
      }
    } catch (e) {
      console.error("Cruise search failed", e);
      setIsSearchingScenic(false);
      setQuery("Error finding spot");
    }
  };

  const clearSearch = () => {
    setQuery('');
    setPredictions([]);
    setIsOpen(false);
    if (activeTarget) {
      setActiveTarget(null);
      if ((window as any).clearRoute) {
        (window as any).clearRoute();
      }
    }
  };

  return (
    <div className="relative w-full max-w-md pointer-events-auto flex gap-3 z-50">
      <div className={cn(
        "flex-1 flex items-center px-5 py-4 rounded-2xl border transition-all duration-300 group",
        mapStyle === 'game-night' 
          ? "bg-slate-900/80 border-slate-700/50 text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] focus-within:shadow-[0_0_30px_rgba(59,130,246,0.3)] focus-within:border-blue-500/50" 
          : "bg-white/80 border-white/40 text-slate-800 shadow-xl backdrop-blur-xl focus-within:shadow-2xl focus-within:bg-white/95"
      )}>
        <Search className={cn(
          "w-5 h-5 mr-3 transition-colors", 
          mapStyle === 'game-night' ? "text-slate-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-slate-600"
        )} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search destination..."
          className="bg-transparent border-none outline-none w-full font-medium placeholder:text-slate-500/70 text-sm tracking-wide"
        />
        {query && (
          <button onClick={clearSearch} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 h-4 text-slate-500 hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>

      <button
        onClick={handleCruise}
        disabled={isSearchingScenic}
        className={cn(
          "px-5 py-4 rounded-2xl border backdrop-blur-xl transition-all flex items-center justify-center shadow-lg hover:scale-105 active:scale-95",
          mapStyle === 'game-night'
            ? "bg-slate-900/80 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            : "bg-white/80 border-white/40 text-cyan-600 hover:bg-cyan-50 shadow-xl",
          isSearchingScenic && "opacity-50 cursor-wait"
        )}
        title="Find a Meetup Spot (Cruise)"
      >
        <CarFront className={cn("w-6 h-6", isSearchingScenic && "animate-pulse")} />
      </button>

      {isOpen && predictions.length > 0 && (
        <div className={cn(
          "absolute top-full left-0 right-0 mt-3 rounded-2xl border overflow-hidden backdrop-blur-xl z-50 shadow-2xl animate-in fade-in slide-in-from-top-2",
          mapStyle === 'game-night' 
            ? "bg-slate-900/95 border-slate-700/50 text-white" 
            : "bg-white/90 border-white/40 text-slate-800"
        )}>
          {predictions.map((p) => (
            <button
              key={p.place_id}
              onClick={() => handleSelect(p)}
              className={cn(
                "w-full text-left px-5 py-4 flex items-center gap-4 transition-all duration-200 group",
                mapStyle === 'game-night' 
                  ? "hover:bg-slate-800/80 border-b border-slate-800/50 last:border-0 hover:pl-7" 
                  : "hover:bg-white/60 border-b border-slate-100/50 last:border-0 hover:pl-7"
              )}
            >
              <div className={cn(
                "p-2 rounded-full transition-colors",
                mapStyle === 'game-night' ? "bg-slate-800 group-hover:bg-blue-500/20 group-hover:text-blue-400" : "bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600"
              )}>
                <Navigation className="w-4 h-4 opacity-70" />
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-sm tracking-wide truncate">{gamifyName(p.display_name.split(',')[0])}</div>
                <div className="text-xs opacity-50 mt-0.5 font-medium truncate">{p.display_name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
