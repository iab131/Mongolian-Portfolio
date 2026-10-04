import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { feltTexture, medallion, ornamentBand } from "@/lib/ornament";

// Shared dimensions, palette, procedural textures, materials and geometry helpers
// for the ger interior. Everything is cached at module level so the five gers
// reuse GPU resources; only accent-coloured textures/materials differ per ger.

export const R = 6;
export const WALL_H = 2.3;
export const TOONO_Y = 4.3;
export const TOONO_R = 0.9;
/** Half-angle (radians) of the door opening in the lattice, centred on south. */
export const DOOR_HALF = 0.13;

export const PAL = {
  orange: "#c8561e",
  orangeLight: "#dc7036",
  gold: "#e0ad4a",
  cream: "#efe5cf",
  felt: "#e6dbc3",
  wood: "#7a4a2a",
  woodDark: "#3d2516",
  iron: "#2b2825",
  copper: "#b8693a",
} as const;

export type V3 = [number, number, number];

/** Angle clockwise from north (-z) → position on a circle of radius r. */
export const onCircle = (a: number, r: number, y = 0): V3 => [Math.sin(a) * r, y, -Math.cos(a) * r];

// ---------- colour helpers (sRGB hex space, for canvas painting) ----------

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
export const shade = (hex: string, k: number) => (k < 1 ? mix(hex, "#000000", 1 - k) : mix(hex, "#ffffff", k - 1));
/** The one dark accent tone used behind all accent ornament (keeps texture variants few). */
export const darkAccent = (accent: string) => shade(accent, 0.55);

// ---------- procedural textures ----------

const texCache = new Map<string, THREE.Texture>();
function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  let t = texCache.get(key) as T | undefined;
  if (!t) {
    t = make();
    texCache.set(key, t);
  }
  return t;
}

function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const img = (t: THREE.Texture) => t.image as CanvasImageSource;

/** Tiles an ornament band horizontally across [x, x+len) at height h. */
function bandRow(g: CanvasRenderingContext2D, tile: CanvasImageSource, x: number, y: number, len: number, h: number, tileW = h) {
  g.save();
  g.beginPath();
  g.rect(x, y, len, h);
  g.clip();
  for (let i = 0; i * tileW < len; i++) g.drawImage(tile, x + i * tileW, y, tileW, h);
  g.restore();
}

function feltGrain(g: CanvasRenderingContext2D, w: number, h: number, alpha = 1) {
  g.save();
  g.globalCompositeOperation = "multiply";
  g.globalAlpha = alpha;
  const f = img(feltTexture());
  for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) g.drawImage(f, x, y);
  g.restore();
}

/** Warm wooden floor planks, staggered joints, grain. */
export const planksTexture = () =>
  cached("planks", () =>
    paint(512, 512, (g) => {
      const rnd = rng(11);
      const rows = 8;
      const rh = 512 / rows;
      for (let r = 0; r < rows; r++) {
        const y = r * rh;
        let x = -rnd() * 256;
        while (x < 512) {
          const len = 200 + rnd() * 220;
          const base = mix("#8c5a34", "#a06a3e", rnd());
          g.fillStyle = mix(base, "#5e3a20", rnd() * 0.35);
          g.fillRect(x, y, len, rh);
          // grain
          g.globalAlpha = 0.18;
          for (let k = 0; k < 9; k++) {
            g.strokeStyle = rnd() > 0.5 ? "#4a2c16" : "#c08a58";
            g.lineWidth = 1 + rnd() * 1.5;
            const gy = y + 4 + rnd() * (rh - 8);
            g.beginPath();
            g.moveTo(x, gy);
            g.bezierCurveTo(x + len * 0.3, gy + (rnd() - 0.5) * 6, x + len * 0.7, gy + (rnd() - 0.5) * 6, x + len, gy);
            g.stroke();
          }
          g.globalAlpha = 1;
          // end joint
          g.fillStyle = "#2c1a0e";
          g.fillRect(x + len - 2, y, 3, rh);
          x += len;
        }
        // seam between rows + a soft bevel highlight
        g.fillStyle = "#24150b";
        g.fillRect(0, y, 512, 3);
        g.fillStyle = "rgba(255,220,170,0.10)";
        g.fillRect(0, y + 3, 512, 2);
      }
    }),
  );

/** Quilted felt (shirdeg): felt with stitched diamond lattice and corner keys. One tile ≈ 1 m. */
export const shirdegTexture = () =>
  cached("shirdeg", () =>
    paint(256, 256, (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 256, 256);
      feltGrain(g, 256, 256, 1);
      g.strokeStyle = "rgba(92,58,30,0.55)";
      g.lineWidth = 2.5;
      g.setLineDash([7, 5]);
      const line = (pts: number[][]) => {
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
        g.stroke();
      };
      // diamond lattice (tiles seamlessly)
      line([[0, 128], [128, 0], [256, 128], [128, 256], [0, 128]]);
      line([[0, 108], [108, 0]]);
      line([[148, 0], [256, 108]]);
      line([[256, 148], [148, 256]]);
      line([[108, 256], [0, 148]]);
      // inner key spiral in each diamond centre
      line([[128, 92], [164, 128], [128, 164], [96, 132], [124, 104], [148, 128], [128, 148]]);
      // small corner crosses
      line([[0, 0], [20, 20]]);
      line([[256, 0], [236, 20]]);
      line([[0, 256], [20, 236]]);
      line([[256, 256], [236, 236]]);
    }),
  );

/** Uni (roof pole) paint: orange with accent and gold bands near the crown end (canvas top = pole top). */
export const poleTexture = (accent: string) =>
  cached(`pole:${accent}`, () =>
    paint(16, 256, (g) => {
      g.fillStyle = mix(PAL.orange, PAL.orangeLight, 0.5);
      g.fillRect(0, 0, 16, 256);
      g.fillStyle = PAL.woodDark;
      g.fillRect(0, 0, 16, 7);
      g.fillStyle = accent;
      g.fillRect(0, 12, 16, 12);
      g.fillStyle = PAL.gold;
      g.fillRect(0, 27, 16, 5);
      g.fillStyle = accent;
      g.fillRect(0, 35, 16, 6);
      g.fillStyle = "rgba(255,200,150,0.10)";
      g.fillRect(5, 60, 3, 196);
    }),
  );

/** Bagana pillar paint: orange shaft with ornament bands near the top, middle and foot. */
export const pillarTexture = (accent: string) =>
  cached(`pillar:${accent}`, () =>
    paint(256, 1024, (g) => {
      g.fillStyle = PAL.orange;
      g.fillRect(0, 0, 256, 1024);
      const rnd = rng(5);
      g.globalAlpha = 0.12;
      for (let i = 0; i < 40; i++) {
        g.fillStyle = rnd() > 0.5 ? "#7a2e0c" : "#f08a4a";
        g.fillRect(rnd() * 256, 0, 1 + rnd() * 2, 1024);
      }
      g.globalAlpha = 1;
      const tile = img(ornamentBand(PAL.gold, darkAccent(accent)));
      const band = (y: number, rows: number) => {
        g.fillStyle = PAL.gold;
        g.fillRect(0, y - 8, 256, 5);
        for (let i = 0; i < rows; i++) bandRow(g, tile, 0, y + i * 76, 256, 76, 128);
        g.fillStyle = PAL.gold;
        g.fillRect(0, y + rows * 76 + 3, 256, 5);
      };
      band(40, 2);
      band(470, 1);
      band(900, 1);
    }),
  );

/** A cream felt rug field with ornament border and a central medallion, in the ger accent. */
export const rugTexture = (accent: string) =>
  cached(`rug:${accent}`, () =>
    paint(512, 768, (g) => {
      const dark = darkAccent(accent);
      g.fillStyle = dark;
      g.fillRect(0, 0, 512, 768);
      const tile = img(ornamentBand(PAL.gold, dark));
      const bw = 56;
      bandRow(g, tile, 20, 20, 472, bw);
      bandRow(g, tile, 20, 768 - 20 - bw, 472, bw);
      for (const side of [0, 1]) {
        g.save();
        g.translate(side ? 512 - 20 : 20, side ? 768 - 20 - bw : 20 + bw);
        g.rotate(side ? -Math.PI / 2 : Math.PI / 2);
        bandRow(g, tile, 0, 0, 768 - 40 - 2 * bw, bw);
        g.restore();
      }
      g.fillStyle = PAL.cream;
      g.fillRect(84, 84, 344, 600);
      g.fillStyle = accent;
      g.fillRect(92, 92, 328, 584);
      const med = img(medallion(PAL.gold, accent, PAL.cream));
      g.drawImage(med, 136, 264, 240, 240);
      const small = img(medallion(PAL.cream, accent, PAL.gold));
      g.drawImage(small, 196, 120, 120, 120);
      g.drawImage(small, 196, 528, 120, 120);
      feltGrain(g, 512, 768, 0.9);
    }),
  );

/** Wall tapestry: accent felt, top/bottom ornament bands, medallion, fringe. */
export const tapestryTexture = (accent: string) =>
  cached(`tap:${accent}`, () =>
    paint(256, 512, (g) => {
      const dark = darkAccent(accent);
      g.fillStyle = accent;
      g.fillRect(0, 0, 256, 512);
      const tile = img(ornamentBand(PAL.gold, dark));
      bandRow(g, tile, 0, 10, 256, 52);
      bandRow(g, tile, 0, 430, 256, 52);
      g.fillStyle = PAL.gold;
      g.fillRect(16, 70, 4, 352);
      g.fillRect(236, 70, 4, 352);
      g.drawImage(img(medallion(PAL.gold, accent, PAL.cream)), 38, 156, 180, 180);
      // fringe
      g.fillStyle = PAL.cream;
      for (let x = 4; x < 256; x += 9) g.fillRect(x, 488, 4, 24);
      feltGrain(g, 256, 512, 0.85);
    }),
  );

/** Painted door leaf: accent with gold rule, two medallions and a key band. */
export const doorTexture = (accent: string) =>
  cached(`door:${accent}`, () =>
    paint(256, 768, (g) => {
      g.fillStyle = accent;
      g.fillRect(0, 0, 256, 768);
      g.strokeStyle = PAL.gold;
      g.lineWidth = 10;
      g.strokeRect(10, 10, 236, 748);
      const med = img(medallion(PAL.gold, accent, PAL.orange));
      g.drawImage(med, 28, 40, 200, 200);
      g.drawImage(med, 28, 528, 200, 200);
      bandRow(g, img(ornamentBand(PAL.gold, darkAccent(accent))), 20, 348, 216, 72);
      g.fillStyle = "rgba(0,0,0,0.12)";
      for (let y = 0; y < 768; y += 96) g.fillRect(0, y, 256, 2);
    }),
  );

/**
 * Exhibit placeholder for projects without an image: light felt with a gold double rule
 * and one of four geometric emblems in the accent (sun, mountains, lattice knot, medallion).
 * Deliberately light so it never reads as one of the dark accent wall tapestries.
 */
export const placeholderTexture = (accent: string, variant: number) =>
  cached(`ph:${accent}:${variant}`, () =>
    paint(256, 256, (g) => {
      const dark = darkAccent(accent);
      g.fillStyle = PAL.cream;
      g.fillRect(0, 0, 256, 256);
      feltGrain(g, 256, 256, 0.7);
      g.strokeStyle = PAL.gold;
      g.lineWidth = 6;
      g.strokeRect(12, 12, 232, 232);
      g.lineWidth = 2;
      g.strokeRect(24, 24, 208, 208);
      g.fillStyle = accent;
      g.strokeStyle = accent;
      const c = 128;
      switch (variant % 4) {
        case 0: {
          // sun: disc, ring, alternating rays
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const r1 = i % 2 ? 78 : 92;
            g.beginPath();
            g.moveTo(c + Math.cos(a - 0.12) * 46, c + Math.sin(a - 0.12) * 46);
            g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
            g.lineTo(c + Math.cos(a + 0.12) * 46, c + Math.sin(a + 0.12) * 46);
            g.closePath();
            g.fillStyle = i % 2 ? PAL.gold : accent;
            g.fill();
          }
          g.fillStyle = dark;
          g.beginPath();
          g.arc(c, c, 44, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = PAL.gold;
          g.beginPath();
          g.arc(c, c, 26, 0, Math.PI * 2);
          g.fill();
          break;
        }
        case 1: {
          // mountains under a sun
          g.fillStyle = PAL.gold;
          g.beginPath();
          g.arc(170, 84, 22, 0, Math.PI * 2);
          g.fill();
          const tri = (x: number, w: number, h: number, col: string) => {
            g.fillStyle = col;
            g.beginPath();
            g.moveTo(x - w / 2, 196);
            g.lineTo(x, 196 - h);
            g.lineTo(x + w / 2, 196);
            g.closePath();
            g.fill();
          };
          tri(94, 140, 118, dark);
          tri(160, 130, 88, accent);
          g.fillStyle = PAL.cream;
          g.beginPath();
          g.moveTo(94, 78);
          g.lineTo(78, 106);
          g.lineTo(110, 106);
          g.closePath();
          g.fill();
          g.fillStyle = PAL.gold;
          g.fillRect(40, 198, 176, 8);
          break;
        }
        case 2: {
          // interlaced lattice knot inside a diamond
          g.save();
          g.translate(c, c);
          g.rotate(Math.PI / 4);
          g.lineWidth = 12;
          g.strokeStyle = accent;
          g.strokeRect(-62, -62, 124, 124);
          for (let i = -1; i <= 1; i++) {
            g.strokeStyle = i === 0 ? dark : accent;
            g.beginPath();
            g.moveTo(i * 31, -62);
            g.lineTo(i * 31, 62);
            g.stroke();
            g.beginPath();
            g.moveTo(-62, i * 31);
            g.lineTo(62, i * 31);
            g.stroke();
          }
          g.fillStyle = PAL.gold;
          for (const [x, y] of [[-62, -62], [62, -62], [62, 62], [-62, 62]]) {
            g.beginPath();
            g.arc(x, y, 12, 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
          break;
        }
        default:
          g.drawImage(img(medallion(accent, PAL.cream, PAL.gold)), 36, 36, 184, 184);
      }
    }),
  );

/** Stove fire grate: dark bars with glowing slots. Used as map + emissive map. */
export const grateTexture = () =>
  cached("grate", () =>
    paint(128, 96, (g) => {
      const grd = g.createRadialGradient(64, 60, 4, 64, 60, 70);
      grd.addColorStop(0, "#fff1b0");
      grd.addColorStop(0.35, "#ffb040");
      grd.addColorStop(0.8, "#d8420c");
      grd.addColorStop(1, "#5a1404");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 96);
      g.fillStyle = "#16110e";
      for (let x = 0; x < 128; x += 18) g.fillRect(x, 0, 8, 96);
      g.fillRect(0, 0, 128, 8);
      g.fillRect(0, 88, 128, 8);
    }),
  );

/** Soft radial falloff (white → transparent) for glow cards and halos. */
export const glowTexture = () =>
  cached("glow", () =>
    paint(128, 128, (g) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.35, "rgba(255,255,255,0.45)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
    }),
  );

/** Repeating band, cloned with its own repeat (GPU upload is shared). */
export function band(fg: string, bg: string, repeatX = 1) {
  return ornamentBand(fg, bg, repeatX);
}

export function felt(repeatX: number, repeatY: number) {
  const t = feltTexture().clone();
  t.repeat.set(repeatX, repeatY);
  t.needsUpdate = true;
  return t;
}

// ---------- materials ----------

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

function buildKit(accent: string) {
  const accentDark = darkAccent(accent);
  return {
    accent,
    paint: std({ color: PAL.orange, roughness: 0.55, metalness: 0 }),
    lath: std({ color: PAL.orangeLight, roughness: 0.6 }),
    gold: std({ color: PAL.gold, roughness: 0.32, metalness: 0.75 }),
    woodDark: std({ color: PAL.woodDark, roughness: 0.75 }),
    iron: std({ color: PAL.iron, roughness: 0.55, metalness: 0.55 }),
    copper: std({ color: PAL.copper, roughness: 0.3, metalness: 0.8 }),
    porcelain: std({ color: "#f3efe6", roughness: 0.25 }),
    floor: std({ map: (() => { const t = planksTexture().clone(); t.repeat.set(4, 4); t.needsUpdate = true; return t; })(), roughness: 0.7 }),
    feltFloor: std({ color: "#dccdb0", map: (() => { const t = shirdegTexture().clone(); t.repeat.set(7, 7); t.needsUpdate = true; return t; })(), roughness: 0.95 }),
    feltWall: std({ color: PAL.felt, map: felt(40, 3), roughness: 0.95, side: THREE.BackSide }),
    feltRoof: std({ color: "#f1e8d4", map: felt(36, 4), roughness: 0.95, side: THREE.BackSide }),
    feltAccent: std({ color: accent, map: felt(4, 1), roughness: 0.9 }),
    feltCream: std({ color: PAL.cream, map: felt(3, 1), roughness: 0.95 }),
    pole: std({ map: poleTexture(accent), roughness: 0.55 }),
    pillar: std({ map: pillarTexture(accent), roughness: 0.5 }),
    rug: std({ map: rugTexture(accent), roughness: 0.95 }),
    tapestry: std({ map: tapestryTexture(accent), roughness: 0.9, side: THREE.DoubleSide }),
    door: std({ map: doorTexture(accent), roughness: 0.5 }),
    medallion: std({ map: medallion(PAL.gold, accentDark, PAL.orangeLight), roughness: 0.5 }),
    carpetBand: std({ map: band(PAL.cream, accentDark), roughness: 0.9 }),
    frieze: std({ map: band(PAL.gold, accentDark, 160), roughness: 0.6, side: THREE.BackSide }),
    bedBand: std({ map: band(PAL.gold, accentDark, 1), roughness: 0.6 }),
    sky: new THREE.MeshBasicMaterial({ color: "#a9cdf0", toneMapped: false }),
  };
}

export type Kit = ReturnType<typeof buildKit>;

const phMats = new Map<string, THREE.MeshStandardMaterial>();
export function placeholderMaterial(accent: string, variant: number) {
  const key = `${accent}:${variant % 4}`;
  let m = phMats.get(key);
  if (!m) {
    m = std({ map: placeholderTexture(accent, variant % 4), roughness: 0.9 });
    phMats.set(key, m);
  }
  return m;
}
const kits = new Map<string, Kit>();
export function getKit(accent: string): Kit {
  let k = kits.get(accent);
  if (!k) {
    k = buildKit(accent);
    kits.set(accent, k);
  }
  return k;
}

// ---------- geometry helpers ----------

export type Part = { g: THREE.BufferGeometry; p?: V3; r?: V3; s?: V3 };

/** Bakes transforms and merges parts into one geometry (one draw call). */
export function merge(parts: Part[]): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const list = parts.map(({ g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] }) => {
    const geo = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
    geo.clearGroups();
    geo.applyMatrix4(m.compose(new THREE.Vector3(...p), q.setFromEuler(e.set(...r)), new THREE.Vector3(...s)));
    return geo;
  });
  const out = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  parts.forEach((p) => p.g.dispose());
  if (!out) throw new Error("merge failed");
  return out;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
export function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

/** Builds a geometry from quads given as 4 corners (ccw from the front) + per-corner uvs. */
function quads(list: { p: V3[]; uv: [number, number][] }[]) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  list.forEach((q, i) => {
    q.p.forEach((v) => pos.push(...v));
    q.uv.forEach((v) => uv.push(...v));
    const o = i * 4;
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A picture-frame border of width b around a w×h opening, in the XY plane facing +z.
 * u runs along each side in band-heights (so a square ornament tile stays square), v=1 at the outer edge.
 */
export function frameBand(w: number, h: number, b: number) {
  const x0 = w / 2;
  const y0 = h / 2;
  const x1 = x0 + b;
  const y1 = y0 + b;
  const L = (n: number) => Math.max(1, Math.round(n / b));
  const lh = L(2 * x1);
  const lv = L(2 * y0);
  return quads([
    // top
    { p: [[-x1, y0, 0], [x1, y0, 0], [x1, y1, 0], [-x1, y1, 0]], uv: [[0, 0], [lh, 0], [lh, 1], [0, 1]] },
    // bottom (outer edge down)
    { p: [[-x1, -y1, 0], [x1, -y1, 0], [x1, -y0, 0], [-x1, -y0, 0]], uv: [[lh, 1], [0, 1], [0, 0], [lh, 0]] },
    // right
    { p: [[x0, -y0, 0], [x1, -y0, 0], [x1, y0, 0], [x0, y0, 0]], uv: [[lv, 0], [lv, 1], [0, 1], [0, 0]] },
    // left
    { p: [[-x1, -y0, 0], [-x0, -y0, 0], [-x0, y0, 0], [-x1, y0, 0]], uv: [[0, 1], [0, 0], [lv, 0], [lv, 1]] },
  ]);
}

/** Flat ring strip on the floor (XZ, facing +y) with u along the arc in band-widths. */
export function ringBand(r0: number, r1: number, segments = 96) {
  const b = r1 - r0;
  const reps = Math.round((2 * Math.PI * (r0 + r1)) / 2 / b);
  const list: { p: V3[]; uv: [number, number][] }[] = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const u0 = (i / segments) * reps;
    const u1 = ((i + 1) / segments) * reps;
    const P = (a: number, r: number): V3 => [Math.cos(a) * r, 0, Math.sin(a) * r];
    list.push({ p: [P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r1)], uv: [[u0, 0], [u1, 0], [u1, 1], [u0, 1]] });
  }
  return quads(list);
}

/** Box helper shorthand. */
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
