"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { OVOO } from "@/lib/layout";
import { PartBuilder, spanMatrix } from "@/lib/merge";
import { useStore } from "@/lib/store";
import { heightAt } from "@/lib/terrain";
import { contactTexture, worldKit } from "@/lib/worldMaterials";

// Ovoo: conical stone cairn with a bundle of willow poles wrapped in blue khadag scarves. Marks the spawn.

function buildCairn() {
  const b = new PartBuilder();
  let seed = 21;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = OVOO.radius;
  // Stones stacked in rings that shrink upward: a cone, not a heap of boulders
  for (let ring = 0; ring < 7; ring++) {
    const rr = R * (1 - ring / 7.5);
    const y = ring * 0.32;
    const n = Math.max(3, Math.round(rr * 5.5));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.6 + rnd() * 0.3;
      const s = 0.22 + rnd() * 0.2 - ring * 0.012;
      b.add(
        rnd() > 0.35 ? "stone" : "stoneLight",
        new THREE.DodecahedronGeometry(1, 0),
        [Math.cos(a) * rr * (0.75 + rnd() * 0.2), y + s * 0.5, Math.sin(a) * rr * (0.75 + rnd() * 0.2)],
        [rnd() * 3, rnd() * 3, rnd() * 3],
        [s * (1.1 + rnd() * 0.5), s * 0.75, s],
      );
    }
    // fill the core so it reads solid
    b.add("stone", new THREE.ConeGeometry(rr * 0.8, 0.4, 7), [0, y + 0.2, 0]);
  }
  // Bundle of willow poles leaning together at the top
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const { matrix, len } = spanMatrix([Math.cos(a) * 0.35, 1.6, Math.sin(a) * 0.35], [Math.cos(a) * 0.12, 4.6 + (i % 3) * 0.35, Math.sin(a) * 0.12]);
    b.addMatrix(i % 2 ? "rawWood" : "darkWood", new THREE.CylinderGeometry(0.035, 0.05, len, 5), matrix);
  }
  // Ring of offering stones around the base
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.add("stoneLight", new THREE.DodecahedronGeometry(0.16, 0), [Math.cos(a) * (R + 0.9), 0.05, Math.sin(a) * (R + 0.9)], [a, a * 2, 0], [1, 0.6, 1]);
  }
  return b.build();
}

const SCARF_COLORS = ["#4f9be8", "#2f7fd6", "#7cc0ff", "#4f9be8", "#f4f1ea", "#2f7fd6", "#e2b21b", "#4f9be8"];

export function Ovoo() {
  const kit = worldKit() as unknown as Record<string, THREE.Material>;
  const y = heightAt(OVOO.x, OVOO.z);
  const parts = useMemo(() => buildCairn(), []);

  // Scarves: long thin strips tied near the top, each a bent ribbon that flutters.
  const N = SCARF_COLORS.length;
  const ribbon = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.16, 1.6, 1, 8);
    g.translate(0, -0.8, 0); // pivot at the tie point
    return g;
  }, []);
  const silk = useMemo(
    () => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.45, metalness: 0.05 }),
    [],
  );
  const scarves = useRef<THREE.InstancedMesh>(null);
  const o = useMemo(() => new THREE.Object3D(), []);
  const init = useRef(false);
  useFrame(({ clock }) => {
    const m = scarves.current;
    if (!m) return;
    if (!init.current) {
      const c = new THREE.Color();
      SCARF_COLORS.forEach((col, i) => m.setColorAt(i, c.set(col)));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      init.current = true;
    }
    const t = useStore.getState().paused ? 0 : clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      o.position.set(Math.cos(a) * 0.2, 4.1 + (i % 3) * 0.25, Math.sin(a) * 0.2);
      // Wind blows towards +x; scarves stream out and ripple
      o.rotation.set(Math.sin(t * 2.2 + i) * 0.12, a * 0.3, 1.0 + Math.sin(t * 3.1 + i * 1.7) * 0.18);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[OVOO.x, y, OVOO.z]}>
      {[...parts].map(([k, g]) => (
        <mesh key={k} geometry={g} material={kit[k]} castShadow receiveShadow />
      ))}
      {/* blue khadag wrapped around the pole bundle */}
      {[2.6, 3.2, 3.9].map((h, i) => (
        <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, i]}>
          <torusGeometry args={[0.24 - i * 0.04, 0.05, 5, 12]} />
          <meshStandardMaterial color={i === 1 ? "#f4f1ea" : "#4f9be8"} roughness={0.45} />
        </mesh>
      ))}
      <instancedMesh ref={scarves} args={[ribbon, silk, N]} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={1}>
        <planeGeometry args={[OVOO.radius * 3.4, OVOO.radius * 3.4]} />
        <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
