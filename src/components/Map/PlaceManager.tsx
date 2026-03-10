import React, { useEffect } from 'react';

interface PlaceManagerProps {
  map: any; // Leaflet Map instance
}

export function PlaceManager({ map }: PlaceManagerProps) {
  useEffect(() => {
    if (!map) return;
    console.warn("PlaceManager is currently disabled in Leaflet mode.");
  }, [map]);

  return null;
}
