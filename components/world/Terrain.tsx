"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { GER_SITES, OVOO, WORLD_RADIUS } from "@/lib/layout";
import { heightAt, smoothstep, trackDistance } from "@/lib/terrain";

const SIZE = WORLD_RADIUS * 4.2;
const SEGMENTS = 200;
const TEX = 1024;

const GRASS_LOW = new THREE.Color("#5e7a2a");
const GRASS_HIGH = new THREE.Color("#a99a42");
const DIRT = new THREE.Color("#b49a6c");
const DIRT_DARK = new THREE.Color("#8d7552");
const ROCK = new THREE.Color("#7f7466");
const SLOPE = new THREE.Color("#7c7a46");
const SNOW = new THREE.Color("#eef1f3");

/** Paints the whole ground once: grass patchwork, worn tracks, trampled rings, rock and snow. */
function paintGround() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TEX;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(TEX, TEX);
  const c = new THREE.Color();
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const px = SIZE / TEX;
  for (let py = 0; py < TEX; py++) {
    const z = (py + 0.5) * px - SIZE / 2;
    for (let pxi = 0; pxi < TEX; pxi++) {
      const x = (pxi + 0.5) * px - SIZE / 2;
      const h = heightAt(x, z);
      const slope = Math.abs(heightAt(x + 1, z) - h) + Math.abs(heightAt(x, z + 1) - h);

      const patch = 0.5 + 0.5 * Math.sin(x * 0.09 + Math.sin(z * 0.07) * 2) * Math.cos(z * 0.05);
      const fine = 0.5 + 0.5 * Math.sin(x * 0.8 + z * 0.3) * Math.sin(z * 0.9 - x * 0.2);
      c.copy(GRASS_LOW).lerp(GRASS_HIGH, patch * 0.75 + fine * 0.12);

      // Worn tracks with darker wheel ruts in the middle
      const d = Math.abs(x) < WORLD_RADIUS * 1.2 && Math.abs(z) < WORLD_RADIUS * 1.2 ? trackDistance(x, z) : 99;
      const track = 1 - smoothstep(0.4, 1.7, d);
      c.lerp(DIRT, track * 0.62);
      c.lerp(DIRT_DARK, (1 - smoothstep(0.0, 0.35, Math.abs(d - 0.6))) * track * 0.25);

      // Trampled rings around gers and the ovoo
      for (const s of [...GER_SITES, OVOO]) {
        const dd = Math.hypot(x - s.x, z - s.z) - s.radius;
        if (dd < 5) c.lerp(DIRT, (1 - smoothstep(0, 4, dd)) * 0.35);
      }

      // Hills: olive steppe slopes, then bare rock on steep faces and high ground, then snow
      c.lerp(SLOPE, smoothstep(3, 10, h) * 0.6);
      c.lerp(ROCK, Math.min(1, smoothstep(14, 30, h) * 0.8 + smoothstep(0.9, 2.2, slope) * 0.6));
      c.lerp(SNOW, smoothstep(36, 46, h + slope * 2));

      const n = 0.94 + rnd() * 0.12;
      const i = (py * TEX + pxi) * 4;
      img.data[i] = Math.min(255, c.r * 255 * n);
      img.data[i + 1] = Math.min(255, c.g * 255 * n);
      img.data[i + 2] = Math.min(255, c.b * 255 * n);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  // Canvas row 0 is z = -SIZE/2, which is v = 1 on the rotated plane, so flipY stays default.
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function Terrain() {
  const { geometry, map } = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    return { geometry: g, map: paintGround() };
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial map={map} flatShading roughness={1} />
    </mesh>
  );
}
