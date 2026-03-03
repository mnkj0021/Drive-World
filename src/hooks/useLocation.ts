import { useEffect, useRef, useState, useMemo } from 'react';
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
  const isSimulatorActive = useStore(state => state.isSimulatorActive);
  const isRecording = useStore(state => state.isRecording);
  const setRecording = useStore(state => state.setRecording);
  const updateRunStats = useStore(state => state.updateRunStats);
  const activeTarget = useStore(state => state.activeTarget);
  const setActiveTarget = useStore(state => state.setActiveTarget);
  const addBreadcrumb = useStore(state => state.addBreadcrumb);
  const addRunToHistory = useStore(state => state.addRunToHistory);
  const setRoutePath = useStore(state => state.setRoutePath);
  const setIsOffRoute = useStore(state => state.setIsOffRoute);
  const routePath = useStore(state => state.routePath);
  const user = useStore(state => state.user);

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
      addBreadcrumb({ lat, lng });

      // Handle Recording
      if (isRecording) {
        if (runData.current.points.length === 0) {
          runData.current.startTime = now;
        }
        runData.current.points.push(newLoc);
      }

    }, 1000 / 60); // 60 FPS update for smoothness

    return () => clearInterval(interval);
  }, [isSimulatorActive, isRecording]);

  // Real GPS Logic (Fallback if simulator off)
  useEffect(() => {
    if (isSimulatorActive) return;
    
    if (!navigator.geolocation) return;

    // Request Wake Lock to keep screen on and app active
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
      }
    };
    
    requestWakeLock();
    
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading !== null ? pos.coords.heading : (deviceHeading || 0),
          speed: pos.coords.speed || 0,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now()
        });
      },
      (err) => console.error("Initial position error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        const newLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading !== null ? pos.coords.heading : (deviceHeading || 0),
          speed: pos.coords.speed || 0,
          accuracy: pos.coords.accuracy,
          timestamp: now
        };

        setLocation(newLoc);
        addBreadcrumb({ lat: pos.coords.latitude, lng: pos.coords.longitude });

        // Handle Recording for Real GPS
        if (isRecording) {
          if (runData.current.points.length === 0) {
            runData.current.startTime = now;
          }
          
          runData.current.points.push(newLoc);
        }
      },
      (err) => console.error("Watch position error:", err),
      { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000 
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (wakeLock !== null) {
        wakeLock.release().catch((e: any) => console.log('Wake Lock release error', e));
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSimulatorActive, isRecording]);

  // Combine GPS location with device heading for the final output
  // This ensures the icon rotates even when stationary
  const finalLocation = useMemo(() => {
    if (!location) return null;
    return { 
      ...location, 
      heading: (location.speed && location.speed > 1 && location.heading !== null) 
        ? location.heading 
        : (deviceHeading !== null ? deviceHeading : (location.heading || 0))
    };
  }, [location, deviceHeading]);

  // Challenge Tracking
  const challenges = useStore(state => state.challenges);
  const updateChallenge = useStore(state => state.updateChallenge);
  const completeChallenge = useStore(state => state.completeChallenge);
  const lastSpeed = useRef(0);
  const smoothDistRef = useRef(0);
  const sessionDistRef = useRef(0);
  const lastLocRef = useRef<LocationUpdate | null>(null);

  useEffect(() => {
    if (!location) return;

    const speedKmh = (location.speed || 0) * 3.6;
    const now = Date.now();

    // 1. Speed Demon (Max Speed)
    const speedChallenge = challenges.find(c => c.id === 'c1');
    if (speedChallenge && !speedChallenge.completed) {
      if (speedKmh > speedChallenge.currentValue) {
        updateChallenge('c1', speedKmh);
      }
      if (speedKmh >= speedChallenge.targetValue) {
        completeChallenge('c1');
      }
    }

    // Calculate distance delta
    let distDelta = 0;
    if (lastLocRef.current) {
      distDelta = getDistanceFromLatLonInKm(
        lastLocRef.current.lat, lastLocRef.current.lng,
        location.lat, location.lng
      );
    }

    // 2. Marathon (Session Distance)
    const marathonChallenge = challenges.find(c => c.id === 'c2');
    if (marathonChallenge && !marathonChallenge.completed) {
      sessionDistRef.current += distDelta;
      if (sessionDistRef.current > marathonChallenge.currentValue) {
        updateChallenge('c2', sessionDistRef.current);
      }
      if (sessionDistRef.current >= marathonChallenge.targetValue) {
        completeChallenge('c2');
      }
    }

    // 3. Smooth Operator (No sudden braking)
    // Sudden braking threshold: decrease of > 15 km/h in 1 second (approx)
    // We check speed difference.
    const smoothChallenge = challenges.find(c => c.id === 'c3');
    if (smoothChallenge && !smoothChallenge.completed) {
      const speedDiff = lastSpeed.current - speedKmh; // Positive if slowing down
      
      // If speed drops significantly (braking hard)
      if (speedDiff > 10) { 
        smoothDistRef.current = 0; // Reset
        updateChallenge('c3', 0);
      } else {
        smoothDistRef.current += distDelta;
        if (smoothDistRef.current > smoothChallenge.currentValue) {
          updateChallenge('c3', smoothDistRef.current);
        }
        if (smoothDistRef.current >= smoothChallenge.targetValue) {
          completeChallenge('c3');
        }
      }
    }

    lastSpeed.current = speedKmh;
    lastLocRef.current = location;

  }, [location, challenges, updateChallenge, completeChallenge]);

  // Destination Detection & Run Saving
  useEffect(() => {
    if (!location || !activeTarget) return;

    const dist = getDistanceFromLatLonInKm(
      location.lat, 
      location.lng, 
      activeTarget.location.lat, 
      activeTarget.location.lng
    );

    // If within 50 meters of destination
    if (dist < 0.05) {
      if (isRecording) {
        const endTime = Date.now();
        const points = runData.current.points;
        
        if (points.length > 1) {
          const startTime = runData.current.startTime;
          const durationSec = (endTime - startTime) / 1000;
          
          // Calculate total distance
          let totalDist = 0;
          let topSpeed = 0;
          for (let i = 1; i < points.length; i++) {
            totalDist += getDistanceFromLatLonInKm(
              points[i-1].lat, points[i-1].lng,
              points[i].lat, points[i].lng
            );
            topSpeed = Math.max(topSpeed, points[i].speed * 3.6);
          }

          const avgSpeed = (totalDist / (durationSec / 3600)) || 0;

          addRunToHistory({
            id: Math.random().toString(36).substr(2, 9),
            userId: user?.uid || 'anonymous',
            startTime,
            endTime,
            distanceKm: totalDist,
            durationSec,
            avgSpeedKmh: avgSpeed,
            topSpeedKmh: topSpeed,
            pathEncoded: JSON.stringify(points.map(p => ({ lat: p.lat, lng: p.lng })))
          });
        }

        setRecording(false);
        runData.current = { points: [], startTime: 0 };
      }
      
      setActiveTarget(null);
      setRoutePath(null);
      // Optional: Trigger a "Destination Reached" sound or notification
      console.log("Destination Reached!");
    }
  }, [location, activeTarget, isRecording, addRunToHistory, setRecording, setActiveTarget, user]);

  // Off-Route Detection
  useEffect(() => {
    if (!location || !routePath || routePath.length === 0) {
      setIsOffRoute(false);
      return;
    }

    // Find distance to nearest point on route
    let minSquareDist = Infinity;
    for (const p of routePath) {
      const d = Math.pow(p.lat - location.lat, 2) + Math.pow(p.lng - location.lng, 2);
      if (d < minSquareDist) minSquareDist = d;
    }

    // Threshold: ~50 meters (0.0005 degrees approx)
    const isOff = minSquareDist > Math.pow(0.0005, 2); 
    setIsOffRoute(isOff);
  }, [location, routePath, setIsOffRoute]);

  return finalLocation;
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
