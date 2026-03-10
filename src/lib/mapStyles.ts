// Game Style Maps
export const MAP_STYLES = {
  'game-night': [
    { elementType: "geometry", stylers: [{ color: "#0f172a" }] }, // Deep blue-black background
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] }, // Hide all icons
    { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] }, // Hide default POIs
    
    // Walking Pathways / Sidewalks (Simulated via Landscape/Transit)
    { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#475569" }, { weight: 1 }] },
    { featureType: "road.local", elementType: "geometry.stroke", stylers: [{ color: "#334155" }, { weight: 0.5 }] }, // Sidewalk edges
    
    // Roads - High Contrast Neon-ish
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#334155" }, { weight: 1 }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    
    // Arterial - Glow effect simulation
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#334155" }] },
    { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#475569" }, { weight: 2 }] },
    
    // Highways - Stand out
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#475569" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#64748b" }, { weight: 3 }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    
    // Transit Lines (Simulate futuristic paths)
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#0ea5e9" }, { weight: 2 }] },
    
    // Water - Deep dark
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#1e293b" }] },
  ],
  'game-day': [
    { elementType: "geometry", stylers: [{ color: "#e2e8f0" }] }, // Light gray-blue
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    
    // Walking Pathways (Simulated)
    { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#94a3b8" }, { weight: 1 }] },
    { featureType: "road.local", elementType: "geometry.stroke", stylers: [{ color: "#e2e8f0" }, { weight: 0.5 }] },
    
    // Roads - Clean White/Gray
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { featureType: "road.arterial", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }, { weight: 1.5 }] },
    
    // Highways - Distinct
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#94a3b8" }, { weight: 2 }] },
    
    // Water - Vibrant Blue
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#38bdf8" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#0ea5e9" }] },
  ]
};
