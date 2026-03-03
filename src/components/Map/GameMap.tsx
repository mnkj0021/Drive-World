import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../../lib/store';
import { useLocation } from '../../hooks/useLocation';
import { PlaceManager } from './PlaceManager';
import { lerpColor } from '../../lib/utils';

// Fix for default marker icons in Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface GameMapProps {
  onMapLoad?: (map: L.Map) => void;
}

// Component to handle map instance and follow logic
function MapController({ followUser, location, setMapInstance }: { followUser: boolean, location: { lat: number, lng: number } | null, setMapInstance: (map: L.Map) => void }) {
  const map = useMap();
  const setFollowUser = useStore(state => state.setFollowUser);
  const setActiveTarget = useStore(state => state.setActiveTarget);

  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);

  useMapEvents({
    dragstart: () => {
      setFollowUser(false);
    },
    click: (e) => {
      const { lat, lng } = e.latlng;
      // Trigger routing if location exists
      if (location && (window as any).calculateRoute) {
        (window as any).calculateRoute({ lat, lng }, `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    }
  });

  useEffect(() => {
    if (followUser && location) {
      map.panTo([location.lat, location.lng], { animate: true });
    }
  }, [followUser, location, map]);

  return null;
}

export function GameMap({ onMapLoad }: GameMapProps) {
  const mapStyle = useStore(state => state.mapStyle);
  const setMapStyle = useStore(state => state.setMapStyle);
  const followUser = useStore(state => state.followUser);
  const ghostPath = useStore(state => state.ghostPath);
  const breadcrumbs = useStore(state => state.breadcrumbs);
  const routePath = useStore(state => state.routePath);
  const setRoutePath = useStore(state => state.setRoutePath);
  const activeTarget = useStore(state => state.activeTarget);
  const setActiveTarget = useStore(state => state.setActiveTarget);
  const isOffRoute = useStore(state => state.isOffRoute);
  const pois = useStore(state => state.pois);
  const cameraSettings = useStore(state => state.cameraSettings);
  const waypoints = useStore(state => state.waypoints);
  const addWaypoint = useStore(state => state.addWaypoint);
  const removeWaypoint = useStore(state => state.removeWaypoint);
  const location = useLocation();
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Handle right-click to add waypoint
  const MapEvents = () => {
    useMapEvents({
      contextmenu: (e) => {
        addWaypoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });
    return null;
  };

  // Find the index of the point on the route closest to the user
  const closestIndex = useMemo(() => {
    if (!routePath || !location) return -1;
    let minSquareDist = Infinity;
    let index = -1;
    
    for (let i = 0; i < routePath.length; i++) {
      const p = routePath[i];
      const d = Math.pow(p.lat - location.lat, 2) + Math.pow(p.lng - location.lng, 2);
      if (d < minSquareDist) {
        minSquareDist = d;
        index = i;
      }
    }
    return index;
  }, [routePath, location?.lat, location?.lng]);

  // Calculate angle to nearest route point for guidance
  const offRouteAngle = useMemo(() => {
    if (!isOffRoute || !location || !routePath || closestIndex === -1) return 0;
    const target = routePath[closestIndex];
    
    // Simple angle calculation
    const dy = target.lat - location.lat;
    const dx = target.lng - location.lng;
    const angle = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    
    // Relative to screen (since map is rotated by -rotation)
    return (angle - (location.heading || 0) + 360) % 360;
  }, [isOffRoute, location, routePath, closestIndex]);

  // Calculate speed in km/h for coloring
  const speedKmH = (location?.speed || 0) * 3.6;

  // Determine route color based on speed thresholds with smooth gradient
  const routeColor = useMemo(() => {
    const green = '#10b981';
    const orange = '#f59e0b';
    const red = '#ef4444';

    if (speedKmH < 65) return green;
    if (speedKmH < 75) {
      const t = (speedKmH - 65) / 10;
      return lerpColor(green, orange, t);
    }
    if (speedKmH < 115) return orange;
    if (speedKmH < 125) {
      const t = (speedKmH - 115) / 10;
      return lerpColor(orange, red, t);
    }
    return red;
  }, [speedKmH]);

  // Split path into passed and remaining
  const passedPath = useMemo(() => {
    if (!routePath || closestIndex === -1) return null;
    return routePath.slice(0, closestIndex + 1);
  }, [routePath, closestIndex]);

  const remainingPath = useMemo(() => {
    if (!routePath || closestIndex === -1) return routePath;
    return routePath.slice(closestIndex);
  }, [routePath, closestIndex]);

  // Tile Layer URL based on style
  const tileUrl = useMemo(() => {
    return mapStyle === 'game-night' 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  }, [mapStyle]);

  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Set initial style based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;
    setMapStyle(isNight ? 'game-night' : 'game-day');
  }, []);

  // Custom Player Icon
  const playerIcon = useMemo(() => {
    const color = mapStyle === 'game-night' ? "#00ffcc" : "#2563eb";
    const rotation = location?.heading || 0;
    
    return L.divIcon({
      className: 'custom-player-icon',
      html: `
        <div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L25 25L15 20L5 25L15 5Z" fill="${color}" stroke="white" stroke-width="2"/>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }, [mapStyle, location?.heading]);

  // Target Icon (rotated back to stay upright)
  const targetIcon = useMemo(() => {
    const rotation = location?.heading || 0;
    return L.divIcon({
      className: 'custom-target-icon',
      html: `
        <div class="relative flex items-center justify-center" style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out;">
          <div class="absolute w-8 h-8 bg-emerald-500/20 rounded-full animate-ping"></div>
          <div class="w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }, [location?.heading]);

  // POI Icons
  const getPoiIcon = (type: string) => {
    const rotation = location?.heading || 0;
    const wrenchPath = "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";
    const gasPath = "M19.8 18.4a1.8 1.8 0 0 0 1.2-1.7V8.3a1.8 1.8 0 0 0-1.8-1.8h-1.4V4.8A1.8 1.8 0 0 0 16 3H8a1.8 1.8 0 0 0-1.8 1.8v13.4H5v-2h1.2V4.8A3 3 0 0 0 3.2 7.8v8.4H2v2h16v-2h-1.2v-6.8h2.4v7.3c0 .5.4.9.9.9s.9-.4.9-.9v-1.3zM8 15V6h6v9H8z";
    const hideoutPath = "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM7 8c-1.1 0-2-.9-2-2h2v2zm10 0h2c0 1.1-.9 2-2 2v-2z";
    const foodPath = "M12 2C7.58 2 4 4.24 4 7v2h16V7c0-2.76-3.58-5-8-5zm-8 6v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V8H4z";

    let path = gasPath;
    let color = "#ef4444";

    if (type === 'car_repair') { path = wrenchPath; color = "#3b82f6"; }
    if (type === 'parking') { path = hideoutPath; color = "#8b5cf6"; }
    if (type === 'restaurant') { path = foodPath; color = "#10b981"; }

    return L.divIcon({
      className: 'custom-poi-icon',
      html: `
        <div class="flex items-center justify-center" style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out;">
          <div class="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border-2" style="border-color: ${color}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="${color}">
              <path d="${path}" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  // Expose map instance to window for global actions (like panToLocation)
  const MapInstanceExposer = () => {
    const map = useMap();
    useEffect(() => {
      (window as any).panToLocation = (pos: { lat: number, lng: number }) => {
        map.setView([pos.lat, pos.lng], 17);
      };
      
      (window as any).calculateRoute = async (dest: { lat: number, lng: number }, name?: string) => {
        if (!location) return;
        
        const currentWaypoints = useStore.getState().waypoints;
        const points = [
          { lat: location.lat, lng: location.lng },
          ...currentWaypoints,
          dest
        ];

        const coordsString = points.map(p => `${p.lng},${p.lat}`).join(';');
        const straightLineDist = L.latLng(location.lat, location.lng).distanceTo(L.latLng(dest.lat, dest.lng));

        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`
          );
          const data = await response.json();
          
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => ({
              lat: c[1],
              lng: c[0]
            }));
            setRoutePath(coords);
            
            setActiveTarget({
              location: dest,
              type: null,
              name: name || "Destination",
              totalDistance: data.routes[0].distance,
              initialDistance: straightLineDist
            });
          }
        } catch (error) {
          console.error("Routing error:", error);
          // Fallback to straight line
          setRoutePath([
            { lat: location.lat, lng: location.lng },
            ...currentWaypoints,
            { lat: dest.lat, lng: dest.lng }
          ]);
          setActiveTarget({
            location: dest,
            type: null,
            name: name || "Destination",
            totalDistance: straightLineDist,
            initialDistance: straightLineDist
          });
        }
      };
      
      (window as any).clearRoute = () => {
        setRoutePath(null);
        setActiveTarget(null);
        useStore.getState().clearWaypoints();
      };
      
      if (onMapLoad) onMapLoad(map);
    }, [map, location]);
    return null;
  };

  const rotation = followUser ? (location?.heading || 0) : 0;

  // Calculate distance to nearest route point in meters
  const offRouteDistanceMeters = useMemo(() => {
    if (!isOffRoute || !location || !routePath || closestIndex === -1) return 0;
    const target = routePath[closestIndex];
    // Simple distance approx in degrees to meters (1 deg ~ 111km)
    const distDeg = Math.sqrt(Math.pow(target.lat - location.lat, 2) + Math.pow(target.lng - location.lng, 2));
    return Math.round(distDeg * 111000);
  }, [isOffRoute, location, routePath, closestIndex]);

  return (
    <div className="w-full h-full absolute inset-0 z-0 bg-[#0f172a] overflow-hidden">
      {/* Off-Route Warning Overlay */}
      {isOffRoute && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="bg-red-500/90 backdrop-blur-md px-6 py-4 rounded-3xl border-2 border-white/20 shadow-[0_0_40px_rgba(239,68,68,0.5)] flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="text-white">
                <div className="text-[10px] uppercase font-black tracking-[0.2em] opacity-70">Navigation Error</div>
                <div className="text-xl font-black italic tracking-tighter uppercase leading-none">Off Route</div>
                <div className="text-xs font-bold text-red-100 mt-1 opacity-80">
                  {offRouteDistanceMeters}m from path • Follow arrow or re-route
                </div>
              </div>
              <div 
                className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center transition-transform duration-300 shadow-inner"
                style={{ transform: `rotate(${offRouteAngle}deg)` }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </div>
            </div>

            {/* Instruction Text */}
            <div className="bg-black/20 rounded-xl px-4 py-2 text-[10px] font-bold text-white/90 uppercase tracking-wider text-center">
              Head {offRouteAngle < 45 || offRouteAngle > 315 ? 'Straight' : offRouteAngle < 135 ? 'Right' : offRouteAngle < 225 ? 'Back' : 'Left'} to return to route
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (activeTarget && (window as any).calculateRoute) {
                    (window as any).calculateRoute(activeTarget.location, activeTarget.name);
                  }
                }}
                className="flex-1 bg-white text-red-600 font-black uppercase tracking-widest text-xs py-3 rounded-xl hover:bg-red-50 transition-colors shadow-lg"
              >
                Re-Route
              </button>
              <button 
                onClick={() => useStore.getState().setIsOffRoute(false)}
                className="px-4 bg-black/20 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-black/40 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera PIP Overlay */}
      {cameraSettings.showFeed && (
        <div className="absolute bottom-6 right-6 w-64 h-36 bg-black rounded-2xl border border-white/20 shadow-2xl overflow-hidden z-50 group">
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="flex flex-col items-center gap-2 opacity-50">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <span className="text-[10px] text-white font-bold uppercase tracking-widest">No Signal</span>
            </div>
          </div>
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 rounded text-[8px] text-white font-bold uppercase tracking-tighter flex items-center gap-1">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
            Live Feed
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => useStore.getState().setCameraSettings({ showFeed: false })}
              className="p-1 bg-black/50 rounded-full text-white hover:bg-black/80"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <div 
        className="w-full h-full transition-transform duration-500 ease-out"
        style={{ transform: `rotate(${-rotation}deg) scale(1.5)` }} // Increased scale for better coverage
      >
        <MapContainer
          center={[location?.lat || 37.7749, location?.lng || -122.4194]}
          zoom={17}
          zoomControl={false}
          className="w-full h-full"
          style={{ background: 'transparent' }}
        >
          <TileLayer
            url={tileUrl}
            attribution={attribution}
          />
          
          <MapController followUser={followUser} location={location} setMapInstance={setMapInstance} />
          <MapInstanceExposer />

          {location && (
            <>
              {location.accuracy && location.accuracy < 100 && (
                <Circle 
                  center={[location.lat, location.lng]}
                  radius={location.accuracy}
                  pathOptions={{
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.1,
                    weight: 1,
                    opacity: 0.4
                  }}
                />
              )}
              <Marker 
                position={[location.lat, location.lng]} 
                icon={playerIcon}
                zIndexOffset={1000}
              />
            </>
          )}

          {activeTarget && (
            <Marker 
              position={[activeTarget.location.lat, activeTarget.location.lng]} 
              icon={targetIcon}
            />
          )}

          {passedPath && passedPath.length > 1 && (
            <Polyline 
              positions={passedPath.map(p => [p.lat, p.lng])}
              pathOptions={{
                color: mapStyle === 'game-night' ? '#475569' : '#cbd5e1', // Slate-500 or Slate-300
                weight: 6, // Match main route weight
                opacity: 0.6, // More visible but still dimmed
                lineJoin: 'round'
              }}
            />
          )}

          {remainingPath && remainingPath.length > 1 && (
            <Polyline 
              positions={remainingPath.map(p => [p.lat, p.lng])}
              pathOptions={{
                color: routeColor,
                weight: 6,
                opacity: 0.8,
                lineJoin: 'round'
              }}
            />
          )}

          {/* Breadcrumbs (Actual path taken - "Backtrack Trail") */}
          {breadcrumbs && breadcrumbs.length > 1 && (
            <Polyline 
              positions={breadcrumbs.map(p => [p.lat, p.lng])}
              pathOptions={{
                color: mapStyle === 'game-night' ? '#a78bfa' : '#8b5cf6', // Violet-400 or Violet-500
                weight: 3,
                opacity: 0.7,
                lineJoin: 'round',
                dashArray: '1, 10' // Dot-like trail
              }}
            />
          )}

          {ghostPath && ghostPath.length > 0 && (
            <Polyline 
              positions={ghostPath.map(p => [p.lat, p.lng])}
              pathOptions={{
                color: mapStyle === 'game-night' ? '#00ffcc' : '#2563eb',
                weight: 4,
                opacity: 0.6,
                dashArray: '10, 10'
              }}
            />
          )}

          {pois && pois.map(poi => (
            <Marker 
              key={poi.id}
              position={[poi.lat, poi.lng]} 
              icon={getPoiIcon(poi.type)}
              eventHandlers={{
                click: () => {
                  if ((window as any).calculateRoute) {
                    (window as any).calculateRoute({ lat: poi.lat, lng: poi.lng }, poi.name);
                  }
                }
              }}
            />
          ))}

          {waypoints.map((wp, i) => (
            <Marker 
              key={`wp-${i}`}
              position={[wp.lat, wp.lng]} 
              icon={L.divIcon({
                className: 'custom-waypoint-icon',
                html: `
                  <div class="w-6 h-6 bg-yellow-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-black">
                    ${i + 1}
                  </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
              eventHandlers={{
                contextmenu: () => removeWaypoint(i)
              }}
            />
          ))}

          <PlaceManager map={mapInstance} />
          <MapEvents />
        </MapContainer>
      </div>
    </div>
  );
}
