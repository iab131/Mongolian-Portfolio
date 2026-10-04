"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GER_SITES, gerSiteById } from "@/lib/layout";
import { PartBuilder } from "@/lib/merge";
import { riderPose } from "@/lib/rider";
import { useStore } from "@/lib/store";
import { heightAt, trackDistance } from "@/lib/terrain";
import { worldKit } from "@/lib/worldMaterials";
import { HORIZON } from "./SkyDome";
import { eagleParts } from "./Props";

const paused = () => useStore.getState().paused;

// ───────────────────────── Herd: sheep and goats (2 draw calls) ─────────────────────────

const HERD_CENTER = { x: 26, z: 24 };
const HERD_N = 34;

function sheepGeometries() {
  const body = new PartBuilder();
  body.add("wool", new THREE.IcosahedronGeometry(0.42, 1), [0, 0.62, 0], [0, 0, 0], [0.85, 0.75, 1.15]);
  body.add("wool", new THREE.IcosahedronGeometry(0.2, 0), [0, 0.78, -0.38], [0, 0, 0], [1, 0.9, 1]);
  const dark = new PartBuilder();
  dark.add("woolDark", new THREE.BoxGeometry(0.17, 0.2, 0.3), [0, 0.68, -0.58], [0.5, 0, 0]);
  for (const s of [-1, 1]) dark.add("woolDark", new THREE.BoxGeometry(0.16, 0.05, 0.08), [s * 0.13, 0.78, -0.5], [0, 0, s * 0.4]);
  for (const [x, z] of [
    [-0.18, -0.3],
    [0.18, -0.3],
    [-0.18, 0.3],
    [0.18, 0.3],
  ]) {
    dark.add("woolDark", new THREE.CylinderGeometry(0.045, 0.035, 0.42, 5), [x, 0.21, z]);
  }
  return { body: body.build().get("wool")!, dark: dark.build().get("woolDark")! };
}

type Animal = { x: number; z: number; yaw: number; speed: number; tx: number; tz: number; timer: number; graze: number };

// Deterministic wander so captures are repeatable.
let herdSeed = 31337;
const herdRnd = () => ((herdSeed = (herdSeed * 16807) % 2147483647) / 2147483647);

function Herd() {
  const kit = worldKit();
  const geos = useMemo(() => sheepGeometries(), []);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const darkRef = useRef<THREE.InstancedMesh>(null);
  const herd = useMemo<Animal[]>(() => {
    let seed = 99;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: HERD_N }, () => {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * 9;
      const x = HERD_CENTER.x + Math.cos(a) * d;
      const zz = HERD_CENTER.z + Math.sin(a) * d;
      return { x, z: zz, yaw: rnd() * 6.28, speed: 0, tx: x, tz: zz, timer: rnd() * 5, graze: rnd() * 6 };
    });
  }, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const colorInit = useRef(false);

  useFrame((_, rawDt) => {
    const b = bodyRef.current;
    const k = darkRef.current;
    if (!b || !k) return;
    if (!colorInit.current) {
      const c = new THREE.Color();
      herd.forEach((_, i) => b.setColorAt(i, c.set(i % 5 === 0 ? "#7a5a3c" : i % 7 === 0 ? "#3b322b" : i % 3 ? "#f2ede2" : "#e3d7c0")));
      if (b.instanceColor) b.instanceColor.needsUpdate = true;
      colorInit.current = true;
    }
    const dt = paused() ? 0 : Math.min(rawDt, 0.05);
    herd.forEach((a, i) => {
      a.timer -= dt;
      const dxh = a.x - riderPose.x;
      const dzh = a.z - riderPose.z;
      const dh = Math.hypot(dxh, dzh);
      let want = 0;
      if (dh < 7 && Math.abs(riderPose.speed) > 1) {
        // Scatter away from the horse
        a.tx = a.x + (dxh / dh) * 6;
        a.tz = a.z + (dzh / dh) * 6;
        want = 3.2;
        a.timer = 1.5;
      } else if (a.timer <= 0) {
        const ang = herdRnd() * Math.PI * 2;
        const d = Math.sqrt(herdRnd()) * 10;
        a.tx = HERD_CENTER.x + Math.cos(ang) * d;
        a.tz = HERD_CENTER.z + Math.sin(ang) * d;
        a.timer = 4 + herdRnd() * 8;
      }
      const dx = a.tx - a.x;
      const dz = a.tz - a.z;
      const dist = Math.hypot(dx, dz);
      if (!want && dist > 0.6) want = 0.7;
      a.speed += (want - a.speed) * (1 - Math.exp(-3 * dt));
      if (dist > 0.05) {
        const targetYaw = Math.atan2(-dx, -dz);
        let dy = targetYaw - a.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        a.yaw += dy * (1 - Math.exp(-4 * dt));
      }
      a.x += -Math.sin(a.yaw) * a.speed * dt;
      a.z += -Math.cos(a.yaw) * a.speed * dt;
      // stay out of gers
      for (const g of GER_SITES) {
        const gx = a.x - g.x;
        const gz = a.z - g.z;
        const gd = Math.hypot(gx, gz);
        if (gd < g.radius + 1) {
          a.x = g.x + (gx / gd) * (g.radius + 1);
          a.z = g.z + (gz / gd) * (g.radius + 1);
        }
      }
      a.graze += dt;
      const grazing = a.speed < 0.2 ? Math.max(0, Math.sin(a.graze * 0.7)) : 0;
      const step = a.speed > 0.2 ? Math.abs(Math.sin(a.graze * a.speed * 6)) * 0.05 : 0;
      o.position.set(a.x, heightAt(a.x, a.z) + step, a.z);
      o.rotation.set(grazing * 0.35, a.yaw, 0);
      o.scale.setScalar(i % 5 === 0 ? 1.08 : 0.92 + (i % 4) * 0.04);
      o.updateMatrix();
      b.setMatrixAt(i, o.matrix);
      k.setMatrixAt(i, o.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    k.instanceMatrix.needsUpdate = true;
    b.computeBoundingSphere();
    k.computeBoundingSphere();
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geos.body, kit.wool, HERD_N]} castShadow />
      <instancedMesh ref={darkRef} args={[geos.dark, kit.woolDark, HERD_N]} castShadow />
    </>
  );
}

// ───────────────────────── Eagle circling over the Vision ger ─────────────────────────

function SoaringEagle() {
  const kit = worldKit() as unknown as Record<string, THREE.Material>;
  const body = useMemo(() => {
    const b = new PartBuilder();
    eagleParts(b, false);
    return b.build();
  }, []);
  const wingGeo = useMemo(() => {
    // Broad tapered wing with fingered tip, pivot at the shoulder (x = 0)
    const s = new THREE.Shape();
    s.moveTo(0, -0.18);
    s.lineTo(0.9, -0.22);
    s.lineTo(1.35, -0.05);
    s.lineTo(1.2, 0.1);
    s.lineTo(0, 0.22);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const root = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Mesh | null)[]>([]);
  const site = gerSiteById.vision;
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!paused()) t.current += dt;
    const a = t.current * 0.16;
    const R = 16;
    if (root.current) {
      root.current.position.set(site.x + Math.cos(a) * R, 24 + Math.sin(t.current * 0.4) * 1.5, site.z - 4 + Math.sin(a) * R);
      root.current.rotation.set(0, -a - Math.PI, -0.35);
    }
    const flap = Math.max(0, Math.sin(t.current * 0.5)) > 0.97 ? Math.sin(t.current * 9) * 0.5 : 0.08;
    wings.current.forEach((w, i) => w && (w.rotation.z = (i ? -1 : 1) * flap));
  });
  return (
    <group ref={root} scale={2.2}>
      {[...body].map(([k, g]) => (
        <mesh key={k} geometry={g} material={kit[k]} />
      ))}
      {[1, -1].map((s, i) => (
        <mesh key={s} ref={(el) => void (wings.current[i] = el)} geometry={wingGeo} material={kit.feather} position={[s * 0.12, 0.05, 0]} scale={[s, 1, 1]} />
      ))}
    </group>
  );
}

// ───────────────────────── Clouds (1 draw call) ─────────────────────────

function Clouds() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const PUFFS = 70;
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: "#c9d6e8", emissiveIntensity: 0.45, flatShading: true, fog: false }),
    [],
  );
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const init = useRef(false);
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const m = ref.current;
    if (m && !init.current) {
      const o = new THREE.Object3D();
      let seed = 4242;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      let i = 0;
      for (let c = 0; c < 10; c++) {
        const a = (c / 10) * Math.PI * 2 + rnd() * 0.4;
        const r = 150 + rnd() * 90;
        const cx = Math.cos(a) * r;
        const cz = Math.sin(a) * r;
        const cy = 70 + rnd() * 40;
        const n = 7;
        for (let k = 0; k < n && i < PUFFS; k++, i++) {
          const s = 8 + rnd() * 9;
          o.position.set(cx + (k - n / 2) * 9 + rnd() * 5, cy + rnd() * 5 - (Math.abs(k - n / 2) * 1.5), cz + rnd() * 10);
          o.scale.set(s * 1.3, s * 0.55, s);
          o.rotation.set(rnd(), rnd(), rnd());
          o.updateMatrix();
          m.setMatrixAt(i, o.matrix);
        }
      }
      m.count = i;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      init.current = true;
    }
    if (group.current && !paused()) group.current.rotation.y += dt * 0.004;
  });
  return (
    <group ref={group}>
      <instancedMesh ref={ref} args={[geo, mat, PUFFS]} frustumCulled={false} />
    </group>
  );
}

// ───────────────────────── Far mountain ring (beyond the terrain) ─────────────────────────

function FarRidge() {
  const geo = useMemo(() => {
    const N = 140;
    const R = 330;
    const pos: number[] = [];
    const col: number[] = [];
    const hz = new THREE.Color(HORIZON);
    const rock = new THREE.Color("#6f819c").lerp(hz, 0.35);
    const snow = new THREE.Color("#f1f5fa").lerp(hz, 0.2);
    const h = (i: number) => {
      const a = (i / N) * Math.PI * 2;
      return 30 + 26 * Math.sin(a * 5 + 0.7) * Math.sin(a * 3 + 2) + 16 * Math.sin(a * 13) + 9 * Math.sin(a * 29 + 1);
    };
    const pt = (i: number, y: number, rr = R): [number, number, number] => {
      const a = (i / N) * Math.PI * 2;
      return [Math.cos(a) * rr, y, Math.sin(a) * rr];
    };
    for (let i = 0; i < N; i++) {
      const h0 = Math.max(12, h(i));
      const h1 = Math.max(12, h(i + 1));
      const mid = (h0 + h1) / 2 + 6 * Math.sin(i * 7.3);
      const quads: [number, number, number][][] = [
        [pt(i, -10), pt(i + 1, -10), pt(i + 0.5, mid, R + 8)],
        [pt(i, -10), pt(i + 0.5, mid, R + 8), pt(i, h0)],
        [pt(i + 1, -10), pt(i + 1, h1), pt(i + 0.5, mid, R + 8)],
      ];
      for (const tri of quads) {
        for (const v of tri) {
          pos.push(...v);
          const c = v[1] > 44 ? snow : rock.clone().multiplyScalar(0.8 + 0.25 * Math.max(0, v[1]) / 60);
          col.push(c.r, c.g, c.b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} frustumCulled={false}>
      <meshLambertMaterial vertexColors fog={false} side={THREE.DoubleSide} flatShading emissive="#9fb3cf" emissiveIntensity={0.25} />
    </mesh>
  );
}

// ───────────────────────── Scattered rocks (1 draw call) ─────────────────────────

function Rocks() {
  const kit = worldKit();
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 60;
  const geo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const done = useRef(false);
  useFrame(() => {
    const m = ref.current;
    if (!m || done.current) return;
    const o = new THREE.Object3D();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let i = 0;
    while (i < N) {
      const a = rnd() * Math.PI * 2;
      const r = 12 + rnd() * 95;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (trackDistance(x, z) < 3 || GER_SITES.some((g) => Math.hypot(x - g.x, z - g.z) < g.radius + 6)) continue;
      const s = 0.25 + rnd() * rnd() * 1.3;
      o.position.set(x, heightAt(x, z) - s * 0.25, z);
      o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      o.scale.set(s * (1 + rnd() * 0.6), s * 0.7, s);
      o.updateMatrix();
      m.setMatrixAt(i++, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    done.current = true;
  });
  return <instancedMesh ref={ref} args={[geo, kit.stone, N]} castShadow receiveShadow />;
}

export function Life() {
  return (
    <>
      <Herd />
      <SoaringEagle />
      <Clouds />
      <FarRidge />
      <Rocks />
    </>
  );
}
