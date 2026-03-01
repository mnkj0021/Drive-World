import { useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useLocation } from '../../hooks/useLocation';
import { LocationUpdate } from '../../types';

export function RunManager() {
  const { isRecording, user, setRecording, updateRunStats } = useStore();
  const location = useLocation();
  const runPoints = useRef<LocationUpdate[]>([]);
  const startTime = useRef<number>(0);

  useEffect(() => {
    if (isRecording) {
      if (runPoints.current.length === 0) {
        startTime.current = Date.now();
        console.log("Run Started");
      }
      
      if (location) {
        runPoints.current.push(location);
        
        // Update live stats
        const duration = (Date.now() - startTime.current) / 1000;
        const distance = runPoints.current.length * 0.02; // Mock distance for sim
        // In real app, calculate Haversine distance between points
        
        updateRunStats({
          distance,
          duration,
          speed: location.speed * 3.6
        });
      }
    } else {
      // Stopped Recording
      if (runPoints.current.length > 0 && user && db) {
        saveRun();
      }
      runPoints.current = [];
    }
  }, [isRecording, location]);

  const saveRun = async () => {
    if (!user || !db) return;

    const points = runPoints.current;
    const duration = (Date.now() - startTime.current) / 1000;
    const distance = points.length * 0.02; // Mock
    const avgSpeed = points.reduce((acc, p) => acc + p.speed, 0) / points.length * 3.6;
    const topSpeed = Math.max(...points.map(p => p.speed)) * 3.6;

    const runData = {
      userId: user.uid,
      startTime: startTime.current,
      endTime: Date.now(),
      distanceKm: distance,
      durationSec: duration,
      avgSpeedKmh: avgSpeed,
      topSpeedKmh: topSpeed,
      pathEncoded: JSON.stringify(points.map(p => ({ lat: p.lat, lng: p.lng }))) // Simplified for demo
    };

    try {
      await addDoc(collection(db, 'runs'), runData);
      console.log("Run Saved", runData);
      // Ideally show a toast or summary modal here
    } catch (e) {
      console.error("Error saving run", e);
    }
  };

  return null;
}
