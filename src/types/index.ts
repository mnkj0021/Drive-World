export interface UserProfile {
  uid: string;
  displayName: string;
  avatarColor: string;
  isAnonymous: boolean;
  createdAt: number;
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  heading: number;
  speed: number; // m/s
  accuracy?: number; // meters
  timestamp: number;
}

export interface CrewMember extends UserProfile {
  location?: LocationUpdate;
  lastSeen?: number;
  status: 'online' | 'idle' | 'offline';
}

export interface CrewSession {
  id: string;
  ownerId: string;
  joinCode: string;
  createdAt: number;
  name: string;
}

export interface RunPoint {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: number;
}

export interface RunSummary {
  id: string;
  userId: string;
  startTime: number;
  endTime: number;
  distanceKm: number;
  durationSec: number;
  avgSpeedKmh: number;
  topSpeedKmh: number;
  pathEncoded: string; // Google Maps Polyline encoding
}

export type MapStyle = 'game-day' | 'game-night';

export interface POI {
  id: string;
  lat: number;
  lng: number;
  type: 'gas_station' | 'restaurant' | 'car_repair' | 'parking';
  name: string;
  rating?: number;
  address?: string;
}

export interface Waypoint {
  lat: number;
  lng: number;
  name?: string;
}

export type SavedPlaceKey = 'home' | 'work' | 'favorite';

export interface SavedPlace {
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  updatedAt: number;
}

export type SavedPlaces = Partial<Record<SavedPlaceKey, SavedPlace>>;

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'speed' | 'distance' | 'time' | 'smoothness';
  targetValue: number;
  currentValue: number;
  unit: string;
  completed: boolean;
  rewardXP: number;
}
