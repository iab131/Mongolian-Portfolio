import { create } from "zustand";
import type { GerId } from "@/content/types";
import { poseOutside, SPAWN, type Pose } from "./layout";

export type Overlay = "list" | "map" | null;
export type Quality = "high" | "low";

type State = {
  mode: "world" | "interior";
  gerId: GerId | null;
  nearGerId: GerId | null;
  projectSlug: string | null;
  /** Project hovered in the ger (3D object or its label). */
  hoverSlug: string | null;
  overlay: Overlay;
  /** Where the horse should stand. Bumping `spawnVersion` makes the rider jump there. */
  spawn: Pose;
  spawnVersion: number;
  /** Freezes simulation (horse, herd, wind) while rendering continues. For screenshots. */
  paused: boolean;
  quality: Quality;
  muted: boolean;

  setNearGer: (id: GerId | null) => void;
  enterGer: (id: GerId) => void;
  exitGer: () => void;
  travelTo: (id: GerId) => void;
  openProject: (slug: string) => void;
  setHoverSlug: (slug: string | null) => void;
  closeProject: () => void;
  setOverlay: (o: Overlay) => void;
  teleport: (pose: Pose) => void;
  setPaused: (p: boolean) => void;
  setQuality: (q: Quality) => void;
  setMuted: (m: boolean) => void;
};

export const useStore = create<State>()((set, get) => ({
  mode: "world",
  gerId: null,
  nearGerId: null,
  projectSlug: null,
  hoverSlug: null,
  overlay: null,
  spawn: SPAWN,
  spawnVersion: 0,
  paused: false,
  quality: "high",
  muted: true,

  setNearGer: (id) => {
    if (get().nearGerId !== id) set({ nearGerId: id });
  },
  enterGer: (id) => set({ mode: "interior", gerId: id, nearGerId: null, overlay: null, hoverSlug: null }),
  exitGer: () => {
    const id = get().gerId;
    set((s) => ({
      mode: "world",
      gerId: null,
      projectSlug: null,
      ...(id ? { spawn: poseOutside(id), spawnVersion: s.spawnVersion + 1 } : {}),
    }));
  },
  travelTo: (id) =>
    set((s) => ({
      mode: "world",
      gerId: null,
      overlay: null,
      projectSlug: null,
      spawn: poseOutside(id),
      spawnVersion: s.spawnVersion + 1,
    })),
  openProject: (slug) => set({ projectSlug: slug, hoverSlug: null }),
  setHoverSlug: (hoverSlug) => {
    if (get().hoverSlug !== hoverSlug) set({ hoverSlug });
  },
  closeProject: () => set({ projectSlug: null }),
  setOverlay: (overlay) => set({ overlay }),
  teleport: (pose) =>
    set((s) => ({ mode: "world", gerId: null, overlay: null, projectSlug: null, spawn: pose, spawnVersion: s.spawnVersion + 1 })),
  setPaused: (paused) => set({ paused }),
  setQuality: (quality) => set({ quality }),
  setMuted: (muted) => set({ muted }),
}));

/** True when a DOM overlay should swallow riding input. */
export const isUiBlocking = () => {
  const s = useStore.getState();
  return s.projectSlug !== null || s.overlay !== null;
};
