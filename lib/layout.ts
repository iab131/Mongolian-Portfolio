import type { GerId } from "@/content/types";

// World layout. North is -z, south is +z. Doors face south, as is traditional.

export type GerSite = { id: GerId; x: number; z: number; radius: number };

export const GER_SITES: GerSite[] = [
  { id: "about", x: 0, z: -12, radius: 6 },
  { id: "vision", x: -40, z: 2, radius: 4.5 },
  { id: "ai", x: -24, z: -40, radius: 4.5 },
  { id: "robotics", x: 24, z: -40, radius: 4.5 },
  { id: "products", x: 40, z: 2, radius: 4.5 },
];

export const gerSiteById = Object.fromEntries(GER_SITES.map((s) => [s.id, s])) as Record<GerId, GerSite>;

export const OVOO = { x: 6, z: 40, radius: 2.2 };

/** yaw = 0 faces north (-z). `speed` optionally starts the horse moving (QA captures). */
export type Pose = { x: number; z: number; yaw: number; speed?: number };

export const SPAWN: Pose = { x: 0, z: 50, yaw: 0 };

/** Where the horse waits outside a ger: in front of the door, facing it. */
export function poseOutside(id: GerId): Pose {
  const s = gerSiteById[id];
  return { x: s.x, z: s.z + s.radius + 4.5, yaw: 0 };
}

/** You can enter when this close to a ger's wall. */
export const ENTER_RANGE = 7;

export const WORLD_RADIUS = 110;
