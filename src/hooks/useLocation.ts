import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { LocationUpdate } from '../types';

// Mock path for simulation (San Francisco loop)
const SIM_PATH = [
  { lat: 37.7749, lng: -122.4194 },
  { lat: 37.7849, lng: -122.4094 },
  { lat: 37.7949, lng: -122.4194 },
  { lat: 37.7849, lng: -122.4294 },
];

export function useLocation() {
  const { isSimulatorActive, setRecording, isRecording, updateRunStats } = useStore();
  const [location, setLocation] = useState<LocationUpdate | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const simIndex = useRef(0);
  const simProgress = useRef(0);
  const lastUpdate = useRef(Date.now());
  const runData = useRef<{ points: LocationUpdate[], startTime: number }>({ points: [], startTime: 0 });

  // Device Orientation for Heading (Compass)
  useEffect(() => {
    if (isSimulatorActive) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // iOS
      if ((event as any).webkitCompassHeading !== undefined) {
        heading = (event as any).webkitCompassHeading;
      } 
      // Android / Standard
      else if (event.alpha !== null) {
        // If absolute orientation is available, use it
        if ((event as any).absolute || event instanceof DeviceOrientationEvent) {
          heading = (360 - event.alpha) % 360;
        }
      }

      if (heading !== null) {
        setDeviceHeading(heading);
      }
    };

    // Request permission for iOS if needed (usually needs a user gesture, 
    // but we'll register the listener and hope for the best or handle it in a component)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // This usually needs to be called from a button click
      // For now we just add the listener
    }

    window.addEventListener('deviceorientation', handleOrientation, true);
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, [isSimulatorActive]);

  // Simulation Loop
  useEffect(() => {
    if (!isSimulatorActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastUpdate.current) / 1000;
      lastUpdate.current = now;

      // Move along path
      simProgress.current += 0.0005; // Speed factor
      if (simProgress.current >= 1) {
        simProgress.current = 0;
        simIndex.current = (simIndex.current + 1) % SIM_PATH.length;
      }

      const p1 = SIM_PATH[simIndex.current];
      const p2 = SIM_PATH[(simIndex.current + 1) % SIM_PATH.length];

      const lat = p1.lat + (p2.lat - p1.lat) * simProgress.current;
      const lng = p1.lng + (p2.lng - p1.lng) * simProgress.current;
      
      // Calculate heading
      const y = Math.sin(p2.lng - p1.lng) * Math.cos(p2.lat);
      const x = Math.cos(p1.lat) * Math.sin(p2.lat) -
                Math.sin(p1.lat) * Math.cos(p2.lat) * Math.cos(p2.lng - p1.lng);
      const heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

      // Simulated speed (variable)
      const speed = 30 + Math.sin(now / 2000) * 10; // 20-40 m/s (~70-140 km/h)

      const newLoc = {
        lat,
        lng,
        heading,
        speed,
        timestamp: now
      };

      setLocation(newLoc);

      // Handle Recording
      if (isRecording) {
        if (runData.current.points.length === 0) {
          runData.current.startTime = now;
        }
        runData.current.points.push(newLoc);
        
        // Update stats
        const duration = (now - runData.current.startTime) / 1000;
        const distance = runData.current.points.length * 0.02; // Rough approx for sim
        updateRunStats({
          distance,
          duration,
          speed: speed * 3.6 // km/h
        });
      }

    }, 1000 / 60); // 60 FPS update for smoothness

    return () => clearInterval(interval);
  }, [isSimulatorActive, isRecording]);

  // Real GPS Logic (Fallback if simulator off)
  useEffect(() => {
    if (isSimulatorActive) return;
    
    if (!navigator.geolocation) return;

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading !== null ? pos.coords.heading : (deviceHeading || 0),
          speed: pos.coords.speed || 0,
          timestamp: Date.now()
        });
      },
      (err) => console.error("Initial position error:", err),
      { enableHighAccuracy: true }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const newLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading !== null ? pos.coords.heading : (deviceHeading || 0),
          speed: pos.coords.speed || 0,
          timestamp: now
        };

        setLocation(newLoc);

        // Handle Recording for Real GPS
        if (isRecording) {
          if (runData.current.points.length === 0) {
            runData.current.startTime = now;
          }
          
          // Calculate distance from last point
          let addedDist = 0;
          if (runData.current.points.length > 0) {
            const last = runData.current.points[runData.current.points.length - 1];
            addedDist = getDistanceFromLatLonInKm(last.lat, last.lng, newLoc.lat, newLoc.lng);
          }

          runData.current.points.push(newLoc);
          
          // Update stats
          const duration = (now - runData.current.startTime) / 1000;
          const currentDistance = (useStore.getState().currentRunStats?.distance || 0) + addedDist;
          
          updateRunStats({
            distance: currentDistance,
            duration,
            speed: (newLoc.speed || 0) * 3.6 // m/s to km/h
          });
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulatorActive, isRecording]);

  // Combine GPS location with device heading for the final output
  // This ensures the icon rotates even when stationary
  return location ? { 
    ...location, 
    heading: (location.speed && location.speed > 1 && location.heading !== null) 
      ? location.heading 
      : (deviceHeading !== null ? deviceHeading : (location.heading || 0))
  } : null;
}

// Helper
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180)
}
