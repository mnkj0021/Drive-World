import React, { useEffect, useRef, useState } from 'react';
import { Search, Navigation, X, CarFront } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { useLocation } from '../../hooks/useLocation';
import { gamifyName } from '../../lib/nameGamifier';

interface SearchBarProps {
  onPlaceSelect: (location: google.maps.LatLng, name?: string) => void;
}

export function SearchBar({ onPlaceSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchingScenic, setIsSearchingScenic] = useState(false);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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

  useEffect(() => {
    // Poll for Google Maps API availability
    const checkGoogleMaps = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        clearInterval(checkGoogleMaps);
        try {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          // PlacesService requires a map instance or a div, creating a dummy div
          const dummyDiv = document.createElement('div');
          placesService.current = new window.google.maps.places.PlacesService(dummyDiv);
        } catch (e) {
          console.warn("Failed to initialize SearchBar services:", e);
        }
      }
    }, 500);

    return () => clearInterval(checkGoogleMaps);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    
    // If services aren't ready, try to init them one last time (in case poll missed or user typed fast)
    if (!autocompleteService.current && window.google && window.google.maps && window.google.maps.places) {
       try {
         autocompleteService.current = new window.google.maps.places.AutocompleteService();
         const dummyDiv = document.createElement('div');
         placesService.current = new window.google.maps.places.PlacesService(dummyDiv);
       } catch (e) { console.warn(e); }
    }

    if (!val || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    try {
      autocompleteService.current.getPlacePredictions({ input: val }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setIsOpen(true);
        } else {
          setPredictions([]);
        }
      });
    } catch (e) {
      console.warn("Autocomplete prediction failed", e);
    }
  };

  const handleSelect = (placeId: string) => {
    if (!placesService.current) return;

    try {
      placesService.current.getDetails({ placeId }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          onPlaceSelect(place.geometry.location, place.name);
          setQuery(gamifyName(place.name || '')); // Gamify the selected name
          setIsOpen(false);
          setPredictions([]);
        }
      });
    } catch (e) {
      console.warn("Place details fetch failed", e);
    }
  };

  const handleCruise = () => {
    if (!placesService.current || !location) return;
    
    setIsSearchingScenic(true);
    setQuery("Finding meetup spot...");

    // Search for "driver" spots: Gas Stations or Parking (Meetups)
    const types = ['gas_station', 'parking'];
    const randomType = types[Math.floor(Math.random() * types.length)];

    const request: google.maps.places.PlaceSearchRequest = {
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: 15000, // 15km search to find a good drive
      type: randomType
    };

    try {
      placesService.current.nearbySearch(request, (results, status) => {
        setIsSearchingScenic(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          // Filter for places that are NOT too close (at least 2km away) to ensure a "cruise"
          // and have decent ratings
          const origin = new google.maps.LatLng(location.lat, location.lng);
          
          const validResults = results.filter(r => {
            if (!r.geometry?.location) return false;
            const dist = google.maps.geometry.spherical.computeDistanceBetween(origin, r.geometry.location);
            return dist > 2000 && (r.rating || 0) >= 3.0;
          });

          const pool = validResults.length > 0 ? validResults : results;
          
          // Pick random
          const randomPlace = pool[Math.floor(Math.random() * pool.length)];
          
          if (randomPlace.geometry?.location) {
            onPlaceSelect(randomPlace.geometry.location, randomPlace.name);
            setQuery(`Cruise to: ${gamifyName(randomPlace.name || '')}`); // Gamify
            setPredictions([]);
            setIsOpen(false);
          }
        } else {
          setQuery("No spots found nearby");
          setTimeout(() => setQuery(""), 2000);
        }
      });
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
    // Also clear the active route if we clear the search
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
          ref={inputRef}
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
              onClick={() => handleSelect(p.place_id)}
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
              <div>
                <div className="font-bold text-sm tracking-wide">{gamifyName(p.structured_formatting.main_text)}</div>
                <div className="text-xs opacity-50 mt-0.5 font-medium">{p.structured_formatting.secondary_text}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
