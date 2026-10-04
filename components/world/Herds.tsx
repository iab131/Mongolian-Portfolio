"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GER_SITES, OVOO } from "@/lib/layout";
import { riderPose } from "@/lib/rider";
import { useStore } from "@/lib/store";
import { heightAt } from "@/lib/terrain";

// The five snouts of the steppe: horses, camels, cattle, sheep and goats.
// Each species is ONE instanced draw call. Legs swing and heads dip to graze in the vertex
// shader, driven by a per-instance (phase, stride amplitude, graze) attribute.

// ───────────────────────── Geometry builder with vertex colours + rig tags ─────────────────────────

type Rig = { kind: 0 | 1 | 2; py: number; pz: number; off: number }; // 0 body, 1 leg, 2 head
const BODY: Rig = { kind: 0, py: 0, pz: 0, off: 0 };

class AnimalBuilder {
  private geos: THREE.BufferGeometry[] = [];
  private o = new THREE.Object3D();

  add(
    geo: THREE.BufferGeometry,
    shade: number, // multiplies the instance coat colour: 1 = coat, <1 = darker points
    pos: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] | number = 1,
    rig: Rig = BODY,
    tint: [number, number, number] = [1, 1, 1],
  ) {
    this.o.position.set(...pos);
    this.o.rotation.set(...rot);
    if (typeof scale === "number") this.o.scale.setScalar(scale);
    else this.o.scale.set(...scale);
    this.o.updateMatrix();
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(this.o.matrix);
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    const n = g.attributes.position.count;
    const color = new Float32Array(n * 3);
    const rigA = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      color.set([tint[0] * shade, tint[1] * shade, tint[2] * shade], i * 3);
      rigA.set([rig.kind, rig.py, rig.pz, rig.off], i * 4);
    }
    g.setAttribute("color", new THREE.BufferAttribute(color, 3));
    g.setAttribute("aRig", new THREE.BufferAttribute(rigA, 4));
    this.geos.push(g);
    geo.dispose();
    return this;
  }

  /** Four legs hanging from (x, py, z) hips/shoulders; trot-like diagonal phase pairs. */
  legs(spots: [number, number][], py: number, len: number, r: number, shade: number, hoof = 0.3) {
    spots.forEach(([x, z], i) => {
      const rig: Rig = { kind: 1, py, pz: z, off: i === 0 || i === 3 ? 0 : 0.5 };
      this.add(new THREE.CylinderGeometry(r, r * 0.75, len, 5), shade, [x, py - len / 2, z], [0, 0, 0], 1, rig);
      this.add(new THREE.CylinderGeometry(r * 0.85, r * 0.95, 0.07, 5), hoof, [x, py - len + 0.035, z], [0, 0, 0], 1, rig);
    });
    return this;
  }

  build() {
    const g = mergeGeometries(this.geos, false)!;
    this.geos.forEach((x) => x.dispose());
    g.computeBoundingSphere();
    return g;
  }
}

const ico = (r: number, d = 1) => new THREE.IcosahedronGeometry(r, d);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cone = (r: number, h: number, s = 5) => new THREE.ConeGeometry(r, h, s);
const cyl = (a: number, b: number, h: number, s = 6) => new THREE.CylinderGeometry(a, b, h, s);
const head = (py: number, pz: number): Rig => ({ kind: 2, py, pz, off: 0 });

function sheep() {
  const b = new AnimalBuilder();
  b.add(ico(0.42), 1, [0, 0.66, 0], [0, 0, 0], [0.85, 0.75, 1.15]);
  b.add(ico(0.2, 0), 1, [0, 0.82, 0.42], [0, 0, 0], [1, 0.9, 1]); // wool rump
  const H = head(0.78, -0.36);
  b.add(ico(0.18, 0), 1, [0, 0.8, -0.4], [0, 0, 0], 1, H); // wool cap
  b.add(box(0.16, 0.2, 0.3), 0.28, [0, 0.72, -0.58], [0.5, 0, 0], 1, H);
  for (const s of [-1, 1]) b.add(box(0.16, 0.05, 0.08), 0.28, [s * 0.13, 0.8, -0.5], [0, 0, s * 0.4], 1, H);
  b.add(cone(0.08, 0.16, 4), 1, [0, 0.62, 0.55], [2.2, 0, 0]); // fat tail
  b.legs([[-0.17, -0.28], [0.17, -0.28], [-0.17, 0.3], [0.17, 0.3]], 0.44, 0.44, 0.045, 0.28, 0.12);
  return b.build();
}

function goat() {
  const b = new AnimalBuilder();
  b.add(cyl(0.22, 0.24, 0.85, 7), 1, [0, 0.72, 0], [Math.PI / 2, 0, 0], [0.9, 1, 1.05]);
  b.add(cone(0.06, 0.2, 4), 1, [0, 0.86, 0.46], [-0.7, 0, 0]); // perky tail
  const H = head(0.85, -0.38);
  b.add(cyl(0.08, 0.12, 0.38, 6), 1, [0, 0.95, -0.45], [-0.6, 0, 0], 1, H); // neck
  b.add(box(0.15, 0.17, 0.3), 1, [0, 1.12, -0.6], [0.45, 0, 0], 1, H);
  b.add(cone(0.035, 0.16, 4), 0.35, [0, 0.98, -0.7], [Math.PI, 0, 0], 1, H); // beard
  for (const s of [-1, 1]) {
    b.add(cone(0.03, 0.3, 4), 0.55, [s * 0.06, 1.3, -0.52], [0.9, 0, s * 0.15], 1, H, [0.85, 0.8, 0.7]); // horns sweep back
    b.add(box(0.12, 0.04, 0.06), 1, [s * 0.11, 1.17, -0.55], [0, 0, s * 0.5], 1, H);
  }
  b.legs([[-0.13, -0.3], [0.13, -0.3], [-0.13, 0.3], [0.13, 0.3]], 0.55, 0.55, 0.04, 0.6, 0.15);
  return b.build();
}

function cow() {
  const b = new AnimalBuilder();
  b.add(box(0.62, 0.62, 1.45), 1, [0, 1.05, 0]);
  b.add(box(0.56, 0.5, 0.4), 1, [0, 1.12, 0.72]); // hindquarters
  b.add(box(0.5, 0.18, 1.2), 0.85, [0, 0.72, 0]); // belly shade
  b.add(ico(0.12, 0), 0.9, [0, 0.66, 0.42], [0, 0, 0], [1, 0.7, 1], BODY, [1, 0.8, 0.8]); // udder
  b.add(cyl(0.025, 0.035, 0.75, 4), 0.5, [0, 0.95, 0.95], [0.25, 0, 0]); // tail
  b.add(ico(0.07, 0), 0.25, [0, 0.58, 1.02]); // tail tuft
  const H = head(1.15, -0.72);
  b.add(box(0.36, 0.42, 0.42), 1, [0, 1.15, -0.85], [0.3, 0, 0], 1, H); // neck/dewlap
  b.add(box(0.3, 0.32, 0.5), 1, [0, 1.15, -1.12], [0.55, 0, 0], 1, H);
  b.add(box(0.26, 0.2, 0.16), 0.75, [0, 0.98, -1.3], [0.55, 0, 0], 1, H, [1, 0.85, 0.8]); // muzzle
  for (const s of [-1, 1]) {
    b.add(cone(0.035, 0.3, 4), 0.95, [s * 0.22, 1.42, -1.0], [0.2, 0, s * -1.1], 1, H, [0.95, 0.9, 0.75]); // horns
    b.add(box(0.16, 0.06, 0.08), 1, [s * 0.2, 1.3, -0.98], [0, 0, s * 0.3], 1, H); // ears
  }
  b.legs([[-0.22, -0.52], [0.22, -0.52], [-0.22, 0.58], [0.22, 0.58]], 0.82, 0.82, 0.08, 0.85, 0.2);
  return b.build();
}

function camel() {
  // Bactrian: two humps, long curved neck, shaggy throat and hump hair.
  const b = new AnimalBuilder();
  b.add(ico(0.55, 1), 1, [0, 1.85, 0], [0, 0, 0], [0.75, 0.7, 1.35]);
  for (const z of [-0.38, 0.32]) {
    b.add(cone(0.3, 0.6, 7), 1, [0, 2.38, z], [0, 0, 0], [1, 1, 1.1]);
    b.add(ico(0.18, 0), 0.62, [0, 2.66, z], [0, 0, 0], [1.1, 0.6, 1.1]); // shaggy hump tops
  }
  b.add(cyl(0.03, 0.04, 0.6, 4), 0.6, [0, 1.75, 0.82], [0.35, 0, 0]); // tail
  const H = head(2.0, -0.62);
  b.add(cyl(0.13, 0.2, 0.75, 6), 1, [0, 1.85, -0.9], [1.0, 0, 0], 1, H); // lower neck, forward
  b.add(cyl(0.11, 0.14, 0.7, 6), 1, [0, 2.25, -1.28], [-0.25, 0, 0], 1, H); // upper neck, rising
  b.add(ico(0.15, 0), 0.62, [0, 1.95, -1.05], [0, 0, 0], [1, 1.4, 0.8], H); // throat beard
  b.add(box(0.2, 0.22, 0.45), 1, [0, 2.6, -1.4], [0.15, 0, 0], 1, H);
  b.add(box(0.16, 0.14, 0.18), 0.8, [0, 2.5, -1.62], [0.15, 0, 0], 1, H);
  for (const s of [-1, 1]) b.add(cone(0.04, 0.1, 4), 1, [s * 0.09, 2.76, -1.3], [-0.3, 0, s * 0.3], 1, H);
  b.legs([[-0.24, -0.42], [0.24, -0.42], [-0.24, 0.48], [0.24, 0.48]], 1.55, 1.55, 0.07, 0.9, 0.55);
  // knee pads
  for (const [x, z] of [[-0.24, -0.42], [0.24, -0.42]] as [number, number][]) {
    b.add(ico(0.08, 0), 0.62, [x, 0.8, z], [0, 0, 0], 1, { kind: 1, py: 1.55, pz: z, off: x < 0 ? 0 : 0.5 });
  }
  return b.build();
}

function horse() {
  const b = new AnimalBuilder();
  b.add(cyl(0.38, 0.38, 1.1, 8), 1, [0, 1.3, 0], [Math.PI / 2, 0, 0]);
  b.add(ico(0.42, 1), 1, [0, 1.32, -0.6], [0, 0, 0], [0.85, 1, 0.9]);
  b.add(ico(0.44, 1), 1, [0, 1.36, 0.6], [0, 0, 0], [0.92, 0.98, 0.95]);
  b.add(cyl(0.06, 0.12, 1.0, 5), 0.25, [0, 1.15, 1.0], [-0.35, 0, 0]); // long tail
  const H = head(1.55, -0.75);
  b.add(cyl(0.15, 0.26, 0.9, 7), 1, [0, 1.85, -0.98], [-0.72, 0, 0], 1, H);
  b.add(box(0.07, 0.6, 0.12), 0.25, [0, 1.98, -0.88], [-0.72, 0, 0], 1, H); // mane
  b.add(box(0.22, 0.24, 0.58), 1, [0, 2.12, -1.38], [0.75, 0, 0], 1, H);
  b.add(box(0.18, 0.18, 0.2), 0.45, [0, 1.92, -1.58], [0.75, 0, 0], 1, H);
  for (const s of [-1, 1]) b.add(cone(0.04, 0.15, 4), 1, [s * 0.08, 2.4, -1.2], [-0.2, 0, 0], 1, H);
  b.legs([[-0.2, -0.65], [0.2, -0.65], [-0.2, 0.68], [0.2, 0.68]], 1.1, 1.1, 0.07, 0.4, 0.12);
  return b.build();
}

// ───────────────────────── Shared animated material ─────────────────────────

function animalMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "attribute vec4 aRig;\nattribute vec3 aGait;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        if (aRig.x > 0.5) {
          // legs swing (kind 1) about the hip; heads dip to graze (kind 2) about the neck base
          float ang = aRig.x < 1.5 ? sin(aGait.x + aRig.w * 6.2831853) * aGait.y : -aGait.z * 0.95;
          float c = cos(ang), s = sin(ang);
          vec2 r = vec2(transformed.y - aRig.y, transformed.z - aRig.z);
          transformed.y = aRig.y + r.x * c - r.y * s;
          transformed.z = aRig.z + r.x * s + r.y * c;
        }`,
      );
  };
  m.customProgramCacheKey = () => "steppe-animal-rig";
  return m;
}

// ───────────────────────── Species + behaviour ─────────────────────────

type Species = {
  key: string;
  build: () => THREE.BufferGeometry;
  count: [number, number]; // [high, low]
  center: { x: number; z: number };
  spread: number;
  walk: number;
  run: number;
  flee: number;
  stride: number; // world units per gait cycle
  amp: number; // leg swing (rad) at walking pace
  scale: [number, number];
  coats: string[];
  grazes: boolean;
};

export const SPECIES: Species[] = [
  {
    key: "horses",
    build: horse,
    count: [12, 7],
    center: { x: 64, z: -18 },
    spread: 13,
    walk: 1.1,
    run: 9,
    flee: 9,
    stride: 2.4,
    amp: 0.45,
    scale: [0.92, 1.05],
    coats: ["#8a5430", "#6b3a1f", "#a8743c", "#c9a46a", "#3b2a22", "#cfc8bc", "#9a6a3c"],
    grazes: true,
  },
  {
    key: "camels",
    build: camel,
    count: [6, 4],
    center: { x: -66, z: -20 },
    spread: 9,
    walk: 0.8,
    run: 3.2,
    flee: 7,
    stride: 2.8,
    amp: 0.32,
    scale: [0.95, 1.05],
    coats: ["#b08a5a", "#9c7748", "#c6a06c", "#8c6a44"],
    grazes: false,
  },
  {
    key: "cattle",
    build: cow,
    count: [9, 5],
    center: { x: 22, z: 20 },
    spread: 8,
    walk: 0.6,
    run: 2.8,
    flee: 6,
    stride: 1.8,
    amp: 0.3,
    scale: [0.9, 1.08],
    coats: ["#5a3a26", "#2a2420", "#8b5a36", "#e8e2d6", "#6e4a30"],
    grazes: true,
  },
  {
    key: "sheep",
    build: sheep,
    count: [26, 14],
    center: { x: -28, z: 32 },
    spread: 11,
    walk: 0.7,
    run: 3.4,
    flee: 7,
    stride: 0.9,
    amp: 0.4,
    scale: [0.9, 1.1],
    coats: ["#f2ede2", "#e8dfcc", "#f5f1e8", "#d9cdb4"],
    grazes: true,
  },
  {
    key: "goats",
    build: goat,
    count: [14, 8],
    center: { x: -20, z: 40 },
    spread: 10,
    walk: 0.8,
    run: 4,
    flee: 8,
    stride: 1.0,
    amp: 0.42,
    scale: [0.9, 1.05],
    coats: ["#3b302a", "#7a5a3c", "#efe9dc", "#5c4632", "#a8875f"],
    grazes: true,
  },
];

const OBSTACLES = [...GER_SITES, OVOO];

type Animal = { x: number; z: number; yaw: number; speed: number; tx: number; tz: number; timer: number; phase: number; graze: number; grazeT: number; scale: number };

function Herd({ sp, count }: { sp: Species; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { geometry, material, gait } = useMemo(() => {
    const geometry = sp.build();
    const gait = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aGait", gait);
    return { geometry, material: animalMaterial(), gait };
  }, [sp, count]);

  const sim = useMemo(() => {
    let seed = sp.key.length * 7919 + 13;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const animals: Animal[] = Array.from({ length: count }, () => {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * sp.spread;
      const x = sp.center.x + Math.cos(a) * d;
      const z = sp.center.z + Math.sin(a) * d;
      return { x, z, yaw: rnd() * 6.28, speed: 0, tx: x, tz: z, timer: rnd() * 6, phase: rnd() * 6, graze: 0, grazeT: rnd() * 8, scale: sp.scale[0] + rnd() * (sp.scale[1] - sp.scale[0]) };
    });
    return { animals, rnd, colored: false, o: new THREE.Object3D() };
  }, [sp, count]);

  useFrame((_, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const { animals, rnd, o } = sim;
    if (!sim.colored) {
      const c = new THREE.Color();
      animals.forEach((_, i) => m.setColorAt(i, c.set(sp.coats[Math.floor(rnd() * sp.coats.length)])));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      sim.colored = true;
    }
    const dt = useStore.getState().paused ? 0 : Math.min(rawDt, 0.05);
    const g = gait.array as Float32Array;
    animals.forEach((a, i) => {
      a.timer -= dt;
      const dxh = a.x - riderPose.x;
      const dzh = a.z - riderPose.z;
      const dh = Math.hypot(dxh, dzh);
      let want = 0;
      if (dh < sp.flee && Math.abs(riderPose.speed) > 1.5) {
        a.tx = a.x + (dxh / dh) * sp.flee;
        a.tz = a.z + (dzh / dh) * sp.flee;
        want = sp.run;
        a.timer = 1.5;
      } else if (a.timer <= 0) {
        // Wander inside the home range, drifting back if a scare pushed them out
        const ang = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * sp.spread;
        a.tx = sp.center.x + Math.cos(ang) * d;
        a.tz = sp.center.z + Math.sin(ang) * d;
        a.timer = 5 + rnd() * 9;
      }
      const dx = a.tx - a.x;
      const dz = a.tz - a.z;
      const dist = Math.hypot(dx, dz);
      if (!want && dist > 0.6) want = sp.walk;
      a.speed += (want - a.speed) * (1 - Math.exp(-2.5 * dt));
      if (dist > 0.05 && a.speed > 0.05) {
        let dy = Math.atan2(-dx, -dz) - a.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        a.yaw += dy * (1 - Math.exp(-3 * dt));
      }
      a.x += -Math.sin(a.yaw) * a.speed * dt;
      a.z += -Math.cos(a.yaw) * a.speed * dt;
      for (const s of OBSTACLES) {
        const gx = a.x - s.x;
        const gz = a.z - s.z;
        const gd = Math.hypot(gx, gz);
        if (gd < s.radius + 1.2) {
          a.x = s.x + (gx / gd) * (s.radius + 1.2);
          a.z = s.z + (gz / gd) * (s.radius + 1.2);
        }
      }
      a.phase += (a.speed / sp.stride) * Math.PI * 2 * dt;
      // Graze when standing: head eases down and up on its own rhythm
      a.grazeT += dt;
      const grazeWant = sp.grazes && a.speed < 0.15 ? (Math.sin(a.grazeT * 0.45) > -0.2 ? 1 : 0) : 0;
      a.graze += (grazeWant - a.graze) * (1 - Math.exp(-2 * dt));
      const moving = Math.min(1, a.speed / sp.walk);
      g[i * 3] = a.phase;
      g[i * 3 + 1] = sp.amp * moving * (a.speed > sp.walk * 1.5 ? 1.5 : 1);
      g[i * 3 + 2] = a.graze;
      const bob = Math.abs(Math.sin(a.phase)) * 0.04 * moving * a.scale;
      o.position.set(a.x, heightAt(a.x, a.z) + bob, a.z);
      o.rotation.set(0, a.yaw, 0);
      o.scale.setScalar(a.scale);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    gait.needsUpdate = true;
  });

  // Herds roam, so skip per-frame bounds work: always draw (one call per species).
  return <instancedMesh ref={mesh} args={[geometry, material, count]} castShadow receiveShadow frustumCulled={false} />;
}

export function Herds() {
  const high = useStore((s) => s.quality) === "high";
  return (
    <>
      {SPECIES.map((sp) => (
        <Herd key={`${sp.key}-${high}`} sp={sp} count={sp.count[high ? 0 : 1]} />
      ))}
    </>
  );
}
