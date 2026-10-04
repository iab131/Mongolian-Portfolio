import * as THREE from "three";

// Shared procedural textures: geometric key/meander ornament bands and felt.
// Purely geometric patterns (no script). Cached per argument set.

const cache = new Map<string, THREE.CanvasTexture>();

function finish(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

/** Draws one cell of a square key (meander) motif into a w×h box. */
function keyCell(g: CanvasRenderingContext2D, x: number, y: number, s: number, lw: number) {
  // A spiral-ish Greek-key step: out, up, in, down, in.
  const u = s / 5;
  g.beginPath();
  g.moveTo(x, y + s - u * 0.5);
  g.lineTo(x + s - u * 0.5, y + s - u * 0.5);
  g.lineTo(x + s - u * 0.5, y + u * 0.5);
  g.lineTo(x + u * 1.5, y + u * 0.5);
  g.lineTo(x + u * 1.5, y + u * 3.5);
  g.lineTo(x + u * 3.5, y + u * 3.5);
  g.lineTo(x + u * 3.5, y + u * 2);
  g.lineWidth = lw;
  g.lineJoin = "miter";
  g.lineCap = "square";
  g.stroke();
}

/**
 * Horizontal ornament band: a key pattern in `fg` on `bg`, with border rules.
 * The texture tiles horizontally; one tile = one motif.
 */
export function ornamentBand(fg: string, bg: string, repeatX = 1): THREE.CanvasTexture {
  const key = `band:${fg}:${bg}`;
  let base = cache.get(key);
  if (!base) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = bg;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = fg;
    g.fillStyle = fg;
    g.fillRect(0, 6, 128, 8);
    g.fillRect(0, 114, 128, 8);
    keyCell(g, 14, 24, 80, 10);
    // small diamond between motifs
    g.beginPath();
    g.moveTo(116, 54);
    g.lineTo(124, 64);
    g.lineTo(116, 74);
    g.lineTo(108, 64);
    g.closePath();
    g.fill();
    base = finish(c);
    cache.set(key, base);
  }
  const t = base.clone();
  t.repeat.set(repeatX, 1);
  t.needsUpdate = true;
  return t;
}

/** A square medallion: concentric diamonds and corner keys. For doors, chest fronts, rugs. */
export function medallion(fg: string, bg: string, accent: string): THREE.CanvasTexture {
  const key = `med:${fg}:${bg}:${accent}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = fg;
  g.lineWidth = 10;
  g.strokeRect(14, 14, 228, 228);
  g.lineWidth = 4;
  g.strokeRect(30, 30, 196, 196);
  for (const [r, col] of [
    [86, fg],
    [60, accent],
    [34, fg],
  ] as const) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(128, 128 - r);
    g.lineTo(128 + r, 128);
    g.lineTo(128, 128 + r);
    g.lineTo(128 - r, 128);
    g.closePath();
    g.fill();
    g.fillStyle = bg;
    const i = r - 12;
    g.beginPath();
    g.moveTo(128, 128 - i);
    g.lineTo(128 + i, 128);
    g.lineTo(128, 128 + i);
    g.lineTo(128 - i, 128);
    g.closePath();
    g.fill();
  }
  g.strokeStyle = fg;
  for (const [x, y] of [
    [40, 40],
    [176, 40],
    [40, 176],
    [176, 176],
  ]) {
    keyCell(g, x, y, 40, 6);
  }
  const t = finish(c);
  cache.set(key, t);
  return t;
}

/** Soft felt / canvas grain, tiles. Multiply with a base colour. */
export function feltTexture(): THREE.CanvasTexture {
  const hit = cache.get("felt");
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const img = g.createImageData(128, 128);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 128 * 128; i++) {
    const v = 226 + rnd() * 29;
    img.data.set([v, v, v - 4, 255], i * 4);
  }
  g.putImageData(img, 0, 0);
  // faint horizontal fibres
  g.globalAlpha = 0.08;
  g.strokeStyle = "#7a6a50";
  for (let y = 0; y < 128; y += 3 + Math.floor(rnd() * 4)) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y + rnd() * 2);
    g.stroke();
  }
  const t = finish(c);
  cache.set("felt", t);
  return t;
}
