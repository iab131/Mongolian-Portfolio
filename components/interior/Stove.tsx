"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { interiorClock } from "./clock";
import { box, cyl, geo, glowTexture, grateTexture, type Kit, merge, type Part, TOONO_Y } from "./kit";

// Cast-iron ger stove: legs, body, top plate with cook rings, fire door with a
// glowing grate, ash drawer, pipe up through the toono, copper kettle on top.

const W = 0.72;
const D = 0.56;
const LEG = 0.16;
const BODY = 0.46;
const TOP = LEG + BODY;
const PIPE_Z = -0.08;

const ironGeo = () =>
  geo("stoveIron", () => {
    const parts: Part[] = [
      { g: box(W, BODY, D), p: [0, LEG + BODY / 2, 0] },
      { g: box(W + 0.08, 0.04, D + 0.08), p: [0, TOP + 0.02, 0] },
      { g: box(W + 0.04, 0.03, D + 0.04), p: [0, LEG + 0.015, 0] },
      // fire door frame and ash drawer on the front (+z)
      { g: box(0.36, 0.26, 0.03), p: [0, LEG + 0.28, D / 2 + 0.015] },
      { g: box(0.42, 0.07, 0.03), p: [0, LEG + 0.06, D / 2 + 0.015] },
      { g: box(0.1, 0.02, 0.04), p: [0.12, LEG + 0.06, D / 2 + 0.04] },
      // hinge pins and latch
      { g: cyl(0.012, 0.012, 0.24, 6), p: [-0.19, LEG + 0.28, D / 2 + 0.03] },
      { g: box(0.06, 0.02, 0.05), p: [0.2, LEG + 0.32, D / 2 + 0.035] },
      // cook-hole rings on the top plate
      { g: new THREE.TorusGeometry(0.11, 0.014, 6, 24), p: [-0.2, TOP + 0.045, 0.12], r: [Math.PI / 2, 0, 0] },
      { g: new THREE.TorusGeometry(0.06, 0.012, 6, 18), p: [-0.2, TOP + 0.045, 0.12], r: [Math.PI / 2, 0, 0] },
      // pipe with collar and two seams, up through the toono
      { g: cyl(0.11, 0.12, 0.08, 16), p: [0, TOP + 0.08, PIPE_Z] },
      { g: cyl(0.075, 0.075, TOONO_Y + 0.9 - TOP, 14), p: [0, (TOONO_Y + 0.9 + TOP) / 2, PIPE_Z] },
      { g: cyl(0.085, 0.085, 0.05, 14), p: [0, 1.6, PIPE_Z] },
      { g: cyl(0.085, 0.085, 0.05, 14), p: [0, 2.9, PIPE_Z] },
    ];
    // splayed legs
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      parts.push({ g: box(0.06, LEG + 0.02, 0.06), p: [x * (W / 2 - 0.05), LEG / 2, z * (D / 2 - 0.05)], r: [z * 0.12, 0, -x * 0.12] });
    }
    return merge(parts);
  });

/** Lathe-turned copper kettle with spout and handle. */
const kettleGeo = () =>
  geo("kettle", () => {
    const prof = [
      [0.0, 0],
      [0, 0],
      [0.13, 0.04],
      [0.135, 0.1],
      [0.115, 0.15],
      [0.06, 0.18],
      [0.05, 0.2],
      [0.03, 0.22],
      [0.0, 0.225],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const spout = cyl(0.014, 0.026, 0.17, 8);
    const handle = new THREE.TorusGeometry(0.09, 0.012, 6, 20, Math.PI);
    return merge([
      { g: new THREE.LatheGeometry(prof, 20) },
      { g: spout, p: [0.15, 0.13, 0], r: [0, 0, -0.9] },
      { g: handle, p: [0, 0.2, 0] },
    ]);
  });

export function Stove({ kit }: { kit: Kit }) {
  const light = useRef<THREE.PointLight>(null);
  const grate = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = interiorClock.t;
    const f = 1 + Math.sin(t * 7.3) * 0.07 + Math.sin(t * 17.1 + 1.3) * 0.05 + Math.sin(t * 2.1) * 0.04;
    if (light.current) light.current.intensity = 5.5 * f;
    if (grate.current) grate.current.emissiveIntensity = 2.4 * f;
    if (glow.current) glow.current.scale.setScalar(0.9 + (f - 1) * 1.5);
  });
  return (
    <group>
      {/* metal hearth plate under the stove */}
      <mesh position={[0, 0.02, 0.05]} receiveShadow material={kit.iron}>
        <boxGeometry args={[1.05, 0.02, 1.0]} />
      </mesh>
      <mesh geometry={ironGeo()} material={kit.iron} castShadow receiveShadow />
      {/* glowing fire grate in the door */}
      <mesh position={[0, LEG + 0.28, D / 2 + 0.032]}>
        <planeGeometry args={[0.28, 0.19]} />
        <meshStandardMaterial ref={grate} color="#000000" emissive="#ffffff" emissiveMap={grateTexture()} emissiveIntensity={2.4} />
      </mesh>
      {/* soft light card spilling from the fire door */}
      <mesh ref={glow} position={[0, LEG + 0.26, D / 2 + 0.09]}>
        <planeGeometry args={[0.9, 0.7]} />
        <meshBasicMaterial map={glowTexture()} color="#ff8a3a" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh geometry={kettleGeo()} material={kit.copper} position={[-0.2, TOP + 0.04, 0.12]} rotation={[0, 0.6, 0]} castShadow />
      <pointLight ref={light} position={[0, 0.45, 0.75]} color="#ff9b52" intensity={5.5} distance={9} decay={1.6} />
    </group>
  );
}
