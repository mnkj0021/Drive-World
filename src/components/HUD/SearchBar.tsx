import React, { useEffect, useRef, useState } from 'react';
import { Search, Navigation, X, CarFront } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { useLocation } from '../../hooks/useLocation';

interface SearchBarProps {
  onPlaceSelect: (location: google.maps.LatLng) => void;
}

export function SearchBar({ onPlaceSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchingScenic, setIsSearchingScenic] = useState(false);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { mapStyle } = useStore();
  const location = useLocation();

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
          onPlaceSelect(place.geometry.location);
          setQuery(place.name || '');
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
            onPlaceSelect(randomPlace.geometry.location);
            setQuery(`Cruise to: ${randomPlace.name}`);
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
  };

  return (
    <div className="relative w-full max-w-md pointer-events-auto flex gap-2">
      <div className={cn(
        "flex-1 flex items-center px-4 py-3 rounded-xl border backdrop-blur-md transition-all",
        mapStyle === 'game-night' 
          ? "bg-slate-900/80 border-slate-700 text-white shadow-[0_0_15px_rgba(0,0,0,0.5)]" 
          : "bg-white/90 border-slate-200 text-slate-800 shadow-lg"
      )}>
        <Search className={cn("w-5 h-5 mr-3", mapStyle === 'game-night' ? "text-slate-400" : "text-slate-500")} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search destination..."
          className="bg-transparent border-none outline-none w-full font-medium placeholder:text-slate-500"
        />
        {query && (
          <button onClick={clearSearch}>
            <X className="w-5 h-5 text-slate-500 hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>

      <button
        onClick={handleCruise}
        disabled={isSearchingScenic}
        className={cn(
          "px-4 py-3 rounded-xl border backdrop-blur-md transition-all flex items-center justify-center",
          mapStyle === 'game-night'
            ? "bg-slate-900/80 border-slate-700 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            : "bg-white/90 border-slate-200 text-cyan-600 hover:bg-cyan-50 shadow-lg",
          isSearchingScenic && "opacity-50 cursor-wait"
        )}
        title="Find a Meetup Spot (Cruise)"
      >
        <CarFront className={cn("w-5 h-5", isSearchingScenic && "animate-pulse")} />
      </button>

      {isOpen && predictions.length > 0 && (
        <div className={cn(
          "absolute top-full left-0 right-0 mt-2 rounded-xl border overflow-hidden backdrop-blur-md z-50",
          mapStyle === 'game-night' 
            ? "bg-slate-900/90 border-slate-700 text-white" 
            : "bg-white/95 border-slate-200 text-slate-800"
        )}>
          {predictions.map((p) => (
            <button
              key={p.place_id}
              onClick={() => handleSelect(p.place_id)}
              className={cn(
                "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors",
                mapStyle === 'game-night' ? "hover:bg-slate-800 border-b border-slate-800 last:border-0" : "hover:bg-slate-50 border-b border-slate-100 last:border-0"
              )}
            >
              <Navigation className="w-4 h-4 opacity-50" />
              <div>
                <div className="font-medium text-sm">{p.structured_formatting.main_text}</div>
                <div className="text-xs opacity-60">{p.structured_formatting.secondary_text}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
