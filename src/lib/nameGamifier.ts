// Utility to gamify place names
export function gamifyName(name: string): string {
  if (!name) return name;

  // Specific overrides requested by user
  if (name.includes("Margalla") || name.includes("Maralla")) {
    return "Beverly Hills Margalla";
  }

  // Common replacements to sound more "game-like" or "fancy"
  const replacements: Record<string, string> = {
    "Street": "St.",
    "Road": "Rd.",
    "Avenue": "Ave.",
    "Boulevard": "Blvd.",
    "Park": "Gardens",
    "School": "Academy",
    "Hospital": "Medical Center",
    "Station": "Terminal",
    "Market": "Plaza",
    "Mall": "Galleria"
  };

  let newName = name;
  
  // Apply replacements
  Object.keys(replacements).forEach(key => {
    newName = newName.replace(key, replacements[key]);
  });

  // Add prefixes/suffixes based on type or randomness to sound like a game map
  // Only apply if it's a generic name
  if (newName.split(' ').length < 3) {
    const prefixes = ["Neo", "Cyber", "Sector", "District", "Upper", "Lower", "New"];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Deterministic "random" prefix
    if (hash % 5 === 0) {
      const prefix = prefixes[hash % prefixes.length];
      if (!newName.includes(prefix)) {
        newName = `${prefix} ${newName}`;
      }
    }
  }

  return newName;
}
