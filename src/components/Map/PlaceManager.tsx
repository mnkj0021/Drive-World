import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../lib/store';
import { useLocation } from '../../hooks/useLocation';

interface PlaceManagerProps {
  map: google.maps.Map | null;
}

export function PlaceManager({ map }: PlaceManagerProps) {
  const { mapStyle } = useStore();
  const location = useLocation();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (!map) return;

    // We rely on the parent GameMap to load the 'places' library via the script tag
    if (window.google && window.google.maps && window.google.maps.places) {
      try {
        placesServiceRef.current = new google.maps.places.PlacesService(map);
      } catch (e) {
        console.warn("Failed to initialize PlacesService:", e);
      }
    } else {
      console.warn("Google Maps Places library not loaded.");
    }
  }, [map]);

  useEffect(() => {
    if (!map || !placesServiceRef.current || !location) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const searchNearby = (type: string, icon: string, color: string) => {
      if (!placesServiceRef.current) return;

      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: 2000, // Reduced from 5000 to 2000 to reduce clutter
        type: type
      };

      try {
        placesServiceRef.current.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            // Limit to top 5 results per category to prevent overlapping mess
            results.slice(0, 5).forEach(place => {
              if (!place.geometry?.location) return;

              // Create custom SVG icon
              const svgIcon = {
                path: icon,
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: '#ffffff',
                scale: 1.2, // Reduced scale from 1.5
                anchor: new google.maps.Point(12, 12),
              };

              const marker = new google.maps.Marker({
                map,
                position: place.geometry.location,
                title: place.name,
                icon: svgIcon,
                zIndex: 50 // Below player
              });

              // Add click listener for navigation
              marker.addListener('click', () => {
                console.log("Selected place:", place.name);
                if ((window as any).calculateRoute && place.geometry?.location) {
                  (window as any).calculateRoute(place.geometry.location);
                }
              });

              markersRef.current.push(marker);
            });
          } else {
            // ZERO_RESULTS is common and not an error
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
               console.warn(`Places search failed for ${type}:`, status);
            }
          }
        });
      } catch (e) {
        console.error("Error executing nearbySearch:", e);
      }
    };

    // Mechanic / Car Repair - Wrench
    const wrenchPath = "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";
    
    // Gas Station - Fuel Pump
    const gasPath = "M19.8 18.4a1.8 1.8 0 0 0 1.2-1.7V8.3a1.8 1.8 0 0 0-1.8-1.8h-1.4V4.8A1.8 1.8 0 0 0 16 3H8a1.8 1.8 0 0 0-1.8 1.8v13.4H5v-2h1.2V4.8A3 3 0 0 0 3.2 7.8v8.4H2v2h16v-2h-1.2v-6.8h2.4v7.3c0 .5.4.9.9.9s.9-.4.9-.9v-1.3zM8 15V6h6v9H8z";

    // Parking / Hideout - Garage / Shield Look
    const hideoutPath = "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM7 8c-1.1 0-2-.9-2-2h2v2zm10 0h2c0 1.1-.9 2-2 2v-2z";

    // Food - Burger/Drink (Simple Fast Food)
    const foodPath = "M12 2C7.58 2 4 4.24 4 7v2h16V7c0-2.76-3.58-5-8-5zm-8 6v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V8H4z";

    // Colors based on map style
    const mechanicColor = mapStyle === 'game-night' ? '#fbbf24' : '#d97706'; // Amber
    const gasColor = mapStyle === 'game-night' ? '#ef4444' : '#dc2626'; // Red
    const parkingColor = mapStyle === 'game-night' ? '#8b5cf6' : '#7c3aed'; // Violet (Distinct for Hideout)
    const foodColor = mapStyle === 'game-night' ? '#10b981' : '#059669'; // Green

    // Execute searches
    searchNearby('car_repair', wrenchPath, mechanicColor);
    searchNearby('gas_station', gasPath, gasColor);
    searchNearby('parking', hideoutPath, parkingColor);
    searchNearby('meal_takeaway', foodPath, foodColor); // Focus on takeaway/fast food for drivers

  }, [map, location, mapStyle]);

  return null;
}
