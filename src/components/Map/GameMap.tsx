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

  const { mapStyle, members, user, ghostPath } = useStore();
  const location = useLocation();
  const [authError, setAuthError] = useState<boolean>(false);
  const [simulatedMapMode, setSimulatedMapMode] = useState<boolean>(false);
  const [liteMode, setLiteMode] = useState<boolean>(false); // New state for testing without libraries

  // FORCE the working key provided by the user
  const rawApiKey = "AIzaSyBoD6PHm8szopZ1LZu_Vwf3LUC1R2RD3QE";
  const apiKey = rawApiKey.trim();

  // Auto-enable simulated mode if auth error occurs (and we aren't just trying lite mode)
  const isSimulated = simulatedMapMode || (authError && !liteMode);

  // ... (Simulated Mode Render - keep existing) ...
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
    
    // If Lite Mode is on, ONLY load geometry (no places, no routes)
    const libraries = liteMode ? "geometry" : "places,geometry,routes";
    
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
      // document.head.removeChild(script); // Usually better to leave it once loaded
    };
  }, [liteMode]); // Re-run if liteMode changes

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
      markerRef.current = new google.maps.Marker({
        map,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#00ffcc",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff",
          rotation: 0,
        },
        zIndex: 1000
      });

    } catch (e) {
      console.error("Error initializing map:", e);
      setAuthError(true);
    }
  };

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

  // Update Player Position & Camera
  useEffect(() => {
    if (!googleMapRef.current || !location || !markerRef.current) return;

    const pos = { lat: location.lat, lng: location.lng };
    
    // Smooth pan
    googleMapRef.current.panTo(pos);
    googleMapRef.current.setHeading(location.heading);

    // Update marker
    markerRef.current.setPosition(pos);
    const icon = markerRef.current.getIcon() as google.maps.Symbol;
    icon.rotation = location.heading;
    markerRef.current.setIcon(icon);

  }, [location]);

  // Update Crew Markers
  useEffect(() => {
    if (!googleMapRef.current) return;

    const updateMarkers = async () => {
      // Use global google.maps.Marker instead of importLibrary
      if (!window.google || !window.google.maps) return;

      // Add/Update markers
      Object.values(members).forEach(member => {
        if (!member.location) return;
        
        let marker = crewMarkersRef.current[member.uid];
        
        if (!marker) {
          marker = new google.maps.Marker({
            map: googleMapRef.current,
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 5,
              fillColor: "#ff0055", // Crew color
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
              rotation: 0,
            },
            label: {
              text: member.displayName,
              color: "white",
              fontSize: "10px",
              className: "bg-black/50 px-1 rounded"
            },
            zIndex: 900
          });
          crewMarkersRef.current[member.uid] = marker;
        }

        const pos = { lat: member.location.lat, lng: member.location.lng };
        marker.setPosition(pos);
        
        const icon = marker.getIcon() as google.maps.Symbol;
        icon.rotation = member.location.heading;
        marker.setIcon(icon);
      });

      // Remove stale markers
      Object.keys(crewMarkersRef.current).forEach(uid => {
        if (!members[uid]) {
          crewMarkersRef.current[uid].setMap(null);
          delete crewMarkersRef.current[uid];
        }
      });
    };

    updateMarkers();

  }, [members]);

  // Render Ghost Path
  useEffect(() => {
    if (!googleMapRef.current) return;

    const updateGhost = async () => {
      // Use global google.maps.Polyline instead of importLibrary
      if (!window.google || !window.google.maps) return;

      if (ghostPath && ghostPath.length > 0) {
        if (!ghostPolylineRef.current) {
          ghostPolylineRef.current = new google.maps.Polyline({
            map: googleMapRef.current,
            strokeColor: "#00ffcc",
            strokeOpacity: 0.6,
            strokeWeight: 4,
            geodesic: true,
          });
        }
        ghostPolylineRef.current.setPath(ghostPath);
        
        // Fit bounds to show the run
        const bounds = new google.maps.LatLngBounds();
        ghostPath.forEach(p => bounds.extend(p));
        googleMapRef.current.fitBounds(bounds);

      } else {
        if (ghostPolylineRef.current) {
          ghostPolylineRef.current.setMap(null);
          ghostPolylineRef.current = null;
        }
      }
    };

    updateGhost();
  }, [ghostPath]);

  // Expose routing function to window for SearchBar to call (hacky but effective for decoupled components)
  useEffect(() => {
    (window as any).calculateRoute = (destination: google.maps.LatLng) => {
      if (!directionsServiceRef.current || !directionsRendererRef.current || !location) return;

      directionsServiceRef.current.route({
        origin: { lat: location.lat, lng: location.lng },
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRendererRef.current?.setDirections(result);
        } else {
          console.error("Directions request failed due to " + status);
        }
      });
    };
  }, [location]);

  // Expose panTo function
  useEffect(() => {
    (window as any).panToLocation = (pos: { lat: number, lng: number }) => {
      if (googleMapRef.current) {
        googleMapRef.current.panTo(pos);
        googleMapRef.current.setZoom(17);
      }
    };
  }, []);

  return (
    <>
      <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />
      <PlaceManager map={mapInstance} />
    </>
  );
}
