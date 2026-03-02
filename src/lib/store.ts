import { create } from 'zustand';
import { UserProfile, CrewSession, CrewMember, MapStyle, RunSummary } from '../types';

interface AppState {
  user: UserProfile | null;
  crew: CrewSession | null;
  members: Record<string, CrewMember>;
  mapStyle: MapStyle;
  isRecording: boolean;
  isSimulatorActive: boolean;
  currentRunStats: {
    distance: number;
    duration: number;
    speed: number;
  } | null;
  ghostPath: { lat: number; lng: number }[] | null;
  
  activeTarget: {
    location: { lat: number; lng: number };
    type: 'gas_station' | 'restaurant' | 'parking' | 'car_repair' | null;
    name: string;
    totalDistance?: number;
  } | null;

  setUser: (user: UserProfile | null) => void;
  setCrew: (crew: CrewSession | null) => void;
  updateMember: (uid: string, data: Partial<CrewMember>) => void;
  setMembers: (members: Record<string, CrewMember>) => void;
  setMapStyle: (style: MapStyle) => void;
  setRecording: (isRecording: boolean) => void;
  toggleSimulator: () => void;
  updateRunStats: (stats: { distance: number; duration: number; speed: number }) => void;
  setGhostPath: (path: { lat: number; lng: number }[] | null) => void;
  
  // Game Actions
  setActiveTarget: (target: { location: { lat: number; lng: number }; type: string; name: string; totalDistance?: number } | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  crew: null,
  members: {},
  mapStyle: 'game-night',
  isRecording: false,
  isSimulatorActive: false, // Default to false for real location
  currentRunStats: null,
  ghostPath: null,
  
  activeTarget: null,

  setUser: (user) => set({ user }),
  setCrew: (crew) => set({ crew }),
  updateMember: (uid, data) => set((state) => ({
    members: {
      ...state.members,
      [uid]: { ...state.members[uid], ...data }
    }
  })),
  setMembers: (members) => set({ members }),
  setMapStyle: (style) => set({ mapStyle: style }),
  setRecording: (isRecording) => set({ isRecording, currentRunStats: isRecording ? { distance: 0, duration: 0, speed: 0 } : null }),
  toggleSimulator: () => set((state) => ({ isSimulatorActive: !state.isSimulatorActive })),
  updateRunStats: (stats) => set({ currentRunStats: stats }),
  setGhostPath: (path) => set({ ghostPath: path }),
  
  setActiveTarget: (target) => set({ activeTarget: target as any }),
}));
