import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';
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
  const isNativePlatform = Capacitor.isNativePlatform();
  const isSimulatorActive = useStore(state => state.isSimulatorActive);
  const isRecording = useStore(state => state.isRecording);
  const setRecording = useStore(state => state.setRecording);
  const location = useStore(state => state.location);
  const setSharedLocation = useStore(state => state.setLocation);
  const updateRunStats = useStore(state => state.updateRunStats);
  const activeTarget = useStore(state => state.activeTarget);
  const setActiveTarget = useStore(state => state.setActiveTarget);
  const addBreadcrumb = useStore(state => state.addBreadcrumb);
  const addRunToHistory = useStore(state => state.addRunToHistory);
  const setRoutePath = useStore(state => state.setRoutePath);
  const setIsOffRoute = useStore(state => state.setIsOffRoute);
  const routePath = useStore(state => state.routePath);
  const user = useStore(state => state.user);

  const simIndex = useRef(0);
  const simProgress = useRef(0);
  const lastUpdate = useRef(Date.now());
  const runData = useRef<{ points: LocationUpdate[], startTime: number }>({ points: [], startTime: 0 });
  const lastAcceptedLocRef = useRef<LocationUpdate | null>(null);
  const smoothedHeadingRef = useRef(0);
  const offRouteViolationCountRef = useRef(0);
  const routePathRef = useRef(routePath);

  useEffect(() => {
    routePathRef.current = routePath;
  }, [routePath]);

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

      lastAcceptedLocRef.current = newLoc;
      smoothedHeadingRef.current = heading;
      setSharedLocation(newLoc);
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

    let nativeWatchId: string | null = null;
    let webWatchId: number | null = null;
    let isUnmounted = false;

    const handleLocationUpdate = (coords: Position['coords'], sourceTimestamp?: number | null) => {
      const now = Date.now();
      const fixTimestamp = normalizeFixTimestamp(sourceTimestamp, now);
      const prev = lastAcceptedLocRef.current;

      // Ignore stale/out-of-order fixes that cause "late" jumps.
      if (now - fixTimestamp > 12_000) {
        return;
      }
      if (prev && fixTimestamp <= prev.timestamp + 80) {
        return;
      }

      const rawLat = coords.latitude;
      const rawLng = coords.longitude;
      const accuracy = Number.isFinite(coords.accuracy) ? Math.max(0, coords.accuracy) : 999;
      let speed = Number.isFinite(coords.speed) && (coords.speed || 0) > 0 ? (coords.speed || 0) : 0;
      let heading = Number.isFinite(coords.heading) ? (coords.heading as number) : null;

      let lat = rawLat;
      let lng = rawLng;

      if (prev) {
        const dtSec = Math.max((fixTimestamp - prev.timestamp) / 1000, 0.35);
        const movedMeters = getDistanceFromLatLonInKm(prev.lat, prev.lng, rawLat, rawLng) * 1000;
        const inferredSpeed = movedMeters / dtSec;

        if (speed < 0.5) {
          speed = inferredSpeed;
        }

        // Reject sudden GPS teleports that cause fake off-road / U-turn behavior.
        const maxPlausibleJumpMeters = Math.max((accuracy * 2) + (speed + 35) * dtSec, 120);
        if (movedMeters > maxPlausibleJumpMeters) {
          return;
        }

        // Ignore very noisy fixes while almost stationary.
        if (accuracy > 120 && speed < 2) {
          return;
        }
      }

      // Snap close-enough points toward the planned route to reduce off-road jitter.
      const activeRoute = routePathRef.current;
      if (activeRoute && activeRoute.length > 1 && speed > 1) {
        const snap = getClosestPointOnRoute({ lat: rawLat, lng: rawLng }, activeRoute);
        const snapThresholdMeters = Math.max(accuracy * 2.2, 55);
        if (snap.distanceMeters <= snapThresholdMeters) {
          const blend = accuracy > 35 ? 0.82 : 0.62;
          lat = rawLat + (snap.point.lat - rawLat) * blend;
          lng = rawLng + (snap.point.lng - rawLng) * blend;
        }
      }

      if (prev) {
        const movedMetersForBearing = getDistanceFromLatLonInKm(prev.lat, prev.lng, lat, lng) * 1000;
        if ((heading === null || !Number.isFinite(heading)) && movedMetersForBearing > 3) {
          heading = getBearingFromCoords(prev.lat, prev.lng, lat, lng);
        }
      }

      if (heading === null || !Number.isFinite(heading)) {
        heading = smoothedHeadingRef.current;
      } else {
        const smoothingFactor = speed > 3 ? 0.5 : 0.25;
        smoothedHeadingRef.current = smoothHeadingDegrees(smoothedHeadingRef.current, heading, smoothingFactor);
        heading = smoothedHeadingRef.current;
      }

      const newLoc = {
        lat,
        lng,
        heading,
        speed,
        accuracy,
        timestamp: fixTimestamp
      };

      lastAcceptedLocRef.current = newLoc;
      setSharedLocation(newLoc);
      addBreadcrumb({ lat, lng });

      // Handle Recording for Real GPS
      if (isRecording) {
        if (runData.current.points.length === 0) {
          runData.current.startTime = fixTimestamp;
        }
        runData.current.points.push(newLoc);
      }
    };

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

    const startNativeTracking = async () => {
      try {
        await Geolocation.requestPermissions();
      } catch (err) {
        console.error("Native geolocation permission error:", err);
      }

      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 0
        });
        if (!isUnmounted && pos?.coords) {
          handleLocationUpdate(pos.coords, Number((pos as any).timestamp));
        }
      } catch (err) {
        console.error("Native initial position error:", err);
      }

      try {
        nativeWatchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 7000,
            maximumAge: 0,
            minimumUpdateInterval: 500
          },
          (position, err) => {
            if (err) {
              console.error("Native watch position error:", err);
              return;
            }
            if (position?.coords && !isUnmounted) {
              handleLocationUpdate(position.coords, Number((position as any).timestamp));
            }
          }
        );
      } catch (err) {
        console.error("Native watch setup error:", err);
      }
    };

    const startWebTracking = () => {
      if (!navigator.geolocation) return;

      // Get initial position immediately
      navigator.geolocation.getCurrentPosition(
        (pos) => handleLocationUpdate(pos.coords, Number(pos.timestamp)),
        (err) => console.error("Initial position error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 7000 }
      );

      webWatchId = navigator.geolocation.watchPosition(
        (pos) => handleLocationUpdate(pos.coords, Number(pos.timestamp)),
        (err) => console.error("Watch position error:", err),
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 7000
        }
      );
    };

    if (isNativePlatform) {
      void startNativeTracking();
    } else {
      startWebTracking();
    }

    return () => {
      isUnmounted = true;
      if (webWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(webWatchId);
      }
      if (nativeWatchId) {
        Geolocation.clearWatch({ id: nativeWatchId }).catch((err) => {
          console.warn("Native watch clear error:", err);
        });
      }
      if (wakeLock !== null) {
        wakeLock.release().catch((e: any) => console.log('Wake Lock release error', e));
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isNativePlatform, isSimulatorActive, isRecording]);

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
      offRouteViolationCountRef.current = 0;
      setIsOffRoute(false);
      return;
    }

    // Avoid off-route alerts while almost stationary.
    const speedMps = location.speed || 0;
    if (speedMps < 1.2) {
      offRouteViolationCountRef.current = 0;
      setIsOffRoute(false);
      return;
    }

    const minDistanceMeters = getMinDistanceToRouteMeters(location, routePath);
    const accuracyMeters = Math.max(location.accuracy ?? 25, 15);
    const thresholdMeters = Math.max(accuracyMeters * 2.4, 90);
    const isViolation = minDistanceMeters > thresholdMeters;

    if (isViolation) {
      offRouteViolationCountRef.current += 1;
    } else {
      offRouteViolationCountRef.current = Math.max(0, offRouteViolationCountRef.current - 1);
      if (minDistanceMeters < thresholdMeters * 0.7) {
        offRouteViolationCountRef.current = 0;
      }
    }

    setIsOffRoute(offRouteViolationCountRef.current >= 4);
  }, [location, routePath, setIsOffRoute]);

  return location;
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

function getBearingFromCoords(lat1: number, lon1: number, lat2: number, lon2: number) {
  const φ1 = deg2rad(lat1);
  const φ2 = deg2rad(lat2);
  const λ1 = deg2rad(lon1);
  const λ2 = deg2rad(lon2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI);
}

function normalizeDegrees(deg: number) {
  return (deg % 360 + 360) % 360;
}

function shortestAngleDelta(current: number, target: number) {
  return ((target - current + 540) % 360) - 180;
}

function smoothHeadingDegrees(current: number, target: number, factor: number) {
  const normalizedCurrent = normalizeDegrees(current);
  const normalizedTarget = normalizeDegrees(target);
  const delta = shortestAngleDelta(normalizedCurrent, normalizedTarget);
  return normalizeDegrees(normalizedCurrent + delta * factor);
}

function getMinDistanceToRouteMeters(
  point: { lat: number; lng: number },
  routePath: { lat: number; lng: number }[]
) {
  if (routePath.length === 1) {
    return getDistanceFromLatLonInKm(point.lat, point.lng, routePath[0].lat, routePath[0].lng) * 1000;
  }

  let minDist = Infinity;
  for (let i = 0; i < routePath.length - 1; i++) {
    const segmentDist = getPointToSegmentDistanceMeters(point, routePath[i], routePath[i + 1]);
    if (segmentDist < minDist) {
      minDist = segmentDist;
    }
  }
  return minDist;
}

function normalizeFixTimestamp(sourceTimestamp: number | null | undefined, fallbackNow: number) {
  if (!Number.isFinite(sourceTimestamp as number)) {
    return fallbackNow;
  }
  const ts = Number(sourceTimestamp);
  if (ts <= 0) {
    return fallbackNow;
  }
  // iOS/Safari can return seconds in some contexts.
  if (ts < 1e12) {
    return Math.round(ts * 1000);
  }
  return Math.round(ts);
}

function getClosestPointOnRoute(
  point: { lat: number; lng: number },
  routePath: { lat: number; lng: number }[]
) {
  let bestPoint = routePath[0];
  let bestDistance = Infinity;

  for (let i = 0; i < routePath.length - 1; i++) {
    const segment = getClosestPointOnSegmentMeters(point, routePath[i], routePath[i + 1]);
    if (segment.distanceMeters < bestDistance) {
      bestDistance = segment.distanceMeters;
      bestPoint = segment.point;
    }
  }

  return {
    point: bestPoint,
    distanceMeters: bestDistance
  };
}

function getPointToSegmentDistanceMeters(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  return getClosestPointOnSegmentMeters(p, a, b).distanceMeters;
}

function getClosestPointOnSegmentMeters(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const refLat = (a.lat + b.lat + p.lat) / 3;
  const ax = deg2rad(a.lng) * Math.cos(deg2rad(refLat)) * 6371000;
  const ay = deg2rad(a.lat) * 6371000;
  const bx = deg2rad(b.lng) * Math.cos(deg2rad(refLat)) * 6371000;
  const by = deg2rad(b.lat) * 6371000;
  const px = deg2rad(p.lng) * Math.cos(deg2rad(refLat)) * 6371000;
  const py = deg2rad(p.lat) * 6371000;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    return {
      point: { lat: a.lat, lng: a.lng },
      distanceMeters: Math.hypot(px - ax, py - ay)
    };
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const closestX = ax + t * abx;
  const closestY = ay + t * aby;
  const distanceMeters = Math.hypot(px - closestX, py - closestY);
  const closestLat = (closestY / 6371000) * (180 / Math.PI);
  const closestLng = ((closestX / 6371000) / Math.cos(deg2rad(refLat))) * (180 / Math.PI);

  return {
    point: { lat: closestLat, lng: closestLng },
    distanceMeters
  };
}
