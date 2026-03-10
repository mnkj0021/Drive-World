import { useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { LocationUpdate } from '../../types';

export function RunManager() {
  const isRecording = useStore(state => state.isRecording);
  const user = useStore(state => state.user);
  const updateRunStats = useStore(state => state.updateRunStats);
  const location = useStore(state => state.location);
  
  const runPoints = useRef<LocationUpdate[]>([]);
  const startTime = useRef<number>(0);

  useEffect(() => {
    if (isRecording) {
      if (runPoints.current.length === 0) {
        startTime.current = Date.now();
        console.log("Run Started");
      }
      
      if (location) {
        // Calculate distance from last point
        let addedDist = 0;
        if (runPoints.current.length > 0) {
          const last = runPoints.current[runPoints.current.length - 1];
          // Haversine distance in KM
          const R = 6371;
          const dLat = (location.lat - last.lat) * Math.PI / 180;
          const dLon = (location.lng - last.lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(last.lat * Math.PI / 180) * Math.cos(location.lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          addedDist = R * c;
        }

        runPoints.current.push(location);
        
        // Update live stats
        const duration = (Date.now() - startTime.current) / 1000;
        const currentDistance = (useStore.getState().currentRunStats?.distance || 0) + addedDist;
        
        updateRunStats({
          distance: currentDistance,
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
    const distance = useStore.getState().currentRunStats?.distance || 0;
    const avgSpeed = points.length > 0 ? points.reduce((acc, p) => acc + p.speed, 0) / points.length * 3.6 : 0;
    const topSpeed = points.length > 0 ? Math.max(...points.map(p => p.speed)) * 3.6 : 0;

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
