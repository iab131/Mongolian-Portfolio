import * as THREE from "three";

// World-anchored labels rendered as ordinary DOM in the main React tree.
// 3D side registers an anchor; DOM side registers an element; the projector
// moves the element to the anchor's screen position every frame.

type Entry = {
  pos: THREE.Vector3;
  active: boolean;
  /** Distance at which the label is drawn at scale 1. */
  size: number;
  maxDist: number;
  minScale: number;
  el: HTMLElement | null;
};

const entries = new Map<string, Entry>();

function entry(id: string): Entry {
  let e = entries.get(id);
  if (!e) {
    e = { pos: new THREE.Vector3(), active: false, size: 10, maxDist: Infinity, minScale: 0.55, el: null };
    entries.set(id, e);
  }
  return e;
}

export function setAnchor(id: string, opts: { size: number; maxDist?: number; minScale?: number }) {
  const e = entry(id);
  e.active = true;
  e.size = opts.size;
  e.maxDist = opts.maxDist ?? Infinity;
  e.minScale = opts.minScale ?? (id.startsWith("hang-") ? 0.75 : 0.55);
  return e.pos;
}

export function clearAnchor(id: string) {
  const e = entry(id);
  e.active = false;
  if (e.el) e.el.style.visibility = "hidden";
}

export function setLabelEl(id: string, el: HTMLElement | null) {
  const e = entry(id);
  e.el = el;
  if (el) el.style.visibility = "hidden";
}

const v = new THREE.Vector3();

export function projectLabels(camera: THREE.Camera, width: number, height: number) {
  for (const e of entries.values()) {
    if (!e.el) continue;
    if (!e.active) {
      e.el.style.visibility = "hidden";
      continue;
    }
    const dist = camera.position.distanceTo(e.pos);
    v.copy(e.pos).project(camera);
    if (v.z > 1 || dist > e.maxDist) {
      e.el.style.visibility = "hidden";
      continue;
    }
    const x = ((v.x + 1) / 2) * width;
    const y = ((1 - v.y) / 2) * height;
    const scale = Math.min(1.25, Math.max(e.minScale, e.size / dist));
    e.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
    e.el.style.zIndex = String(Math.round(1000 - dist));
    e.el.style.visibility = "visible";
  }
}
