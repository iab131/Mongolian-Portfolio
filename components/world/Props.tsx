"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { GerId } from "@/content/types";
import { gerSiteById } from "@/lib/layout";
import { PartBuilder, spanMatrix } from "@/lib/merge";
import { useStore } from "@/lib/store";
import { heightAt } from "@/lib/terrain";
import { worldKit } from "@/lib/worldMaterials";

// One signature prop beside each ger (east side), so each camp reads differently from a distance.

type Built = Map<string, THREE.BufferGeometry>;

function Merged({ parts, pos, rotY = 0 }: { parts: Built; pos: [number, number, number]; rotY?: number }) {
  const kit = worldKit() as unknown as Record<string, THREE.Material>;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {[...parts].map(([k, g]) => (
        <mesh key={k} geometry={g} material={kit[k]} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Golden eagle body; wings optional (folded when perched). Faces -z. */
export function eagleParts(b: PartBuilder, folded: boolean) {
  b.add("feather", new THREE.SphereGeometry(0.22, 8, 6), [0, 0, 0], [0, 0, 0], [0.8, 0.85, 1.5]);
  b.add("featherLight", new THREE.SphereGeometry(0.13, 8, 6), [0, 0.18, -0.26], [0, 0, 0], [0.9, 0.95, 1.05]);
  b.add("beak", new THREE.ConeGeometry(0.045, 0.14, 5), [0, 0.15, -0.42], [-Math.PI / 2 - 0.4, 0, 0]);
  b.add("feather", new THREE.BoxGeometry(0.22, 0.03, 0.36), [0, -0.02, 0.42], [0.15, 0, 0]);
  if (folded) {
    for (const s of [-1, 1]) {
      b.add("feather", new THREE.BoxGeometry(0.06, 0.32, 0.5), [s * 0.17, -0.02, 0.06], [0.25, 0, s * 0.1]);
    }
  }
}

function buildPerch() {
  const b = new PartBuilder();
  b.add("rawWood", new THREE.CylinderGeometry(0.07, 0.09, 1.9, 6), [0, 0.95, 0]);
  b.add("rawWood", new THREE.BoxGeometry(0.9, 0.08, 0.1), [0, 1.9, 0]);
  b.add("stone", new THREE.DodecahedronGeometry(0.28, 0), [0, 0.1, 0], [0, 0, 0], [1.3, 0.5, 1.3]);
  const e = new PartBuilder();
  eagleParts(e, true);
  for (const [k, g] of e.build()) b.addMatrix(k, g, new THREE.Matrix4().compose(new THREE.Vector3(0.2, 2.16, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0.9, 0)), new THREE.Vector3(1, 1, 1)));
  return b.build();
}

function buildHitchingPost() {
  const b = new PartBuilder();
  for (const x of [-1.4, 1.4]) b.add("rawWood", new THREE.CylinderGeometry(0.08, 0.1, 1.3, 6), [x, 0.65, 0]);
  b.add("rawWood", new THREE.CylinderGeometry(0.05, 0.05, 3.0, 6), [0, 1.2, 0], [0, 0, Math.PI / 2]);
  // A spare painted saddle resting on the rail, with blue felt cloth
  b.add("paintedWood", new THREE.BoxGeometry(0.42, 0.1, 0.5), [0.2, 1.32, 0]);
  b.add("paintedWood", new THREE.BoxGeometry(0.36, 0.22, 0.07), [0.2, 1.44, -0.22], [0.25, 0, 0]);
  b.add("paintedWood", new THREE.BoxGeometry(0.4, 0.2, 0.07), [0.2, 1.43, 0.24], [-0.3, 0, 0]);
  b.add("rope", new THREE.BoxGeometry(0.85, 0.5, 0.04), [0.2, 1.05, 0], [0, Math.PI / 2, 0]);
  b.add("rope", new THREE.TorusGeometry(0.14, 0.02, 4, 10), [-0.9, 1.05, 0], [0, Math.PI / 2, 0]);
  return b.build();
}

function buildCart() {
  const b = new PartBuilder();
  // Two big spoked wheels
  for (const s of [-1, 1]) {
    b.add("rawWood", new THREE.TorusGeometry(0.75, 0.06, 5, 18), [s * 0.75, 0.78, 0], [0, Math.PI / 2, 0]);
    b.add("darkWood", new THREE.CylinderGeometry(0.13, 0.13, 0.22, 8), [s * 0.75, 0.78, 0], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      b.add("rawWood", new THREE.BoxGeometry(0.04, 1.44, 0.05), [s * 0.75, 0.78, 0], [a, 0, 0]);
    }
  }
  b.add("darkWood", new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6), [0, 0.78, 0], [0, 0, Math.PI / 2]);
  // Bed and side rails, long shafts forward
  b.add("rawWood", new THREE.BoxGeometry(1.25, 0.08, 2.2), [0, 1.05, 0]);
  for (const s of [-1, 1]) {
    b.add("rawWood", new THREE.BoxGeometry(0.06, 0.32, 2.2), [s * 0.6, 1.25, 0]);
    const { matrix, len } = spanMatrix([s * 0.45, 1.05, -1.0], [s * 0.35, 0.35, -3.0]);
    b.addMatrix("rawWood", new THREE.CylinderGeometry(0.05, 0.04, len, 5), matrix);
  }
  // Load: felt bundles tied with rope, a painted chest
  b.add("felt", new THREE.CylinderGeometry(0.28, 0.28, 1.0, 10), [-0.25, 1.37, 0.35], [0, 0, Math.PI / 2]);
  b.add("feltShade", new THREE.CylinderGeometry(0.25, 0.25, 0.9, 10), [0.15, 1.6, 0.45], [0, 0, Math.PI / 2]);
  b.add("paintedWood", new THREE.BoxGeometry(0.7, 0.45, 0.5), [0.15, 1.33, -0.5]);
  b.add("rope", new THREE.TorusGeometry(0.29, 0.02, 4, 12), [-0.25, 1.37, 0.35], [0, Math.PI / 2, 0]);
  return b.build();
}

function buildWoodpile() {
  const b = new PartBuilder();
  let i = 0;
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 5 - row; k++) {
      b.add(i++ % 3 ? "rawWood" : "darkWood", new THREE.CylinderGeometry(0.12, 0.12, 1.1, 6), [(k - (4 - row) / 2) * 0.25, 0.12 + row * 0.21, 0], [Math.PI / 2, 0, 0]);
    }
  }
  // milk churns and a low bench
  b.add("silver", new THREE.CylinderGeometry(0.2, 0.22, 0.6, 10), [1.2, 0.3, 0.2]);
  b.add("silver", new THREE.CylinderGeometry(0.1, 0.18, 0.15, 10), [1.2, 0.67, 0.2]);
  b.add("silver", new THREE.CylinderGeometry(0.17, 0.19, 0.5, 10), [1.6, 0.25, -0.15]);
  b.add("paintedWood", new THREE.BoxGeometry(1.4, 0.08, 0.4), [-0.2, 0.45, 1.0]);
  for (const x of [-0.75, 0.35]) b.add("paintedWood", new THREE.BoxGeometry(0.08, 0.45, 0.35), [x, 0.22, 1.0]);
  return b.build();
}

const FLAG_COLORS = ["#1d4f9a", "#f4f1ea", "#c8372b", "#2f7d5b", "#e2b21b"];

/** Line of coloured pennants strung between two poles, fluttering. */
function FlagLine({ pos }: { pos: [number, number, number] }) {
  const kit = worldKit();
  const n = 15;
  const span = 6;
  const flags = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.32, 0, 0, 0, -0.42, 0], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 }), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const sag = (t: number) => 2.55 - Math.sin(Math.PI * t) * 0.5;
  useFrame(({ clock }) => {
    const m = flags.current;
    if (!m) return;
    const t0 = useStore.getState().paused ? 0 : clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      o.position.set(-span / 2 + span * t, sag(t), 0);
      o.rotation.set(0, Math.sin(t0 * 3 + i) * 0.35 + 0.5, Math.sin(t0 * 5 + i * 1.7) * 0.08);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  const colored = useMemo(() => {
    const c = new THREE.Color();
    return (m: THREE.InstancedMesh | null) => {
      if (!m) return;
      flags.current = m;
      for (let i = 0; i < n; i++) m.setColorAt(i, c.set(FLAG_COLORS[i % FLAG_COLORS.length]));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    };
  }, []);
  return (
    <group position={pos} rotation={[0, 0.5, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * span) / 2, 1.4, 0]} material={kit.rawWood} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 2.8, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]} material={kit.rope}>
        <tubeGeometry
          args={[
            new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => new THREE.Vector3(-span / 2 + (span * i) / 8, sag(i / 8) + 0.02, 0))),
            24,
            0.015,
            4,
          ]}
        />
      </mesh>
      <instancedMesh ref={colored} args={[geo, mat, n]} castShadow />
    </group>
  );
}

const PROP_OFFSET = (id: GerId): [number, number, number] => {
  const s = gerSiteById[id];
  const x = s.x + s.radius + 3.2;
  const z = s.z + 1.5;
  return [x, heightAt(x, z), z];
};

export function Props() {
  const perch = useMemo(() => buildPerch(), []);
  const hitch = useMemo(() => buildHitchingPost(), []);
  const cart = useMemo(() => buildCart(), []);
  const wood = useMemo(() => buildWoodpile(), []);
  return (
    <>
      <Merged parts={perch} pos={PROP_OFFSET("vision")} />
      <FlagLine pos={PROP_OFFSET("ai")} />
      <Merged parts={hitch} pos={PROP_OFFSET("robotics")} rotY={-0.4} />
      <Merged parts={cart} pos={PROP_OFFSET("products")} rotY={0.6} />
      <Merged parts={wood} pos={PROP_OFFSET("about")} rotY={-0.3} />
    </>
  );
}

/** Colliders for the props, for the rider. */
export const PROP_COLLIDERS = (["vision", "ai", "robotics", "products", "about"] as GerId[]).map((id) => {
  const [x, , z] = PROP_OFFSET(id);
  return { x, z, radius: id === "ai" ? 0.6 : 1.3 };
});
