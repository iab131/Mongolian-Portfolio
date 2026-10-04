"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Ger as GerData } from "@/content/types";
import type { GerSite } from "@/lib/layout";
import { PartBuilder, spanMatrix } from "@/lib/merge";
import { ornamentBand } from "@/lib/ornament";
import { useStore } from "@/lib/store";
import { heightAt } from "@/lib/terrain";
import { accentKit, contactTexture, worldKit } from "@/lib/worldMaterials";
import { LabelAnchor } from "../LabelAnchor";

export function gerDims(r: number) {
  return { wallH: r * 0.42, roofH: r * 0.5 };
}

/** Where the chimney smoke comes out, in world space. */
export function chimneyTop(site: GerSite): [number, number, number] {
  const { wallH, roofH } = gerDims(site.radius);
  return [site.x + site.radius * 0.18, heightAt(site.x, site.z) + wallH + roofH * 0.75 + 1.3, site.z - site.radius * 0.05];
}

function buildGer(r: number) {
  const { wallH, roofH } = gerDims(r);
  const b = new PartBuilder();
  const seg = 36;

  // Felt wall, skirt, roof and eave lip
  b.add("felt", new THREE.CylinderGeometry(r, r, wallH, seg, 1, true), [0, wallH / 2, 0]);
  b.add("felt", new THREE.CylinderGeometry(r + 0.05, r + 0.08, 0.32, seg, 1, true), [0, 0.16, 0]);
  b.add("felt", new THREE.CylinderGeometry(r * 0.23, r * 1.07, roofH * 0.82, seg, 1, true), [0, wallH + roofH * 0.41, 0]);
  b.add("felt", new THREE.CylinderGeometry(r * 1.07, r * 1.07, 0.16, seg, 1, true), [0, wallH + 0.02, 0]);
  // Toono crown (accent) and its painted ring
  b.add("accent", new THREE.CylinderGeometry(r * 0.2, r * 0.24, 0.28, 20), [0, wallH + roofH * 0.83, 0]);
  b.add("paintedWood", new THREE.TorusGeometry(r * 0.21, 0.06, 6, 20), [0, wallH + roofH * 0.83 + 0.15, 0], [Math.PI / 2, 0, 0]);

  // Rope bands around the wall
  for (const t of [0.22, 0.6]) {
    b.add("rope", new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.07, seg, 1, true), [0, wallH * t, 0]);
  }
  // Radial roof ropes, eave to toono
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    const { matrix, len } = spanMatrix(
      [Math.sin(a) * r * 1.07, wallH + 0.1, Math.cos(a) * r * 1.07],
      [Math.sin(a) * r * 0.25, wallH + roofH * 0.8 + 0.04, Math.cos(a) * r * 0.25],
    );
    b.addMatrix("rope", new THREE.CylinderGeometry(0.035, 0.035, len, 4), matrix);
  }
  // Wall ties: diagonal ropes either side of the door
  for (const s of [-1, 1]) {
    const a0 = s * 0.42;
    const a1 = s * 0.95;
    const { matrix, len } = spanMatrix(
      [Math.sin(a0) * (r + 0.04), wallH * 0.95, Math.cos(a0) * (r + 0.04)],
      [Math.sin(a1) * (r + 0.04), wallH * 0.1, Math.cos(a1) * (r + 0.04)],
    );
    b.addMatrix("rope", new THREE.CylinderGeometry(0.03, 0.03, len, 4), matrix);
  }

  // Door frame (painted wood), threshold, step stones
  const dw = r * 0.34;
  const dh = wallH * 0.8;
  const z = r + 0.06;
  b.add("paintedWood", new THREE.BoxGeometry(0.14, dh + 0.12, 0.16), [-dw / 2 - 0.07, dh / 2 + 0.04, z]);
  b.add("paintedWood", new THREE.BoxGeometry(0.14, dh + 0.12, 0.16), [dw / 2 + 0.07, dh / 2 + 0.04, z]);
  b.add("paintedWood", new THREE.BoxGeometry(dw + 0.3, 0.12, 0.2), [0, 0.06, z + 0.02]);
  b.add("stone", new THREE.DodecahedronGeometry(0.5, 0), [0, 0.02, z + 0.65], [0.2, 0.5, 0], [1.4, 0.22, 0.9]);
  b.add("stone", new THREE.DodecahedronGeometry(0.35, 0), [dw * 0.9, 0.0, z + 1.2], [0.1, 1.5, 0], [1, 0.3, 1]);

  // Chimney pipe through the roof
  b.add("iron", new THREE.CylinderGeometry(0.11, 0.11, 1.5, 8), [r * 0.18, wallH + roofH * 0.75 + 0.45, -r * 0.05]);
  b.add("iron", new THREE.CylinderGeometry(0.2, 0.16, 0.1, 8), [r * 0.18, wallH + roofH * 0.75 + 1.22, -r * 0.05]);

  return b.build();
}

/** Authored ger: felt cover, ornament band, rope ties, painted door, chimney. Door faces south (+z). */
export function Ger({ site, ger, highlighted }: { site: GerSite; ger: GerData; highlighted: boolean }) {
  const r = site.radius;
  const { wallH, roofH } = gerDims(r);
  const y = heightAt(site.x, site.z);
  const kit = worldKit();
  const accent = accentKit(ger.accent);
  const parts = useMemo(() => buildGer(r), [r]);
  const band = useMemo(() => {
    const t = ornamentBand("#f6efe0", ger.accent, Math.round((Math.PI * 2 * r) / 1.3));
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  }, [ger.accent, r]);
  const mats: Record<string, THREE.Material> = {
    felt: kit.felt,
    feltShade: kit.feltShade,
    rope: kit.rope,
    paintedWood: kit.paintedWood,
    stone: kit.stone,
    stoneLight: kit.stoneLight,
    iron: kit.iron,
    accent: accent.accent,
  };

  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: ger.accent, transparent: true, opacity: 0, depthWrite: false }),
    [ger.accent],
  );
  const glow = useRef(0);
  const high = useStore((s) => s.quality) === "high";
  useFrame(({ clock }, dt) => {
    const target = highlighted ? 1 : 0;
    glow.current += (target - glow.current) * (1 - Math.exp(-6 * dt));
    const pulse = useStore.getState().paused ? 0.5 : 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3);
    ringMat.opacity = glow.current * (0.45 + 0.25 * pulse);
    if (ring.current) {
      ring.current.visible = glow.current > 0.01; // no draw call when not near
      ring.current.scale.setScalar(1 + 0.06 * pulse * glow.current);
    }
    (accent.door as THREE.MeshStandardMaterial).emissiveIntensity = glow.current * (0.25 + 0.15 * pulse);
  });

  const dw = r * 0.34;
  const dh = wallH * 0.8;

  return (
    <group position={[site.x, y, site.z]}>
      {[...parts].map(([key, geo]) => (
        <mesh key={key} geometry={geo} material={mats[key]} castShadow receiveShadow />
      ))}
      {/* Ornament band under the eave */}
      <mesh position={[0, wallH * 0.84, 0]} material={band}>
        <cylinderGeometry args={[r + 0.025, r + 0.025, Math.min(0.42, wallH * 0.2), 36, 1, true]} />
      </mesh>
      {/* Painted door and lintel */}
      <mesh position={[0, dh / 2 + 0.06, r + 0.05]} material={accent.door}>
        <boxGeometry args={[dw, dh, 0.08]} />
      </mesh>
      <mesh position={[0, dh + 0.2, r + 0.1]} material={accent.lintel} castShadow>
        <boxGeometry args={[dw + 0.42, 0.24, 0.16]} />
      </mesh>
      {/* Contact shadow and approach ring */}
      {/* Low tier skips the decal; the painted ground already darkens around each ger. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} renderOrder={1} visible={high}>
        <planeGeometry args={[r * 2.7, r * 2.7]} />
        <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, r + 2.6]} material={ringMat} renderOrder={2}>
        <ringGeometry args={[1.25, 1.45, 40]} />
      </mesh>
      <LabelAnchor id={`ger-${ger.id}`} position={[0, wallH + roofH + 1.4, 0]} size={34} maxDist={170} />
    </group>
  );
}
