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
  const simIndex = useRef(0);
  const simProgress = useRef(0);
  const lastUpdate = useRef(Date.now());
  const runData = useRef<{ points: LocationUpdate[], startTime: number }>({ points: [], startTime: 0 });

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

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading || 0,
          speed: pos.coords.speed || 0,
          timestamp: pos.timestamp
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulatorActive]);

  return location;
}
