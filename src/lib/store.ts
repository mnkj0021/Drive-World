import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  UserProfile,
  CrewSession,
  CrewMember,
  LocationUpdate,
  MapStyle,
  RunSummary,
  POI,
  Waypoint,
  Challenge,
  SavedPlace,
  SavedPlaceKey,
  SavedPlaces
} from '../types/index';

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
  location: LocationUpdate | null;
  ghostPath: { lat: number; lng: number }[] | null;
  followUser: boolean;
  breadcrumbs: { lat: number; lng: number }[];
  routePath: { lat: number; lng: number }[] | null;
  isOffRoute: boolean;
  history: RunSummary[];
  savedPlaces: SavedPlaces;
  
  pois: POI[];
  showHUD: boolean;
  cameraSettings: {
    enabled: boolean;
    showFeed: boolean;
  };

  // Settings
  isSettingsOpen: boolean;
  toggleSettings: () => void;

  // Route Customization
  waypoints: Waypoint[];
  addWaypoint: (point: Waypoint) => void;
  removeWaypoint: (index: number) => void;
  clearWaypoints: () => void;

  // Challenges
  challenges: Challenge[];
  updateChallenge: (id: string, progress: number) => void;
  completeChallenge: (id: string) => void;
  resetChallenges: () => void;

  activeTarget: {
    location: { lat: number; lng: number };
    type: 'gas_station' | 'restaurant' | 'parking' | 'car_repair' | null;
    name: string;
    totalDistance?: number;
    initialDistance?: number;
  } | null;

  setUser: (user: UserProfile | null) => void;
  setCrew: (crew: CrewSession | null) => void;
  updateMember: (uid: string, data: Partial<CrewMember>) => void;
  setMembers: (members: Record<string, CrewMember>) => void;
  setMapStyle: (style: MapStyle) => void;
  setRecording: (isRecording: boolean) => void;
  toggleSimulator: () => void;
  updateRunStats: (stats: { distance: number; duration: number; speed: number }) => void;
  setLocation: (location: LocationUpdate | null) => void;
  setGhostPath: (path: { lat: number; lng: number }[] | null) => void;
  setFollowUser: (follow: boolean) => void;
  setRoutePath: (path: { lat: number; lng: number }[] | null) => void;
  setIsOffRoute: (isOffRoute: boolean) => void;
  addBreadcrumb: (point: { lat: number; lng: number }) => void;
  clearBreadcrumbs: () => void;
  addRunToHistory: (run: RunSummary) => void;
  
  setPois: (pois: POI[]) => void;
  setShowHUD: (show: boolean) => void;
  setCameraSettings: (settings: Partial<AppState['cameraSettings']>) => void;
  setSavedPlace: (key: SavedPlaceKey, place: SavedPlace) => void;
  removeSavedPlace: (key: SavedPlaceKey) => void;

  // Game Actions
  setActiveTarget: (target: { location: { lat: number; lng: number }; type: string; name: string; totalDistance?: number; initialDistance?: number } | null) => void;
}

const INITIAL_CHALLENGES: Challenge[] = [
  {
    id: 'c1',
    title: 'Speed Demon',
    description: 'Reach 100 km/h',
    type: 'speed',
    targetValue: 100,
    currentValue: 0,
    unit: 'km/h',
    completed: false,
    rewardXP: 500
  },
  {
    id: 'c2',
    title: 'Marathon',
    description: 'Drive 5 km in one session',
    type: 'distance',
    targetValue: 5,
    currentValue: 0,
    unit: 'km',
    completed: false,
    rewardXP: 1000
  },
  {
    id: 'c3',
    title: 'Smooth Operator',
    description: 'Drive 2 km without sudden braking',
    type: 'smoothness',
    targetValue: 2,
    currentValue: 0,
    unit: 'km',
    completed: false,
    rewardXP: 750
  }
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
  user: null,
  crew: null,
  members: {},
  mapStyle: 'game-night',
  isRecording: false,
  isSimulatorActive: false, // Default to false for real location
  currentRunStats: null,
  location: null,
  ghostPath: null,
  followUser: true,
  breadcrumbs: [],
  routePath: null,
  isOffRoute: false,
  history: [],
  savedPlaces: {},
  
  activeTarget: null,
  pois: [],
  showHUD: true,
  cameraSettings: {
    enabled: false,
    showFeed: false,
  },

  isSettingsOpen: false,
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  waypoints: [],
  addWaypoint: (point) => set((state) => ({ waypoints: [...state.waypoints, point] })),
  removeWaypoint: (index) => set((state) => ({ waypoints: state.waypoints.filter((_, i) => i !== index) })),
  clearWaypoints: () => set({ waypoints: [] }),

  challenges: INITIAL_CHALLENGES,
  updateChallenge: (id, progress) => set((state) => ({
    challenges: state.challenges.map(c => 
      c.id === id ? { ...c, currentValue: progress, completed: progress >= c.targetValue ? true : c.completed } : c
    )
  })),
  completeChallenge: (id) => set((state) => ({
    challenges: state.challenges.map(c => 
      c.id === id ? { ...c, completed: true } : c
    )
  })),
  resetChallenges: () => set((state) => ({
    challenges: state.challenges.map(c => ({ ...c, currentValue: 0, completed: false }))
  })),

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
  setRecording: (isRecording) => set((state) => ({ 
    isRecording, 
    currentRunStats: isRecording ? { distance: 0, duration: 0, speed: 0 } : null,
    breadcrumbs: isRecording ? [] : state.breadcrumbs // Clear breadcrumbs when starting new recording
  })),
  toggleSimulator: () => set((state) => ({ isSimulatorActive: !state.isSimulatorActive })),
  updateRunStats: (stats) => set({ currentRunStats: stats }),
  setLocation: (location) => set({ location }),
  setGhostPath: (path) => set({ ghostPath: path }),
  setFollowUser: (follow) => set({ followUser: follow }),
  setRoutePath: (path) => set({ routePath: path }),
  setIsOffRoute: (isOffRoute) => set({ isOffRoute }),
  addBreadcrumb: (point) => set((state) => {
    // Only add if it's far enough from the last point to avoid noise
    const lastPoint = state.breadcrumbs[state.breadcrumbs.length - 1];
    if (lastPoint) {
      const dist = Math.sqrt(Math.pow(point.lat - lastPoint.lat, 2) + Math.pow(point.lng - lastPoint.lng, 2));
      if (dist < 0.00001) return state; // ~1 meter
    }
    return { breadcrumbs: [...state.breadcrumbs, point] };
  }),
  clearBreadcrumbs: () => set({ breadcrumbs: [] }),
  addRunToHistory: (run) => set((state) => ({ history: [run, ...state.history] })),
  
  setPois: (pois) => set({ pois }),
  setShowHUD: (show) => set({ showHUD: show }),
  setCameraSettings: (settings) => set((state) => ({ 
    cameraSettings: { ...state.cameraSettings, ...settings } 
  })),
  setSavedPlace: (key, place) =>
    set((state) => ({
      savedPlaces: {
        ...state.savedPlaces,
        [key]: place
      }
    })),
  removeSavedPlace: (key) =>
    set((state) => {
      const next = { ...state.savedPlaces };
      delete next[key];
      return { savedPlaces: next };
    }),

  setActiveTarget: (target) => set({ activeTarget: target as any }),
    }),
    {
      name: 'driveworld-app-state',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        mapStyle: state.mapStyle,
        showHUD: state.showHUD,
        cameraSettings: state.cameraSettings,
        history: state.history,
        challenges: state.challenges,
        savedPlaces: state.savedPlaces
      })
    }
  )
);
