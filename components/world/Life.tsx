"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GER_SITES, gerSiteById } from "@/lib/layout";
import { PartBuilder } from "@/lib/merge";
import { useStore } from "@/lib/store";
import { heightAt, trackDistance } from "@/lib/terrain";
import { worldKit } from "@/lib/worldMaterials";
import { HORIZON } from "./SkyDome";
import { Herds } from "./Herds";
import { eagleParts } from "./Props";

const paused = () => useStore.getState().paused;

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
  const high = useStore((s) => s.quality) === "high";
  return (
    <>
      <Herds />
      {high && <SoaringEagle />}
      <Clouds />
      <FarRidge />
      <Rocks />
    </>
  );
}
