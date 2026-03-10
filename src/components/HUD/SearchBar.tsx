import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Navigation,
  X,
  CarFront,
  Home,
  BriefcaseBusiness,
  Star,
  Globe2,
  MapPinned
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { SavedPlaceKey } from '../../types';

interface SearchBarProps {
  onPlaceSelect: (location: { lat: number; lng: number }, name?: string) => void;
}

type SearchScope = 'country' | 'world';

interface NominatimResultRaw {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  importance?: number;
  address?: {
    country_code?: string;
    country?: string;
  };
}

interface ReverseGeocodeResponse {
  address?: {
    country_code?: string;
    country?: string;
  };
}

interface PhotonResponse {
  features?: Array<{
    geometry: { coordinates: [number, number] };
    properties: {
      osm_id?: number | string;
      name?: string;
      street?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  }>;
}

interface SearchResult {
  id: string;
  displayName: string;
  shortName: string;
  lat: number;
  lng: number;
  source: 'nominatim' | 'photon';
  importance: number;
  countryCode?: string;
}

export function SearchBar({ onPlaceSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingScenic, setIsSearchingScenic] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>('country');
  const [countryContext, setCountryContext] = useState<{ code: string; name: string } | null>(null);

  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countryLookupAbortRef = useRef<AbortController | null>(null);
  const lastCountryLookupRef = useRef<{ lat: number; lng: number; at: number } | null>(null);

  const { mapStyle, activeTarget, setActiveTarget, savedPlaces, setSavedPlace, removeSavedPlace } = useStore();
  const location = useStore(state => state.location);

  const slots: Array<{ key: SavedPlaceKey; label: string; Icon: typeof Home }> = [
    { key: 'home', label: 'Home', Icon: Home },
    { key: 'work', label: 'Work', Icon: BriefcaseBusiness },
    { key: 'favorite', label: 'Fav', Icon: Star }
  ];

  // Sync query with active target name if it changes externally
  useEffect(() => {
    if (activeTarget) {
      setQuery(activeTarget.name);
    } else if (!isOpen) {
      setQuery('');
    }
  }, [activeTarget, isOpen]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchAbortRef.current?.abort();
      countryLookupAbortRef.current?.abort();
    };
  }, []);

  // Resolve current country from GPS, throttled so it doesn't hit API repeatedly.
  useEffect(() => {
    if (!location) return;

    const prevLookup = lastCountryLookupRef.current;
    const now = Date.now();
    if (prevLookup) {
      const movedKm = getDistanceKm(prevLookup.lat, prevLookup.lng, location.lat, location.lng);
      const ageMs = now - prevLookup.at;
      if (movedKm < 25 && ageMs < 30 * 60 * 1000 && countryContext) {
        return;
      }
    }

    countryLookupAbortRef.current?.abort();
    const controller = new AbortController();
    countryLookupAbortRef.current = controller;

    const resolveCountry = async () => {
      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          lat: location.lat.toString(),
          lon: location.lng.toString(),
          zoom: '5',
          addressdetails: '1'
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' }
        });
        if (!response.ok) return;

        const data: ReverseGeocodeResponse = await response.json();
        const code = data.address?.country_code?.toLowerCase();
        const name = data.address?.country;
        if (code && name && !controller.signal.aborted) {
          setCountryContext({ code, name });
          lastCountryLookupRef.current = { lat: location.lat, lng: location.lng, at: Date.now() };
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.warn('Country reverse geocode failed:', error);
        }
      }
    };

    void resolveCountry();
  }, [location?.lat, location?.lng, countryContext]);

  // Refresh existing query whenever user toggles scope or country context resolves.
  useEffect(() => {
    const text = query.trim();
    if (text.length >= 2) {
      void searchPlaces(text);
    }
  }, [searchScope, countryContext?.code]);

  const handleSearch = (val: string) => {
    setQuery(val);

    if (!val || val.trim().length < 2) {
      setPredictions([]);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      void searchPlaces(val.trim());
    }, 300);
  };

  const searchPlaces = async (text: string) => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);

    let combined: SearchResult[] = [];

    if (searchScope === 'country') {
      const [localResult, localPhotonResult] = await Promise.allSettled([
        searchNominatim(text, controller.signal, {
          countryCode: countryContext?.code,
          focus: location ? { lat: location.lat, lng: location.lng } : undefined,
          boundedToFocus: !countryContext?.code
        }),
        searchPhoton(text, controller.signal)
      ]);

      const localNominatim = localResult.status === 'fulfilled' ? localResult.value : [];
      const localPhotonRaw = localPhotonResult.status === 'fulfilled' ? localPhotonResult.value : [];
      const localPhoton = location
        ? localPhotonRaw.filter((item) => getDistanceKm(location.lat, location.lng, item.lat, item.lng) < 600)
        : localPhotonRaw;

      let localCombined = dedupeAndRank(
        [...localNominatim, ...localPhoton],
        text,
        location?.lat,
        location?.lng,
        countryContext?.code
      );

      // Only fall back to worldwide when local/country search is empty.
      if (localCombined.length === 0 && text.length >= 3) {
        const [worldNominatimResult, worldPhotonResult] = await Promise.allSettled([
          searchNominatim(text, controller.signal, {
            focus: location ? { lat: location.lat, lng: location.lng } : undefined
          }),
          searchPhoton(text, controller.signal)
        ]);
        const worldNominatim = worldNominatimResult.status === 'fulfilled' ? worldNominatimResult.value : [];
        const worldPhoton = worldPhotonResult.status === 'fulfilled' ? worldPhotonResult.value : [];
        localCombined = dedupeAndRank(
          [...worldNominatim, ...worldPhoton],
          text,
          location?.lat,
          location?.lng,
          countryContext?.code
        );
      }

      combined = localCombined;
    } else {
      const [nominatimResult, photonResult] = await Promise.allSettled([
        searchNominatim(text, controller.signal, {
          focus: location ? { lat: location.lat, lng: location.lng } : undefined
        }),
        searchPhoton(text, controller.signal)
      ]);
      const nominatim = nominatimResult.status === 'fulfilled' ? nominatimResult.value : [];
      const photon = photonResult.status === 'fulfilled' ? photonResult.value : [];
      combined = dedupeAndRank([...nominatim, ...photon], text, location?.lat, location?.lng);
    }

    if (!controller.signal.aborted) {
      setPredictions(combined.slice(0, 12));
      setIsOpen(true);
      setIsSearching(false);
    }
  };

  const searchNominatim = async (
    text: string,
    signal: AbortSignal,
    options?: { countryCode?: string; focus?: { lat: number; lng: number }; boundedToFocus?: boolean }
  ): Promise<SearchResult[]> => {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: text,
      limit: '14',
      addressdetails: '1',
      dedupe: '1'
    });

    if (options?.countryCode) {
      params.set('countrycodes', options.countryCode);
    }

    if (options?.focus) {
      params.set('viewbox', buildViewbox(options.focus.lat, options.focus.lng, 2.8));
      if (options.boundedToFocus) {
        params.set('bounded', '1');
      }
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal,
      headers: {
        'Accept-Language': 'en'
      }
    });

    if (!response.ok) return [];

    const data: NominatimResultRaw[] = await response.json();
    return data
      .map((item) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const shortName = item.name || item.display_name.split(',')[0] || 'Unknown Place';
        return {
          id: `n-${item.place_id}`,
          displayName: item.display_name,
          shortName,
          lat,
          lng,
          source: 'nominatim' as const,
          importance: item.importance ?? 0,
          countryCode: item.address?.country_code?.toLowerCase()
        };
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
  };

  const searchPhoton = async (text: string, signal: AbortSignal): Promise<SearchResult[]> => {
    const params = new URLSearchParams({
      q: text,
      limit: '12'
    });

    if (location) {
      params.set('lat', location.lat.toString());
      params.set('lon', location.lng.toString());
    }

    const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, { signal });
    if (!response.ok) return [];

    const data: PhotonResponse = await response.json();
    const features = data.features || [];

    return features
      .map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const p = feature.properties || {};
        const shortName = p.name || p.street || p.city || p.state || p.country || 'Unknown Place';
        const displayName = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).join(', ');

        return {
          id: `p-${p.osm_id || `${lat}-${lng}`}`,
          displayName: displayName || shortName,
          shortName,
          lat,
          lng,
          source: 'photon' as const,
          importance: 0.3
        };
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
  };

  const dedupeAndRank = (
    items: SearchResult[],
    text: string,
    userLat?: number,
    userLng?: number,
    preferredCountryCode?: string
  ) => {
    const unique = new Map<string, SearchResult>();

    for (const item of items) {
      const key = `${item.shortName.toLowerCase()}-${item.lat.toFixed(4)}-${item.lng.toFixed(4)}`;
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }

    const scored = Array.from(unique.values()).map((item) => {
      const nameScore = getTextMatchScore(text, [item.shortName, item.displayName]);
      const distance = userLat !== undefined && userLng !== undefined
        ? getDistanceKm(userLat, userLng, item.lat, item.lng)
        : 50;
      const distanceScore = Math.max(0, 1 - distance / 60);
      const countryBoost = preferredCountryCode && item.countryCode === preferredCountryCode ? 1.0 : 0;
      const sourceBoost = item.source === 'nominatim' ? 0.08 : 0;
      const score = item.importance + nameScore + distanceScore * 0.25 + countryBoost + sourceBoost;

      return { item, nameScore, score };
    });

    const relevanceThreshold = text.trim().length >= 4 ? 0.18 : 0.12;
    const relevant = scored.filter((entry) => entry.nameScore >= relevanceThreshold);
    const pool = relevant.length > 0 ? relevant : scored;

    return pool.sort((a, b) => b.score - a.score).map((entry) => entry.item);
  };

  const handleSelect = (result: SearchResult) => {
    onPlaceSelect({ lat: result.lat, lng: result.lng }, result.shortName);
    setQuery(result.shortName);
    setIsOpen(false);
    setPredictions([]);
  };

  const saveActiveTarget = (slot: SavedPlaceKey) => {
    if (!activeTarget) return;
    setSavedPlace(slot, {
      name: activeTarget.name,
      location: activeTarget.location,
      updatedAt: Date.now()
    });
  };

  const routeToSaved = (slot: SavedPlaceKey) => {
    const saved = savedPlaces[slot];
    if (!saved) return;

    onPlaceSelect(saved.location, saved.name);
    setQuery(saved.name);
    setIsOpen(false);
    setPredictions([]);
  };

  const handleCruise = async () => {
    if (!location) return;

    setIsSearchingScenic(true);
    setQuery('Finding meetup spot...');

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
        const name = randomPlace.tags.name || 'Secret Spot';

        onPlaceSelect({ lat, lng }, name);
        setQuery(`Cruise to: ${name}`);
        setPredictions([]);
        setIsOpen(false);
      } else {
        setQuery('No spots found nearby');
        setTimeout(() => setQuery(''), 2000);
      }
    } catch (e) {
      console.error('Cruise search failed', e);
      setIsSearchingScenic(false);
      setQuery('Error finding spot');
    }
  };

  const clearSearch = () => {
    searchAbortRef.current?.abort();
    setQuery('');
    setPredictions([]);
    setIsOpen(false);
    setIsSearching(false);
    if (activeTarget) {
      setActiveTarget(null);
      if ((window as any).clearRoute) {
        (window as any).clearRoute();
      }
    }
  };

  return (
    <div className="relative w-full max-w-none md:max-w-xl pointer-events-auto z-50">
      <div className="flex gap-2 md:gap-3">
        <div
          className={cn(
            'flex-1 flex items-center px-3 md:px-5 py-3 md:py-4 rounded-2xl border transition-all duration-300 group',
            mapStyle === 'game-night'
              ? 'bg-slate-900/80 border-slate-700/50 text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] focus-within:shadow-[0_0_30px_rgba(59,130,246,0.3)] focus-within:border-blue-500/50'
              : 'bg-white/80 border-white/40 text-slate-800 shadow-xl backdrop-blur-xl focus-within:shadow-2xl focus-within:bg-white/95'
          )}
        >
          <Search
            className={cn(
              'w-5 h-5 mr-3 transition-colors',
              mapStyle === 'game-night' ? 'text-slate-400 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-slate-600'
            )}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search destination, landmark, city..."
            className="bg-transparent border-none outline-none w-full font-medium placeholder:text-slate-500/70 text-xs sm:text-sm tracking-wide"
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
            'px-3 md:px-5 py-3 md:py-4 rounded-2xl border backdrop-blur-xl transition-all flex items-center justify-center shadow-lg hover:scale-105 active:scale-95',
            mapStyle === 'game-night'
              ? 'bg-slate-900/80 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
              : 'bg-white/80 border-white/40 text-cyan-600 hover:bg-cyan-50 shadow-xl',
            isSearchingScenic && 'opacity-50 cursor-wait'
          )}
          title="Find a Meetup Spot (Cruise)"
        >
          <CarFront className={cn('w-5 h-5 md:w-6 md:h-6', isSearchingScenic && 'animate-pulse')} />
        </button>
      </div>

      <div className={cn("mt-2 flex flex-wrap gap-1.5 items-center", activeTarget && "hidden md:flex")}>
        <button
          onClick={() => setSearchScope('country')}
          className={cn(
            'px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors flex items-center gap-1.5',
            searchScope === 'country'
              ? 'bg-emerald-500/20 border-emerald-500/70 text-emerald-300'
              : mapStyle === 'game-night'
                ? 'bg-slate-900/80 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                : 'bg-white/80 border-white/40 text-slate-700 hover:bg-white'
          )}
          title="Search in current country first"
        >
          <MapPinned size={13} />
          {countryContext ? countryContext.name : 'My Country'}
        </button>

        <button
          onClick={() => setSearchScope('world')}
          className={cn(
            'px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors flex items-center gap-1.5',
            searchScope === 'world'
              ? 'bg-cyan-500/20 border-cyan-500/70 text-cyan-300'
              : mapStyle === 'game-night'
                ? 'bg-slate-900/80 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                : 'bg-white/80 border-white/40 text-slate-700 hover:bg-white'
          )}
          title="Search across all countries"
        >
          <Globe2 size={13} />
          Worldwide
        </button>
      </div>

      <div className={cn("mt-1.5 flex flex-wrap gap-1.5", activeTarget && "hidden md:flex")}>
        {slots.map(({ key, label, Icon }) => {
          const saved = savedPlaces[key];

          if (saved) {
            return (
              <div
                key={key}
                className={cn(
                  'flex items-center rounded-full border overflow-hidden shadow-sm',
                  mapStyle === 'game-night' ? 'bg-slate-900/90 border-slate-700/50' : 'bg-white/85 border-white/40'
                )}
              >
                <button
                  onClick={() => routeToSaved(key)}
                  className="pl-3 pr-2 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/10 transition-colors max-w-[180px]"
                >
                  <Icon size={13} />
                  <span className="truncate">
                    {label}: {saved.name}
                  </span>
                </button>
                <button
                  onClick={() => removeSavedPlace(key)}
                  className="px-2 py-1.5 text-[10px] opacity-70 hover:opacity-100 hover:bg-red-500/20 transition-colors"
                  title={`Remove ${label}`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          }

          return (
            <button
              key={key}
              onClick={() => saveActiveTarget(key)}
              disabled={!activeTarget}
              className={cn(
                'px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-colors flex items-center gap-1.5',
                !activeTarget && 'opacity-45 cursor-not-allowed',
                mapStyle === 'game-night'
                  ? 'bg-slate-900/80 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                  : 'bg-white/80 border-white/40 text-slate-700 hover:bg-white'
              )}
              title={activeTarget ? `Save target as ${label}` : `Set ${label} from an active destination`}
            >
              <Icon size={13} />
              Set {label}
            </button>
          );
        })}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-3 rounded-2xl border overflow-hidden backdrop-blur-xl z-50 shadow-2xl animate-in fade-in slide-in-from-top-2',
            mapStyle === 'game-night' ? 'bg-slate-900/95 border-slate-700/50 text-white' : 'bg-white/90 border-white/40 text-slate-800'
          )}
        >
          {isSearching && <div className="px-5 py-4 text-xs font-semibold opacity-70">Searching places...</div>}

          {!isSearching && predictions.length === 0 && (
            <div className="px-5 py-4">
              <div className="text-xs font-semibold opacity-70">No matches found in this scope.</div>
              {searchScope === 'country' && (
                <button
                  onClick={() => setSearchScope('world')}
                  className="mt-2 text-[11px] font-bold uppercase tracking-wide text-cyan-400 hover:text-cyan-300"
                >
                  Search Worldwide
                </button>
              )}
            </div>
          )}

          {!isSearching &&
            predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className={cn(
                  'w-full text-left px-5 py-4 flex items-center gap-4 transition-all duration-200 group',
                  mapStyle === 'game-night'
                    ? 'hover:bg-slate-800/80 border-b border-slate-800/50 last:border-0 hover:pl-7'
                    : 'hover:bg-white/60 border-b border-slate-100/50 last:border-0 hover:pl-7'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    mapStyle === 'game-night' ? 'bg-slate-800 group-hover:bg-blue-500/20 group-hover:text-blue-400' : 'bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600'
                  )}
                >
                  <Navigation className="w-4 h-4 opacity-70" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="font-bold text-sm tracking-wide truncate">{p.shortName}</div>
                  <div className="text-xs opacity-50 mt-0.5 font-medium truncate">{p.displayName}</div>
                </div>
                <div className="text-[10px] uppercase tracking-wider opacity-40 font-bold">{p.countryCode?.toUpperCase() || p.source}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTextMatchScore(query: string, fields: string[]) {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const queryTokens = q.split(' ').filter(Boolean);
  let best = 0;

  for (const field of fields) {
    const value = normalizeSearchText(field);
    if (!value) continue;

    let score = 0;

    if (value === q) {
      score = Math.max(score, 1.4);
    } else if (value.startsWith(q)) {
      score = Math.max(score, 1.2);
    } else if (containsWholePhrase(value, q)) {
      score = Math.max(score, 1.1);
    } else if (value.includes(q)) {
      score = Math.max(score, 0.95);
    }

    if (queryTokens.length > 0) {
      let matchedTokens = 0;
      let prefixHits = 0;

      for (const token of queryTokens) {
        if (value.includes(token)) {
          matchedTokens += 1;
          if (value.startsWith(token) || value.includes(` ${token}`)) {
            prefixHits += 1;
          }
        }
      }

      const coverage = matchedTokens / queryTokens.length;
      score = Math.max(score, coverage * 0.8 + (prefixHits / queryTokens.length) * 0.2);
    }

    best = Math.max(best, Math.min(score, 1.5));
  }

  return best;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsWholePhrase(value: string, phrase: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`);
  return pattern.test(value);
}

function buildViewbox(lat: number, lng: number, deltaDeg: number) {
  const top = Math.min(89.9, lat + deltaDeg);
  const bottom = Math.max(-89.9, lat - deltaDeg);
  const left = Math.max(-179.9, lng - deltaDeg);
  const right = Math.min(179.9, lng + deltaDeg);
  // Nominatim format: left,top,right,bottom
  return `${left},${top},${right},${bottom}`;
}
