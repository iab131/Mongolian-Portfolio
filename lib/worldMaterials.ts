import * as THREE from "three";
import { feltTexture, medallion, ornamentBand } from "./ornament";

// Shared material roles for the outdoor world. One instance per role, reused everywhere.

let kit: ReturnType<typeof makeKit> | null = null;

function makeKit() {
  const felt = feltTexture();
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...p });
  return {
    felt: std({ color: "#f3eee3", map: felt, roughness: 0.95 }),
    feltShade: std({ color: "#ddd3c0", map: felt, roughness: 0.95 }),
    paintedWood: std({ color: "#c4521c", roughness: 0.55 }),
    rawWood: std({ color: "#7a5434", roughness: 0.9, flatShading: true }),
    darkWood: std({ color: "#4a3221", roughness: 0.9, flatShading: true }),
    rope: std({ color: "#6b4a2c", roughness: 1 }),
    stone: std({ color: "#948d80", roughness: 1, flatShading: true }),
    stoneLight: std({ color: "#b2ab9d", roughness: 1, flatShading: true }),
    iron: std({ color: "#2e2b28", roughness: 0.55, metalness: 0.6 }),
    silver: std({ color: "#d6d2c6", roughness: 0.3, metalness: 0.85 }),
    wool: std({ color: "#efe9dc", roughness: 1, flatShading: true }),
    woolDark: std({ color: "#3a2f28", roughness: 1, flatShading: true }),
    feather: std({ color: "#4a3322", roughness: 0.9, flatShading: true }),
    featherLight: std({ color: "#d9c8a8", roughness: 0.9, flatShading: true }),
    beak: std({ color: "#e0a92b", roughness: 0.5 }),
  };
}

export function worldKit() {
  if (!kit) kit = makeKit();
  return kit;
}

const accentCache = new Map<string, ReturnType<typeof makeAccent>>();

function makeAccent(accent: string) {
  const band = ornamentBand("#f6efe0", accent, 1);
  return {
    accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 }),
    band: new THREE.MeshStandardMaterial({ map: band, roughness: 0.85 }),
    door: new THREE.MeshStandardMaterial({ map: medallion("#f2c14e", "#c4521c", accent), roughness: 0.5, emissive: "#ffb066", emissiveIntensity: 0 }),
    lintel: new THREE.MeshStandardMaterial({ map: ornamentBand("#f2c14e", accent, 1), roughness: 0.6 }),
  };
}

/** Per-ger accent materials (door, ornament bands). */
export function accentKit(accent: string) {
  let k = accentCache.get(accent);
  if (!k) {
    k = makeAccent(accent);
    accentCache.set(accent, k);
  }
  return k;
}

let contactTex: THREE.CanvasTexture | null = null;
/** Soft radial dark blob for fake contact shadows. */
export function contactTexture() {
  if (contactTex) return contactTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(30,22,10,0.55)");
  grad.addColorStop(0.55, "rgba(30,22,10,0.25)");
  grad.addColorStop(1, "rgba(30,22,10,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  contactTex = new THREE.CanvasTexture(c);
  return contactTex;
}
