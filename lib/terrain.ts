import { CAMP_HUB, GER_SITES, OVOO, OVOO_HILL, SPAWN, WORLD_RADIUS } from "./layout";

// One analytic height function, shared by mesh generation, CPU ground queries,
// and (via TERRAIN_GLSL) the grass vertex shader, so everything sits on the same surface.

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function rollingHills(x: number, z: number) {
  return (
    Math.sin(x * 0.031 + 0.4) * Math.cos(z * 0.027 - 0.8) * 2.4 +
    Math.sin((x + z) * 0.061 + 1.3) * 0.9 +
    Math.cos(x * 0.12 - z * 0.085) * 0.3
  );
}

/** Cosine-bell hill under the ovoo. */
function hill(x: number, z: number) {
  const d = Math.hypot(x - OVOO_HILL.x, z - OVOO_HILL.z) / OVOO_HILL.radius;
  return d < 1 ? OVOO_HILL.height * 0.5 * (1 + Math.cos(Math.PI * d)) : 0;
}

const base = (x: number, z: number) => rollingHills(x, z) + hill(x, z);

function mountains(x: number, z: number) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const ridge = 0.6 + 0.4 * Math.sin(a * 7 + 1) * Math.sin(a * 3 - 0.5) + 0.2 * Math.sin(a * 17);
  // Ridged detail so slopes break into spurs and gullies instead of smooth domes
  const rug = 1 - Math.abs(Math.sin(x * 0.07 + Math.sin(z * 0.05) * 2.2) * Math.cos(z * 0.065 - x * 0.02));
  const rug2 = 1 - Math.abs(Math.sin(x * 0.17 - z * 0.11 + 0.8));
  const m = smoothstep(WORLD_RADIUS * 1.05, WORLD_RADIUS * 1.9, r);
  return m * (55 * ridge + 16 * rug * rug + 5 * rug2) - m * 8;
}

// Flat pads where things stand, so gers don't float or sink.
export const PADS = [
  ...GER_SITES.map((s) => ({ x: s.x, z: s.z, inner: s.radius + 2, outer: s.radius + 9 })),
  { x: OVOO.x, z: OVOO.z, inner: OVOO.radius + 1.5, outer: OVOO.radius + 6 },
  { x: SPAWN.x, z: SPAWN.z, inner: 2, outer: 8 },
].map((p) => ({ ...p, h: base(p.x, p.z) }));

// Worn tracks: spawn → camp hub → each ger door, and spawn → up the hill to the ovoo. [ax, az, bx, bz]
const ovooApproach = (() => {
  const dx = SPAWN.x - OVOO.x;
  const dz = SPAWN.z - OVOO.z;
  const d = Math.hypot(dx, dz);
  return [OVOO.x + (dx / d) * (OVOO.radius + 2), OVOO.z + (dz / d) * (OVOO.radius + 2)];
})();
export const TRACKS: [number, number, number, number][] = [
  [SPAWN.x, SPAWN.z, CAMP_HUB.x, CAMP_HUB.z],
  ...GER_SITES.map((s) => [CAMP_HUB.x, CAMP_HUB.z, s.x, s.z + s.radius] as [number, number, number, number]),
  [SPAWN.x, SPAWN.z, ovooApproach[0], ovooApproach[1]],
];

export function heightAt(x: number, z: number): number {
  let h = base(x, z);
  for (const p of PADS) {
    const w = 1 - smoothstep(p.inner, p.outer, Math.hypot(x - p.x, z - p.z));
    h += (p.h - h) * w;
  }
  return h + mountains(x, z);
}

/** Distance from point to segment, for the worn tracks between gers. */
export function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function trackDistance(x: number, z: number) {
  let d = Infinity;
  for (const [ax, az, bx, bz] of TRACKS) d = Math.min(d, distToSegment(x, z, ax, az, bx, bz));
  return d;
}

const f = (n: number) => n.toFixed(4);

/** GLSL twin of heightAt/trackDistance. Must stay in sync with the JS above. */
export const TERRAIN_GLSL = /* glsl */ `
float tRolling(vec2 p) {
  return sin(p.x * 0.031 + 0.4) * cos(p.y * 0.027 - 0.8) * 2.4
       + sin((p.x + p.y) * 0.061 + 1.3) * 0.9
       + cos(p.x * 0.12 - p.y * 0.085) * 0.3;
}
float tHill(vec2 p) {
  float d = length(p - vec2(${f(OVOO_HILL.x)}, ${f(OVOO_HILL.z)})) / ${f(OVOO_HILL.radius)};
  return d < 1.0 ? ${f(OVOO_HILL.height)} * 0.5 * (1.0 + cos(3.14159265 * d)) : 0.0;
}
float tMountains(vec2 p) {
  float r = length(p);
  float a = atan(p.y, p.x);
  float ridge = 0.6 + 0.4 * sin(a * 7.0 + 1.0) * sin(a * 3.0 - 0.5) + 0.2 * sin(a * 17.0);
  float rug = 1.0 - abs(sin(p.x * 0.07 + sin(p.y * 0.05) * 2.2) * cos(p.y * 0.065 - p.x * 0.02));
  float rug2 = 1.0 - abs(sin(p.x * 0.17 - p.y * 0.11 + 0.8));
  float m = smoothstep(${f(WORLD_RADIUS * 1.05)}, ${f(WORLD_RADIUS * 1.9)}, r);
  return m * (55.0 * ridge + 16.0 * rug * rug + 5.0 * rug2) - m * 8.0;
}
float tHeight(vec2 p) {
  float h = tRolling(p) + tHill(p);
  float w;
${PADS.map(
  (p) =>
    `  w = 1.0 - smoothstep(${f(p.inner)}, ${f(p.outer)}, length(p - vec2(${f(p.x)}, ${f(p.z)})));\n  h += (${f(p.h)} - h) * w;`,
).join("\n")}
  return h + tMountains(p);
}
float tSeg(vec2 p, vec2 a, vec2 b) {
  vec2 d = b - a;
  float t = clamp(dot(p - a, d) / dot(d, d), 0.0, 1.0);
  return length(p - (a + d * t));
}
float tTrack(vec2 p) {
  float d = 1e6;
${TRACKS.map(([ax, az, bx, bz]) => `  d = min(d, tSeg(p, vec2(${f(ax)}, ${f(az)}), vec2(${f(bx)}, ${f(bz)})));`).join("\n")}
  return d;
}
/** 0 inside a ger/ovoo footprint, 1 away from them. */
float tClear(vec2 p) {
  float c = 1.0;
${[...GER_SITES, { ...OVOO }]
  .map((s) => `  c = min(c, smoothstep(${f(s.radius + 0.2)}, ${f(s.radius + 2.2)}, length(p - vec2(${f(s.x)}, ${f(s.z)}))));`)
  .join("\n")}
  return c;
}
`;

export { smoothstep };
