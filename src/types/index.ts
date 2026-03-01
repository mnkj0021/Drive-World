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
