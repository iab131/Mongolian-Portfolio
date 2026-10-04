"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { ornamentBand } from "@/lib/ornament";

// The rider: a horseman in a maroon deel with a gold-trimmed collar, orange sash, boots and a
// pointed hat with a red tassel. Sits in the horse's body frame (faces -z) on the saddle seat.

export type HorsemanHandle = {
  /** gallop/trot in 0..1, stride phase in radians, horse body pitch/bob to counter. */
  update: (gallop: number, trot: number, moving: number, ph: number, bodyPitch: number, bodyBob: number, t: number) => void;
};

const DEEL = "#8a2430";
const DEEL_DARK = "#6a1a24";
const GOLD = "#e0b23a";
const SASH = "#e07a1f";
const SKIN = "#c98d64";
const BOOT = "#1d1714";
const HAT = "#22324f";
const TASSEL = "#c8282b";

function useMats() {
  return useMemo(() => {
    const m = (color: string, p: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...p });
    return {
      deel: m(DEEL, { roughness: 0.65 }),
      deelDark: m(DEEL_DARK, { roughness: 0.7 }),
      trim: new THREE.MeshStandardMaterial({ map: ornamentBand("#f2c14e", DEEL_DARK, 2), roughness: 0.6 }),
      gold: m(GOLD, { metalness: 0.6, roughness: 0.35 }),
      sash: m(SASH, { roughness: 0.6 }),
      skin: m(SKIN, { roughness: 0.7 }),
      boot: m(BOOT, { roughness: 0.5 }),
      hat: m(HAT, { roughness: 0.8 }),
      tassel: m(TASSEL, { roughness: 0.7 }),
    };
  }, []);
}

/** Limb segment hanging down (-y) from its joint. */
function Seg({ len, r0, r1, mat, shadow = true }: { len: number; r0: number; r1: number; mat: THREE.Material; shadow?: boolean }) {
  return (
    <mesh position={[0, -len / 2, 0]} material={mat} castShadow={shadow}>
      <cylinderGeometry args={[r0, r1, len, 7]} />
    </mesh>
  );
}

export const Horseman = forwardRef<HorsemanHandle>(function Horseman(_, ref) {
  const m = useMats();
  const pelvis = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const headG = useRef<THREE.Group>(null);
  const arms = useRef<{ upper: THREE.Group | null; fore: THREE.Group | null }[]>([
    { upper: null, fore: null },
    { upper: null, fore: null },
  ]);
  const tassel = useRef<THREE.Mesh>(null);

  useImperativeHandle(
    ref,
    () => ({
      update(gallop, trot, moving, ph, bodyPitch, bodyBob, t) {
        if (pelvis.current) {
          // Gallop: stand in the stirrups and absorb the horse's bob. Trot: post with the stride.
          const post = Math.max(0, Math.sin(ph * 2)) * 0.07 * trot;
          pelvis.current.position.y = 2.0 + 0.11 * gallop + post - bodyBob * 0.75 * gallop;
          pelvis.current.rotation.x = -bodyPitch * 0.6 * gallop;
        }
        if (torso.current) {
          torso.current.rotation.x = -0.08 * moving - 0.18 * trot - 0.5 * gallop + Math.sin(ph * 2) * 0.03 * moving;
          torso.current.rotation.z = Math.sin(ph) * 0.04 * (1 - gallop) * moving + Math.sin(t * 0.8) * 0.01;
        }
        if (headG.current && torso.current) headG.current.rotation.x = -torso.current.rotation.x * 0.75;
        arms.current.forEach((a) => {
          if (a.upper) a.upper.rotation.x = 0.55 + 0.45 * gallop + Math.sin(ph * 2) * 0.05 * moving;
          if (a.fore) a.fore.rotation.x = 0.95 - 0.35 * gallop;
        });
        if (tassel.current) tassel.current.rotation.x = 0.4 * moving + 0.6 * gallop + Math.sin(t * 6) * 0.08 * moving;
      },
    }),
    [],
  );

  return (
    <group ref={pelvis} position={[0, 2.0, 0.06]}>
      {/* seat and deel skirt draping over both thighs */}
      <mesh position={[0, 0.05, 0.02]} material={m.deel} castShadow>
        <boxGeometry args={[0.34, 0.14, 0.3]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25, -0.1, -0.05]} rotation={[0.35, 0, s * 0.22]} material={m.deel}>
          <boxGeometry args={[0.05, 0.42, 0.5]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`t${s}`} position={[s * 0.275, -0.29, -0.11]} rotation={[0.35, 0, s * 0.22]} material={m.trim}>
          <boxGeometry args={[0.055, 0.06, 0.5]} />
        </mesh>
      ))}
      {/* legs: thigh forward and out, shin back down to the stirrup, upturned boot */}
      {[-1, 1].map((s) => (
        <group key={`l${s}`} position={[s * 0.15, 0.04, 0]} rotation={[1.0, 0, s * 0.42]}>
          <Seg len={0.42} r0={0.085} r1={0.07} mat={m.deelDark} />
          <group position={[0, -0.42, 0]} rotation={[-1.45, 0, -s * 0.15]}>
            <Seg len={0.42} r0={0.065} r1={0.06} mat={m.boot} shadow={false} />
            <mesh position={[0, -0.44, -0.07]} rotation={[-0.2, 0, 0]} material={m.boot}>
              <boxGeometry args={[0.1, 0.08, 0.24]} />
            </mesh>
            <mesh position={[0, -0.42, -0.2]} rotation={[0.7, 0, 0]} material={m.boot}>
              <coneGeometry args={[0.035, 0.1, 4]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* torso */}
      <group ref={torso} position={[0, 0.1, 0]}>
        <mesh position={[0, 0.27, 0]} material={m.deel} castShadow>
          <cylinderGeometry args={[0.165, 0.19, 0.5, 9]} />
        </mesh>
        <mesh position={[0, 0.05, 0]} material={m.sash}>
          <cylinderGeometry args={[0.2, 0.2, 0.09, 9]} />
        </mesh>
        <mesh position={[0.12, 0.03, -0.12]} rotation={[0.2, 0, 0.3]} material={m.sash}>
          <boxGeometry args={[0.05, 0.22, 0.04]} />
        </mesh>
        {/* diagonal gold-trimmed overlap of the deel and collar */}
        <mesh position={[0.06, 0.36, -0.165]} rotation={[0.08, 0, -0.75]} material={m.gold}>
          <boxGeometry args={[0.035, 0.32, 0.02]} />
        </mesh>
        <mesh position={[0, 0.53, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
          <torusGeometry args={[0.1, 0.025, 5, 12]} />
        </mesh>
        {/* shoulders */}
        <mesh position={[0, 0.47, 0]} scale={[1.45, 0.55, 0.9]} material={m.deel} castShadow>
          <sphereGeometry args={[0.17, 9, 6]} />
        </mesh>
        {/* arms reaching forward to the reins */}
        {[-1, 1].map((s, i) => (
          <group
            key={`a${s}`}
            position={[s * 0.22, 0.47, 0]}
            rotation={[0.55, 0, s * 0.12]}
            ref={(el) => void (arms.current[i].upper = el)}
          >
            <Seg len={0.3} r0={0.06} r1={0.055} mat={m.deel} />
            <group position={[0, -0.3, 0]} rotation={[0.95, 0, 0]} ref={(el) => void (arms.current[i].fore = el)}>
              <Seg len={0.28} r0={0.055} r1={0.05} mat={m.deel} shadow={false} />
              <mesh position={[0, -0.27, 0]} material={m.gold}>
                <cylinderGeometry args={[0.056, 0.056, 0.04, 7]} />
              </mesh>
              <mesh position={[0, -0.33, 0]} material={m.skin}>
                <sphereGeometry args={[0.05, 7, 5]} />
              </mesh>
            </group>
          </group>
        ))}
        {/* head and hat */}
        <group ref={headG} position={[0, 0.56, 0]}>
          <mesh position={[0, 0.05, 0]} material={m.skin}>
            <cylinderGeometry args={[0.05, 0.06, 0.1, 6]} />
          </mesh>
          <mesh position={[0, 0.18, 0]} scale={[0.9, 1.05, 0.95]} material={m.skin} castShadow>
            <sphereGeometry args={[0.11, 10, 8]} />
          </mesh>
          <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
            <torusGeometry args={[0.125, 0.025, 5, 14]} />
          </mesh>
          <mesh position={[0, 0.29, 0]} material={m.hat}>
            <cylinderGeometry args={[0.11, 0.125, 0.09, 10]} />
          </mesh>
          <mesh position={[0, 0.4, 0]} material={m.hat} castShadow>
            <coneGeometry args={[0.11, 0.16, 10]} />
          </mesh>
          <mesh ref={tassel} userData={{ keep: true }} position={[0, 0.49, 0]} material={m.tassel}>
            <coneGeometry args={[0.035, 0.12, 6]} />
          </mesh>
        </group>
      </group>
    </group>
  );
});
