import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../lib/store';
import { MAP_STYLES } from '../../lib/mapStyles';
import { useLocation } from '../../hooks/useLocation';
import { PlaceManager } from './PlaceManager';

interface GameMapProps {
  onMapLoad?: (map: google.maps.Map) => void;
}

export function GameMap({ onMapLoad }: GameMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const crewMarkersRef = useRef<Record<string, google.maps.Marker>>({});
  const ghostPolylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const mapStyle = useStore(state => state.mapStyle);
  const setMapStyle = useStore(state => state.setMapStyle);
  const setFollowUser = useStore(state => state.setFollowUser);
  const members = useStore(state => state.members);
  const user = useStore(state => state.user);
  const ghostPath = useStore(state => state.ghostPath);
  const followUser = useStore(state => state.followUser);
  const setActiveTarget = useStore(state => state.setActiveTarget);
  
  const location = useLocation();
  const [authError, setAuthError] = useState<boolean>(false);

  const [simulatedMapMode, setSimulatedMapMode] = useState<boolean>(false);
  const [liteMode, setLiteMode] = useState<boolean>(false);

  // FORCE the working key provided by the user
  const rawApiKey = "AIzaSyBoD6PHm8szopZ1LZu_Vwf3LUC1R2RD3QE";
  const apiKey = rawApiKey.trim();

  // Auto-enable simulated mode if auth error occurs (and we aren't just trying lite mode)
  const isSimulated = simulatedMapMode || (authError && !liteMode);

  // Set initial style based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;
    setMapStyle(isNight ? 'game-night' : 'game-day');
  }, []);

  const initMap = async () => {
    if (!mapRef.current) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 17,
        disableDefaultUI: true,
        styles: MAP_STYLES[mapStyle],
        backgroundColor: '#222222',
        tilt: 45,
        heading: 0,
      });

      console.log("Map initialized (Manual Script)");

      googleMapRef.current = map;
      setMapInstance(map);
      if (onMapLoad) onMapLoad(map);

      // Add click listener
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng && (window as any).calculateRoute) {
          (window as any).calculateRoute(e.latLng);
        }
      });
      
      // Auto-disable follow mode when user drags map
      map.addListener("dragstart", () => {
        setFollowUser(false);
      });

      // Initialize Directions (Only if not in Lite Mode)
      if (!liteMode && google.maps.DirectionsService) {
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          polylineOptions: {
             strokeColor: mapStyle === 'game-night' ? '#00ffcc' : '#2563eb',
             strokeWeight: 6,
             strokeOpacity: 0.8
          }
        });
      }

      // Create player marker
      const color = mapStyle === 'game-night' ? "#00ffcc" : "#2563eb";
      markerRef.current = new google.maps.Marker({
        map,
        icon: {
          path: 'M 0,-15 L 10,10 L 0,5 L -10,10 Z',
          fillColor: color,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff",
          scale: 1.2,
          rotation: 0,
          anchor: new google.maps.Point(0, 0)
        },
        zIndex: 1000
      });

    } catch (e) {
      console.error("Error initializing map:", e);
      setAuthError(true);
    }
  };

  useEffect(() => {
    // Global handler for Google Maps auth errors
    (window as any).gm_authFailure = () => {
      console.error("Google Maps Authentication Failure detected.");
      setAuthError(true);
    };

    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    // Check if script is already present to prevent "multiple includes" error
    if (document.getElementById('google-maps-script')) {
      console.log("Maps script already in DOM, waiting...");
      return;
    }

    // Manual Script Injection (Matches user's working HTML)
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    
    // If Lite Mode is on, ONLY load geometry (no places)
    const libraries = liteMode ? "geometry" : "places,geometry";
    
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=${libraries}&v=weekly`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error("Google Maps script failed to load.");
      setAuthError(true);
    };

    // Define global callback
    (window as any).initMap = () => {
      initMap();
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [liteMode]); // Re-run if liteMode changes

  // Update Map Style
  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setOptions({ styles: MAP_STYLES[mapStyle] });
      
      // Update directions style if exists
      if (directionsRendererRef.current) {
        const color = mapStyle === 'game-night' ? '#00ffcc' : '#2563eb';
        directionsRendererRef.current.setOptions({
          polylineOptions: {
            strokeColor: color,
            strokeWeight: 6,
            strokeOpacity: 0.8,
            icons: [{
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: color,
                fillColor: '#ffffff',
                fillOpacity: 1
              },
              offset: '0',
              repeat: '100px'
            }]
          }
        });
      }
    }
  }, [mapStyle]);

  // Animate Route Icons
  useEffect(() => {
    const interval = setInterval(() => {
       if (directionsRendererRef.current && directionsRendererRef.current.getMap()) {
          // Animation logic if needed
       }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Update Player Marker Position
  useEffect(() => {
    if (!markerRef.current || !location) return;
    
    const pos = { lat: location.lat, lng: location.lng };
    markerRef.current.setPosition(pos);

    if (followUser && googleMapRef.current) {
      googleMapRef.current.panTo(pos);
    }
    
    // Update icon rotation and color based on style
    const color = mapStyle === 'game-night' ? "#00ffcc" : "#2563eb";
    markerRef.current.setIcon({
      path: 'M 0,-15 L 10,10 L 0,5 L -10,10 Z',
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: "#ffffff",
      scale: 1.2,
      rotation: location.heading || 0,
      anchor: new google.maps.Point(0, 0)
    });

  }, [location, mapStyle, mapInstance]);

  // Custom Route Rendering for Animation
  const routeLayersRef = useRef<google.maps.Polyline[]>([]);
  const routeMarkersRef = useRef<google.maps.Marker[]>([]); // Store custom start/end markers

  // Custom Pin SVGs (Base64 encoded for Google Maps)
  const ORIGIN_PIN = 'data:image/svg+xml;base64,' + btoa(`
  <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="30" cy="30" r="8" fill="#00f0ff" filter="url(#glow-cyan)">
      <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="30" cy="30" r="4" fill="#ffffff" />
    <circle cx="30" cy="30" r="16" stroke="#00f0ff" stroke-width="2" fill="none" opacity="0.6" />
    <circle cx="30" cy="30" r="24" stroke="#00f0ff" stroke-width="1" fill="none" opacity="0.3" stroke-dasharray="4 4" />
  </svg>`);

  const DEST_PIN = 'data:image/svg+xml;base64,' + btoa(`
  <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow-pink" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="grad-pink" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff00cc;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#330033;stop-opacity:1" />
      </linearGradient>
    </defs>
    <path d="M30 54 L16 26 C16 18 22 12 30 12 C38 12 44 18 44 26 L30 54 Z" fill="url(#grad-pink)" stroke="#ff00cc" stroke-width="2" filter="url(#glow-pink)" />
    <circle cx="30" cy="26" r="6" fill="#ffffff" />
  </svg>`);

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      const time = Date.now();
      const pulse = (Math.sin(time / 800) + 1) / 2;
      const pixelOffset = (time / 15) % 20;
      const layers = routeLayersRef.current;
      if (layers.length >= 3) {
        layers[0].setOptions({ strokeOpacity: 0.1 + (pulse * 0.15) });
        if (layers[2]) {
           const icons = layers[2].get('icons');
           if (icons && icons[0]) {
             icons[0].offset = pixelOffset + 'px';
             layers[2].set('icons', icons);
           }
        }
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    (window as any).calculateRoute = (destination: google.maps.LatLng, name?: string) => {
      if (!directionsServiceRef.current || !directionsRendererRef.current || !location) return;
      directionsServiceRef.current.route({
        origin: { lat: location.lat, lng: location.lng },
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const leg = result.routes[0].legs[0];
          const totalDistance = leg.distance?.value || 0;
          setActiveTarget({
            location: { lat: destination.lat(), lng: destination.lng() },
            name: name || "Custom Point",
            type: null,
            totalDistance: totalDistance
          });
          directionsRendererRef.current?.setDirections(result);
          directionsRendererRef.current?.setOptions({
            polylineOptions: { visible: false },
            suppressMarkers: true
          });
          routeMarkersRef.current.forEach(m => m.setMap(null));
          const originMarker = new google.maps.Marker({
            position: leg.start_location,
            map: googleMapRef.current,
            icon: {
              url: ORIGIN_PIN,
              scaledSize: new google.maps.Size(80, 80),
              anchor: new google.maps.Point(40, 40)
            },
            zIndex: 100
          });
          const destMarker = new google.maps.Marker({
            position: leg.end_location,
            map: googleMapRef.current,
            icon: {
              url: DEST_PIN,
              scaledSize: new google.maps.Size(80, 80),
              anchor: new google.maps.Point(40, 75)
            },
            zIndex: 100,
            animation: google.maps.Animation.DROP
          });
          routeMarkersRef.current = [originMarker, destMarker];
          if (googleMapRef.current && result.routes[0]?.overview_path) {
             routeLayersRef.current.forEach(p => p.setMap(null));
             const path = result.routes[0].overview_path;
             const baseColor = mapStyle === 'game-night' ? '#00ffcc' : '#2563eb';
             const glowColor = mapStyle === 'game-night' ? '#00ffcc' : '#3b82f6';
             const layer1 = new google.maps.Polyline({
               path,
               map: googleMapRef.current,
               strokeColor: glowColor,
               strokeWeight: 12,
               strokeOpacity: 0.15,
               zIndex: 10,
               clickable: false
             });
             const layer2 = new google.maps.Polyline({
               path,
               map: googleMapRef.current,
               strokeColor: baseColor,
               strokeWeight: 6,
               strokeOpacity: 0.6,
               zIndex: 11,
               clickable: false
             });
             const layer3 = new google.maps.Polyline({
               path,
               map: googleMapRef.current,
               strokeColor: 'transparent',
               strokeWeight: 0,
               zIndex: 12,
               clickable: false,
               icons: [{
                 icon: {
                   path: 'M 0,-4 L 0,4',
                   strokeColor: '#ffffff',
                   strokeWeight: 2,
                   scale: 1,
                   strokeOpacity: 0.5
                 },
                 offset: '0px',
                 repeat: '20px'
               }]
             });
             routeLayersRef.current = [layer1, layer2, layer3];
          }
        } else {
          console.warn('Directions request failed due to ' + status);
        }
      });
    };
  }, [location, mapStyle, mapInstance]);

  useEffect(() => {
    (window as any).panToLocation = (pos: { lat: number, lng: number }) => {
      if (googleMapRef.current) {
        googleMapRef.current.panTo(pos);
        googleMapRef.current.setZoom(17);
      }
    };
    (window as any).clearRoute = () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] });
      }
      routeLayersRef.current.forEach(p => p.setMap(null));
      routeLayersRef.current = [];
      routeMarkersRef.current.forEach(m => m.setMap(null));
      routeMarkersRef.current = [];
    };
  }, []);

  if (isSimulated) {
    return (
      <div className="w-full h-full absolute inset-0 z-0 bg-gray-900 overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }} 
        />
        
        {/* Fake Player Marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300"
             style={{ transform: `translate(-50%, -50%) rotate(${location?.heading || 0}deg)` }}>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-[#00ffcc]" />
        </div>

        {/* Fake POIs */}
        <div className="absolute top-1/3 left-1/3 p-2 bg-amber-500/20 rounded-full border border-amber-500 animate-pulse">
          <div className="w-4 h-4 bg-amber-500 rounded-full" />
        </div>
        <div className="absolute bottom-1/3 right-1/3 p-2 bg-blue-500/20 rounded-full border border-blue-500 animate-pulse">
          <div className="w-4 h-4 bg-blue-500 rounded-full" />
        </div>

        {/* Error Banner / Toggle */}
        <div className="absolute top-4 left-4 right-4 z-50 flex flex-col gap-2">
          <div className="bg-red-900/90 border border-red-500/50 p-3 rounded-lg shadow-lg backdrop-blur-md flex items-start justify-between">
            <div>
              <h3 className="text-red-200 font-bold text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                Map Connection Failed - Using Simulation
              </h3>
              <p className="text-red-300/80 text-xs mt-1">
                {authError ? "Key valid for Map, but Directions/Places API likely disabled." : "No API Key provided."}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded border border-white/20 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
          
          {authError && (
            <div className="bg-black/80 p-2 rounded border border-gray-700 text-xs text-gray-400">
              <p className="font-bold text-yellow-500">Why did the HTML test work but this fails?</p>
              <p>Your HTML test only loads the basic Map. This app requires 3 APIs:</p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>Maps JavaScript API (Enabled ✅)</li>
                <li><strong>Directions API</strong> (Likely Disabled ❌)</li>
                <li><strong>Places API</strong> (Likely Disabled ❌)</li>
              </ul>
              <p className="mt-1">Please enable Directions & Places APIs in Google Cloud.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (authError && !simulatedMapMode) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 text-white p-8">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-500">Map Connection Failed</h2>
          
          <div className="bg-gray-900 p-4 rounded-lg text-left text-sm text-gray-300">
            <p className="mb-2">The API Key was rejected. This usually means:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong>Directions API</strong> or <strong>Places API</strong> is not enabled.</li>
              <li>Billing is not active on the Google Cloud Project.</li>
              <li>Referrer restrictions block this URL.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
             {!liteMode && (
               <button 
                 onClick={() => {
                   setAuthError(false);
                   setLiteMode(true);
                   // Force reload script
                   const oldScript = document.getElementById('google-maps-script');
                   if (oldScript) oldScript.remove();
                   (window as any).google = undefined; // Clear global to force reload
                 }}
                 className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
               >
                 Try "Lite Mode" (Map Only)
               </button>
             )}
             
             <button 
               onClick={() => setSimulatedMapMode(true)}
               className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
             >
               Switch to Simulated Map
             </button>
             
             <button 
               onClick={() => window.location.reload()}
               className="px-6 py-2 text-sm text-gray-500 hover:text-white transition-colors"
             >
               Reload Page
             </button>
          </div>
          
          {liteMode && (
            <p className="text-xs text-yellow-500 mt-2">
              Lite Mode failed too. The issue is likely the API Key itself or Billing.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />
      <PlaceManager map={mapInstance} />
    </>
  );
}
