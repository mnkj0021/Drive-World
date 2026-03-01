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
  
  setUser: (user: UserProfile | null) => void;
  setCrew: (crew: CrewSession | null) => void;
  updateMember: (uid: string, data: Partial<CrewMember>) => void;
  setMembers: (members: Record<string, CrewMember>) => void;
  setMapStyle: (style: MapStyle) => void;
  setRecording: (isRecording: boolean) => void;
  toggleSimulator: () => void;
  updateRunStats: (stats: { distance: number; duration: number; speed: number }) => void;
  setGhostPath: (path: { lat: number; lng: number }[] | null) => void;
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
}));
