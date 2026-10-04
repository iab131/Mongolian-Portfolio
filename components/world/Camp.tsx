"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PartBuilder } from "@/lib/merge";
import { mergeStaticChildren } from "@/lib/mergeChildren";
import { useStore } from "@/lib/store";
import { heightAt } from "@/lib/terrain";
import { contactTexture, worldKit } from "@/lib/worldMaterials";
import { SPECIES } from "./Herds";
import { Particles, type ParticlesHandle } from "./Particles";

// Camp life between the gers: an outdoor argal (dried dung) fire, the fuel pile beside it,
// cow pats in the cattle meadow, and the clan's white horsehair standard (tug).

export const FIRE = { x: 8, z: 1 };
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const tangent = new THREE.Vector3();
const qFace = new THREE.Quaternion();
const qFlare = new THREE.Quaternion();
const qWind = new THREE.Quaternion();
export const TUG = { x: -9, z: -2 };

const kitExtra = () => {
  const argal = new THREE.MeshStandardMaterial({ color: "#7a6448", roughness: 1, flatShading: true });
  const argalDry = new THREE.MeshStandardMaterial({ color: "#a08a68", roughness: 1, flatShading: true });
  const dung = new THREE.MeshStandardMaterial({ color: "#3e2c1c", roughness: 0.85, flatShading: true });
  const wicker = new THREE.MeshStandardMaterial({ color: "#8a6a3c", roughness: 1, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: "#e0b23a", metalness: 0.9, roughness: 0.3 });
  const hair = new THREE.MeshStandardMaterial({ color: "#f3efe6", roughness: 0.9, side: THREE.DoubleSide });
  const charcoal = new THREE.MeshStandardMaterial({ color: "#1c1612", roughness: 1, emissive: "#ff5a12", emissiveIntensity: 0.6 });
  return { argal, argalDry, dung, wicker, gold, hair, charcoal };
};
let extra: ReturnType<typeof kitExtra> | null = null;
const camp = () => (extra ??= kitExtra());

/** A patty: flattened, slightly irregular disc. */
const patty = (r: number) => new THREE.CylinderGeometry(r, r * 1.08, r * 0.28, 7);

function buildFirePit() {
  const b = new PartBuilder();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(i % 2 ? "stone" : "stoneLight", new THREE.DodecahedronGeometry(0.22, 0), [Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75], [a, a * 1.7, 0], [1.2, 0.8, 1]);
  }
  // Argal leaning into a cone over the coals
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.add("argal", patty(0.17), [Math.cos(a) * 0.22, 0.2, Math.sin(a) * 0.22], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]);
  }
  b.add("charcoal", new THREE.CylinderGeometry(0.42, 0.5, 0.06, 9), [0, 0.03, 0]);
  return b.build();
}

function buildArgalPile() {
  const b = new PartBuilder();
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Stacked dry patties in a low rounded heap, plus a wicker basket of more fuel
  for (let layer = 0; layer < 5; layer++) {
    const rr = 0.85 - layer * 0.15;
    const n = Math.max(1, Math.round(rr * 9));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + layer;
      b.add(rnd() > 0.3 ? "argalDry" : "argal", patty(0.16 + rnd() * 0.05), [Math.cos(a) * rr * 0.7, 0.05 + layer * 0.09, Math.sin(a) * rr * 0.7], [rnd() * 0.4, rnd() * 3, rnd() * 0.4]);
    }
  }
  b.add("wicker", new THREE.CylinderGeometry(0.34, 0.26, 0.55, 10, 1, true), [1.2, 0.28, 0.2]);
  b.add("wicker", new THREE.TorusGeometry(0.34, 0.03, 4, 12), [1.2, 0.55, 0.2], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) b.add("argalDry", patty(0.15), [1.2 + (i % 2) * 0.1 - 0.05, 0.5 + i * 0.03, 0.2 + (i > 1 ? 0.08 : -0.08)], [0.3, i, 0.2]);
  return b.build();
}

function Merged({ parts, pos, rotY = 0 }: { parts: Map<string, THREE.BufferGeometry>; pos: [number, number, number]; rotY?: number }) {
  // Low props: receive shadows only; the contact blob grounds them.
  const mats = { ...(worldKit() as unknown as Record<string, THREE.Material>), ...(camp() as unknown as Record<string, THREE.Material>) };
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {[...parts].map(([k, g]) => (
        <mesh key={k} geometry={g} material={mats[k]} receiveShadow />
      ))}
    </group>
  );
}

function Campfire({ light }: { light: boolean }) {
  const y = heightAt(FIRE.x, FIRE.z);
  const pit = useMemo(() => buildFirePit(), []);
  const pile = useMemo(() => buildArgalPile(), []);
  const flames = useRef<(THREE.Mesh | null)[]>([]);
  const lamp = useRef<THREE.PointLight>(null);
  const embers = useRef<ParticlesHandle>(null);
  const smoke = useRef<ParticlesHandle>(null);
  const acc = useRef(0);
  // HDR colours (> 1) so only the fire blooms
  const flameMats = useMemo(
    () =>
      [new THREE.Color(3.2, 1.3, 0.25), new THREE.Color(3.6, 2.2, 0.6), new THREE.Color(2.4, 0.7, 0.12)].map(
        (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }),
      ),
    [],
  );
  const t = useRef(0);
  useFrame((_, dt) => {
    if (useStore.getState().paused) return;
    t.current += dt;
    const k = t.current;
    flames.current.forEach((f, i) => {
      if (!f) return;
      const s = 1 + Math.sin(k * (9 + i * 2.3) + i) * 0.18 + Math.sin(k * 23 + i * 4) * 0.08;
      f.scale.set(1 - (s - 1) * 0.5, s, 1 - (s - 1) * 0.5);
      f.rotation.y = k * (0.8 + i * 0.3);
    });
    if (lamp.current) lamp.current.intensity = 9 + Math.sin(k * 11) * 1.6 + Math.sin(k * 27) * 1.1;
    acc.current += dt;
    while (acc.current > 0.08) {
      acc.current -= 0.08;
      embers.current?.emit(FIRE.x + (Math.random() - 0.5) * 0.4, y + 0.5, FIRE.z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 1.4 + Math.random(), (Math.random() - 0.5) * 0.4);
      if (Math.random() < 0.45) smoke.current?.emit(FIRE.x, y + 1.2, FIRE.z, 0.2 + Math.random() * 0.2, 0.8, 0.1);
    }
  });
  const FLAMES: [number, number, number, number][] = [
    [0, 0.42, 0, 0.32],
    [0.12, 0.34, 0.08, 0.2],
    [-0.1, 0.33, -0.07, 0.22],
    [0.02, 0.5, -0.1, 0.14],
  ];
  return (
    <>
      <Merged parts={pit} pos={[FIRE.x, y, FIRE.z]} />
      <Merged parts={pile} pos={[FIRE.x + 2.2, y, FIRE.z - 0.8]} rotY={0.6} />
      {FLAMES.map(([x, fy, z, r], i) => (
        <mesh key={i} ref={(el) => void (flames.current[i] = el)} position={[FIRE.x + x, y + fy, FIRE.z + z]} material={flameMats[i % 3]}>
          <coneGeometry args={[r, r * 3.4, 6]} />
        </mesh>
      ))}
      {light && <pointLight ref={lamp} position={[FIRE.x, y + 0.9, FIRE.z]} color="#ff9a40" distance={12} decay={1.6} intensity={9} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[FIRE.x, y + 0.03, FIRE.z]} renderOrder={1} visible={light}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} />
      </mesh>
      <Particles ref={embers} max={60} color="#ffb347" life={1.4} size0={0.08} size1={0.03} alpha={1} drag={0.6} rise={0.4} />
      <Particles ref={smoke} max={60} color="#d9d4cc" life={4.5} size0={0.5} size1={2.6} alpha={0.28} drag={0.4} rise={0.1} />
    </>
  );
}

/** Fresh pats scattered where the cattle graze (one draw call). */
function CowPats() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 22;
  const done = useRef(false);
  const geo = useMemo(() => patty(0.22), []);
  const cattle = SPECIES.find((s) => s.key === "cattle")!;
  useFrame(() => {
    const m = ref.current;
    if (!m || done.current) return;
    const o = new THREE.Object3D();
    let seed = 77;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * cattle.spread * 1.2;
      const x = cattle.center.x + Math.cos(a) * d;
      const z = cattle.center.z + Math.sin(a) * d;
      const s = 0.7 + rnd() * 0.6;
      o.position.set(x, heightAt(x, z) + 0.02, z);
      o.rotation.set(0, rnd() * 3, 0);
      o.scale.set(s, s * (0.7 + rnd() * 0.5), s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    done.current = true;
  });
  return <instancedMesh ref={ref} args={[geo, camp().dung, N]} receiveShadow />;
}

/** The clan's white tug: gilded trident head over a skirt of white horsehair that sways in the wind. */
function Tug({ high }: { high: boolean }) {
  const y = heightAt(TUG.x, TUG.z);
  const kit = worldKit();
  const c = camp();
  const STRANDS = 44;
  const TOP = 5.6;
  const hairRef = useRef<THREE.InstancedMesh>(null);
  const hairGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.09, 1.25, 1, 3);
    g.translate(0, -0.62, 0); // pivot at the ring
    return g;
  }, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const t = useRef(0);
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (root.current) mergeStaticChildren(root.current);
  }, []);
  useFrame((_, dt) => {
    const m = hairRef.current;
    if (!m) return;
    if (!useStore.getState().paused) t.current += dt;
    for (let i = 0; i < STRANDS; i++) {
      const a = (i / STRANDS) * Math.PI * 2;
      const r = 0.12 + (i % 3) * 0.03;
      // Flare outward, then lean downwind (+x) with gusts
      const gust = Math.sin(t.current * 1.7 + i * 0.37) * 0.12 + Math.sin(t.current * 0.6) * 0.1;
      o.position.set(Math.cos(a) * r, TOP - 0.62, Math.sin(a) * r);
      // face outward, flare the bottom outward about the tangent, then lean downwind (+x)
      qFace.setFromAxisAngle(Y_AXIS, -a + Math.PI / 2);
      qFlare.setFromAxisAngle(tangent.set(-Math.sin(a), 0, Math.cos(a)), 0.3 + (i % 2) * 0.08);
      qWind.setFromAxisAngle(Z_AXIS, 0.14 + gust);
      o.quaternion.copy(qWind).multiply(qFlare).multiply(qFace);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={root} position={[TUG.x, y, TUG.z]}>
      {/* stepped base */}
      <mesh position={[0, 0.15, 0]} material={kit.stone} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1.05, 0.3, 8]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={kit.paintedWood} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 0.24, 8]} />
      </mesh>
      {/* pole */}
      <mesh position={[0, TOP / 2 + 0.3, 0]} material={kit.darkWood} castShadow>
        <cylinderGeometry args={[0.06, 0.08, TOP, 7]} />
      </mesh>
      {/* collar under the hair */}
      <mesh position={[0, TOP - 0.62, 0]} material={c.gold}>
        <cylinderGeometry args={[0.13, 0.16, 0.12, 10]} />
      </mesh>
      {/* gilded trident head: disc, centre blade, two side prongs */}
      <mesh position={[0, TOP + 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} material={c.gold} castShadow>
        <torusGeometry args={[0.18, 0.025, 6, 16]} />
      </mesh>
      <mesh position={[0, TOP + 0.95, 0]} material={c.gold} castShadow>
        <coneGeometry args={[0.07, 0.75, 4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.17, TOP + 0.62, 0]} rotation={[0, 0, -s * 0.25]} material={c.gold}>
          <coneGeometry args={[0.04, 0.42, 4]} />
        </mesh>
      ))}
      <mesh position={[0, TOP + 0.52, 0]} rotation={[0, 0, Math.PI / 2]} material={c.gold}>
        <cylinderGeometry args={[0.025, 0.025, 0.36, 5]} />
      </mesh>
      <instancedMesh ref={hairRef} args={[hairGeo, c.hair, STRANDS]} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} renderOrder={1} visible={high}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Camp({ high }: { high: boolean }) {
  return (
    <>
      <Campfire light={high} />
      <CowPats />
      <Tug high={high} />
    </>
  );
}

export const CAMP_COLLIDERS = [
  { x: FIRE.x, z: FIRE.z, radius: 1.1 },
  { x: FIRE.x + 2.2, z: FIRE.z - 0.8, radius: 1.0 },
  { x: TUG.x, z: TUG.z, radius: 1.1 },
];
