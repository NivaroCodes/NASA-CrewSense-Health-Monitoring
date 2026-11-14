import { create } from 'zustand';

// Cross-route client state only (Spec, Section 12). Server data lives in TanStack Query.
interface MissionState {
  // ISO 8601 mission start, supplied by the backend. Null until received.
  missionStart: string | null;
  missionTag: string | null;
  setMission: (start: string | null, tag: string | null) => void;
}

export const useMissionStore = create<MissionState>((set) => ({
  missionStart: null,
  missionTag: null,
  setMission: (start, tag) => set({ missionStart: start, missionTag: tag }),
}));
