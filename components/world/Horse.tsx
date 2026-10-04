"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { spanMatrix } from "@/lib/merge";
import { mergeStaticChildren } from "@/lib/mergeChildren";
import { ornamentBand } from "@/lib/ornament";
import { Horseman, type HorsemanHandle } from "./Horseman";

// Procedural Mongolian horse with tack. Faces -z. Withers ≈ 1.6 units.
// Animated by `update(dt, speed, elapsed)` from the Rider: procedural walk / trot / gallop.

export type HorseHandle = {
  update: (dt: number, speed: number, elapsed: number) => void;
  /** World-space hoof contact events this frame (for dust). */
  contacts: THREE.Vector3[];
  /** Strides advanced this frame (for hoofbeat timing). */
  strideDelta: number;
};

const COAT = "#8a5430";
const COAT_DARK = "#5a321b";
const POINTS = "#26170e"; // lower legs, mane, tail
const HOOF = "#1a1512";
const MUZZLE = "#3a2a20";
const TACK_WOOD = "#c4521c";
const TACK_LEATHER = "#3b2416";
const FELT_BLUE = "#1d4f9a";
const SILVER = "#d8d4c8";

type Gait = { offsets: [number, number, number, number]; duty: number; amp: number; stride: number };
// Leg order: LF, RF, LH, RH. Offsets are fractions of a stride.
const WALK: Gait = { offsets: [0.25, 0.75, 0.0, 0.5], duty: 0.62, amp: 0.34, stride: 1.7 };
const TROT: Gait = { offsets: [0.0, 0.5, 0.5, 0.0], duty: 0.45, amp: 0.5, stride: 2.8 };
const GALLOP: Gait = { offsets: [0.55, 0.65, 0.0, 0.12], duty: 0.32, amp: 0.78, stride: 5.6 };

const lerp = THREE.MathUtils.lerp;
const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);

function blendGait(speed: number): Gait {
  const s = Math.abs(speed);
  const a = s < 6 ? WALK : TROT;
  const b = s < 6 ? TROT : GALLOP;
  const t = s < 6 ? smooth(2.5, 6, s) : smooth(9, 13.5, s);
  return {
    offsets: a.offsets.map((o, i) => lerp(o, b.offsets[i], t)) as Gait["offsets"],
    duty: lerp(a.duty, b.duty, t),
    amp: lerp(a.amp, b.amp, t),
    stride: lerp(a.stride, b.stride, t),
  };
}

function useMaterials() {
  return useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.78, flatShading: true, ...extra });
    const trim = ornamentBand("#f2c14e", FELT_BLUE, 3);
    return {
      coat: m(COAT),
      coatDark: m(COAT_DARK),
      points: m(POINTS, { roughness: 0.9 }),
      hoof: m(HOOF, { roughness: 0.6 }),
      muzzle: m(MUZZLE),
      white: m("#f1ece2"),
      eye: new THREE.MeshStandardMaterial({ color: "#0b0705", roughness: 0.2 }),
      wood: m(TACK_WOOD, { roughness: 0.55 }),
      leather: m(TACK_LEATHER, { roughness: 0.7 }),
      felt: m(FELT_BLUE, { roughness: 0.95 }),
      feltTrim: new THREE.MeshStandardMaterial({ map: trim, roughness: 0.9 }),
      silver: new THREE.MeshStandardMaterial({ color: SILVER, metalness: 0.85, roughness: 0.32 }),
    };
  }, []);
}

function Rein({ from, to, mat }: { from: [number, number, number]; to: [number, number, number]; mat: THREE.Material }) {
  const { matrix, len } = useMemo(() => spanMatrix(from, to), [from, to]);
  return (
    <mesh matrix={matrix} matrixAutoUpdate={false} material={mat}>
      <cylinderGeometry args={[0.012, 0.012, len, 4]} />
    </mesh>
  );
}

/** A tapered limb segment hanging down from its joint (origin at the top). */
function Segment({
  len,
  r0,
  r1,
  mat,
  sides = 7,
  shadow = true,
}: {
  len: number;
  r0: number;
  r1: number;
  mat: THREE.Material;
  sides?: number;
  shadow?: boolean;
}) {
  return (
    <mesh position={[0, -len / 2, 0]} material={mat} castShadow={shadow}>
      <cylinderGeometry args={[r0, r1, len, sides]} />
    </mesh>
  );
}

type LegRefs = { root: THREE.Group | null; knee: THREE.Group | null; fetlock: THREE.Group | null; hoof: THREE.Object3D | null };

function Leg({
  hind,
  side,
  refs,
  mats,
}: {
  hind: boolean;
  side: 1 | -1;
  refs: LegRefs;
  mats: ReturnType<typeof useMaterials>;
}) {
  // Front: forearm 0.55, cannon 0.42, pastern 0.16. Hind: gaskin 0.5 (angled), cannon 0.48, pastern 0.16.
  const upper = hind ? 0.52 : 0.55;
  const lower = hind ? 0.46 : 0.42;
  return (
    <group ref={(el) => void (refs.root = el)}>
      {/* muscle mass at the top of the leg */}
      <mesh position={[0, -0.12, hind ? 0.06 : 0]} scale={hind ? [0.75, 1.15, 1.1] : [0.7, 1.1, 0.85]} material={mats.coat}>
        <sphereGeometry args={[0.2, 8, 6]} />
      </mesh>
      <Segment len={upper} r0={hind ? 0.13 : 0.12} r1={0.075} mat={mats.coat} />
      <group position={[0, -upper, 0]} ref={(el) => void (refs.knee = el)}>
        <mesh material={mats.points} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.072, 7, 5]} />
        </mesh>
        <Segment len={lower} r0={0.06} r1={0.05} mat={mats.points} />
        <group position={[0, -lower, 0]} ref={(el) => void (refs.fetlock = el)}>
          <group rotation={[-0.35, 0, 0]}>
            <Segment len={0.16} r0={0.052} r1={0.058} mat={mats.points} shadow={false} />
            <mesh position={[0, -0.2, -0.02]} material={mats.hoof} userData={{ keep: true }} ref={(el) => void (refs.hoof = el)}>
              <cylinderGeometry args={[0.065, 0.085, 0.1, 8]} />
            </mesh>
          </group>
        </group>
      </group>
      {/* feathering / side marker so legs don't read as sticks from behind */}
      <mesh position={[side * 0.005, -upper - lower * 0.85, 0.03]} material={mats.points} scale={[0.9, 1, 1.2]}>
        <sphereGeometry args={[0.07, 6, 4]} />
      </mesh>
    </group>
  );
}

const LEG_SPOTS: { hind: boolean; side: 1 | -1; pos: [number, number, number] }[] = [
  { hind: false, side: -1, pos: [-0.23, 1.18, -0.72] },
  { hind: false, side: 1, pos: [0.23, 1.18, -0.72] },
  { hind: true, side: -1, pos: [-0.24, 1.24, 0.74] },
  { hind: true, side: 1, pos: [0.24, 1.24, 0.74] },
];

export const Horse = forwardRef<HorseHandle>(function Horse(_, ref) {
  const mats = useMaterials();
  const body = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<(THREE.Group | null)[]>([]);
  const mane = useRef<(THREE.Mesh | null)[]>([]);
  const ears = useRef<(THREE.Mesh | null)[]>([]);
  const barrel = useRef<THREE.Mesh>(null);
  const stirrups = useRef<(THREE.Group | null)[]>([]);
  const rider = useRef<HorsemanHandle>(null);
  const root = useRef<THREE.Group>(null);
  // Collapse static parts per joint into one mesh per material (≈100 meshes → far fewer draw calls).
  useLayoutEffect(() => {
    if (root.current) mergeStaticChildren(root.current);
  }, []);
  const legs = useRef<LegRefs[]>(LEG_SPOTS.map(() => ({ root: null, knee: null, fetlock: null, hoof: null })));
  const state = useRef({ phase: 0, prevStance: [true, true, true, true], gaitSpeed: 0 });
  const contacts = useRef<THREE.Vector3[]>([]);

  useImperativeHandle(
    ref,
    () => ({
      contacts: contacts.current,
      strideDelta: 0,
      update(dt, speed, t) {
        const s = state.current;
        contacts.current.length = 0;
        s.gaitSpeed += (Math.abs(speed) - s.gaitSpeed) * (1 - Math.exp(-6 * dt));
        const v = s.gaitSpeed;
        const g = blendGait(v);
        const moving = smooth(0.15, 1.2, v);
        const dPhase = (v / g.stride) * dt;
        this.strideDelta = dPhase;
        s.phase = (s.phase + dPhase * Math.sign(speed || 1)) % 1;
        if (s.phase < 0) s.phase += 1;
        const gallopness = smooth(10, 14, v);
        const trotness = smooth(3, 6, v) * (1 - gallopness);

        legs.current.forEach((leg, i) => {
          if (!leg.root || !leg.knee || !leg.fetlock) return;
          const hind = i >= 2;
          const lp = (s.phase + g.offsets[i]) % 1;
          const stance = lp < g.duty;
          let hip: number;
          let flex: number;
          if (stance) {
            const k = lp / g.duty;
            hip = lerp(g.amp, -g.amp, k);
            flex = 0;
          } else {
            const k = (lp - g.duty) / (1 - g.duty);
            hip = lerp(-g.amp, g.amp, 0.5 - 0.5 * Math.cos(Math.PI * k));
            flex = Math.sin(Math.PI * k);
          }
          hip *= moving;
          flex *= moving;
          // Hind legs reach less forward, push more back.
          leg.root.rotation.x = hind ? hip * 0.85 - 0.2 : hip;
          leg.knee.rotation.x = hind ? flex * (0.9 + 0.6 * gallopness) + 0.3 : -flex * (1.1 + 0.7 * gallopness);
          leg.fetlock.rotation.x = hind ? -flex * 0.8 : flex * 0.9;
          if (stance && !s.prevStance[i] && moving > 0.5 && leg.hoof) {
            contacts.current.push(leg.hoof.getWorldPosition(new THREE.Vector3()));
          }
          s.prevStance[i] = stance;
        });

        const ph = s.phase * Math.PI * 2;
        const bob = (Math.abs(Math.sin(ph * 2)) * 0.06 * trotness + Math.sin(ph) * 0.09 * gallopness) * moving;
        const pitch = Math.sin(ph + 0.6) * 0.07 * gallopness;
        if (body.current) {
          body.current.position.y = bob - 0.02 * gallopness;
          body.current.rotation.x = pitch;
        }
        rider.current?.update(gallopness, trotness, moving, ph, pitch, bob, t);
        // Breathing when still
        if (barrel.current) {
          const b = 1 + Math.sin(t * 1.6) * 0.012 * (1 - moving);
          barrel.current.scale.set(0.95 * b, 1.04 * b, 1);
        }
        if (neck.current) {
          const nod = Math.sin(ph * 2) * 0.06 * (1 - gallopness) * moving + Math.sin(ph - 0.8) * 0.16 * gallopness;
          neck.current.rotation.x = -0.72 - 0.28 * gallopness + nod + Math.sin(t * 0.7) * 0.03 * (1 - moving);
        }
        if (head.current) head.current.rotation.x = -0.22 + 0.12 * gallopness - Math.sin(ph * 2) * 0.05 * moving;
        tail.current.forEach((seg, i) => {
          if (!seg) return;
          const swish = Math.sin(t * 2.3 - i * 0.7) * (0.12 + 0.05 * i) * (1 - moving * 0.6);
          seg.rotation.z = swish + Math.sin(ph * 2 - i) * 0.05 * moving;
          // Root lifts with speed; later segments droop back down so the tail arcs instead of sticking out.
          seg.rotation.x = i === 0 ? -(0.25 + 0.75 * gallopness + 0.25 * trotness) : 0.18 * gallopness + 0.05 + Math.sin(ph * 2 - i * 0.8) * 0.12 * moving;
        });
        mane.current.forEach((m, i) => {
          if (m) m.rotation.z = Math.sin(t * 3 + i * 0.9) * 0.05 + Math.sin(ph * 2 + i * 0.6) * 0.18 * gallopness;
        });
        ears.current.forEach((e, i) => {
          if (!e) return;
          const flick = Math.max(0, Math.sin(t * 0.9 + i * 2.1) - 0.93) * 8;
          e.rotation.x = -0.25 - flick * 0.4 - 0.4 * gallopness;
        });
        stirrups.current.forEach((st) => {
          if (st) st.rotation.x = Math.sin(ph * 2) * 0.25 * moving + Math.sin(t) * 0.03;
        });
      },
    }),
    [],
  );

  return (
    <group ref={root}>
      <group ref={body}>
        {/* ── Body masses ── */}
        <mesh ref={barrel} userData={{ keep: true }} position={[0, 1.36, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.95, 1.04, 1]} material={mats.coat} castShadow>
          <capsuleGeometry args={[0.42, 1.0, 5, 12]} />
        </mesh>
        <mesh position={[0, 1.36, -0.7]} scale={[0.82, 1.06, 0.95]} material={mats.coat} castShadow>
          <sphereGeometry args={[0.46, 12, 9]} />
        </mesh>
        <mesh position={[0, 1.43, 0.66]} scale={[0.92, 0.98, 1.0]} material={mats.coat} castShadow>
          <sphereGeometry args={[0.47, 12, 9]} />
        </mesh>
        {/* belly shading */}
        <mesh position={[0, 1.08, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 0.5, 1]} material={mats.coatDark}>
          <capsuleGeometry args={[0.3, 0.9, 4, 8]} />
        </mesh>

        {/* ── Neck + head ── */}
        <group ref={neck} position={[0, 1.62, -0.9]} rotation={[-0.72, 0, 0]}>
          <mesh position={[0, 0.42, 0]} material={mats.coat} castShadow>
            <cylinderGeometry args={[0.17, 0.3, 0.95, 9]} />
          </mesh>
          {/* crest */}
          <mesh position={[0, 0.42, 0.12]} scale={[0.55, 1, 0.6]} material={mats.coat}>
            <cylinderGeometry args={[0.16, 0.26, 0.9, 7]} />
          </mesh>
          {/* mane: short upright Mongolian mane */}
          {Array.from({ length: 7 }, (_, i) => (
            <mesh
              key={i}
              ref={(el) => void (mane.current[i] = el)}
              userData={{ keep: true }}
              position={[0, 0.06 + i * 0.13, 0.22 - i * 0.012]}
              material={mats.points}
            >
              <boxGeometry args={[0.07, 0.15, 0.13]} />
            </mesh>
          ))}
          <group ref={head} position={[0, 0.9, 0]} rotation={[-0.22, 0, 0]}>
            {/* skull */}
            <mesh position={[0, 0, -0.08]} scale={[0.82, 0.85, 1.25]} material={mats.coat} castShadow>
              <sphereGeometry args={[0.2, 10, 8]} />
            </mesh>
            {/* face to muzzle */}
            <mesh position={[0, -0.02, -0.36]} rotation={[Math.PI / 2, 0, 0]} material={mats.coat} castShadow>
              <cylinderGeometry args={[0.14, 0.12, 0.4, 8]} />
            </mesh>
            <mesh position={[0, -0.03, -0.58]} scale={[1, 0.9, 1.05]} material={mats.muzzle} castShadow>
              <sphereGeometry args={[0.135, 9, 7]} />
            </mesh>
            {/* blaze */}
            <mesh position={[0, 0.142, -0.32]} rotation={[-Math.PI / 2 + 0.05, 0, 0]} material={mats.white}>
              <planeGeometry args={[0.07, 0.34]} />
            </mesh>
            {/* eyes */}
            {[-1, 1].map((x) => (
              <mesh key={x} position={[x * 0.145, 0.05, -0.12]} material={mats.eye}>
                <sphereGeometry args={[0.032, 8, 6]} />
              </mesh>
            ))}
            {/* ears */}
            {[-1, 1].map((x, i) => (
              <mesh
                key={x}
                ref={(el) => void (ears.current[i] = el)}
                userData={{ keep: true }}
                position={[x * 0.09, 0.2, 0.02]}
                rotation={[-0.25, 0, x * -0.2]}
                material={mats.coat}
              >
                <coneGeometry args={[0.05, 0.17, 5]} />
              </mesh>
            ))}
            {/* forelock */}
            <mesh position={[0, 0.17, -0.1]} rotation={[0.6, 0, 0]} material={mats.points}>
              <boxGeometry args={[0.1, 0.06, 0.16]} />
            </mesh>
            {/* bridle: noseband, cheek straps, brow band */}
            <mesh position={[0, -0.02, -0.46]} rotation={[Math.PI / 2, 0, 0]} material={mats.leather}>
              <torusGeometry args={[0.15, 0.018, 5, 14]} />
            </mesh>
            <mesh position={[0, 0.03, -0.12]} rotation={[0.2, 0, 0]} material={mats.leather}>
              <torusGeometry args={[0.175, 0.016, 5, 14]} />
            </mesh>
            {[-1, 1].map((x) => (
              <mesh key={x} position={[x * 0.13, -0.08, -0.52]} material={mats.silver}>
                <torusGeometry args={[0.035, 0.01, 5, 10]} />
              </mesh>
            ))}
          </group>
        </group>

        {/* ── Tail: long, low-set, segmented ── */}
        <group position={[0, 1.62, 1.08]}>
          <group ref={(el) => void (tail.current[0] = el)} rotation={[-0.25, 0, 0]}>
            <mesh position={[0, -0.16, 0]} material={mats.points} castShadow>
              <cylinderGeometry args={[0.09, 0.11, 0.32, 6]} />
            </mesh>
            <group position={[0, -0.3, 0]} ref={(el) => void (tail.current[1] = el)}>
              <mesh position={[0, -0.22, 0]} material={mats.points} castShadow>
                <cylinderGeometry args={[0.11, 0.13, 0.44, 6]} />
              </mesh>
              <group position={[0, -0.42, 0]} ref={(el) => void (tail.current[2] = el)}>
                <mesh position={[0, -0.24, 0]} material={mats.points} castShadow>
                  <cylinderGeometry args={[0.13, 0.06, 0.5, 6]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* ── Tack: felt saddle cloth, painted wooden saddle, stirrups, reins ── */}
        <mesh position={[0, 1.79, 0.02]} rotation={[0, 0, 0]} material={mats.felt} castShadow>
          <boxGeometry args={[1.0, 0.05, 0.92]} />
        </mesh>
        {[-1, 1].map((x) => (
          <mesh key={x} position={[x * 0.49, 1.62, 0.02]} rotation={[0, 0, x * 0.16]} material={mats.feltTrim} castShadow>
            <boxGeometry args={[0.04, 0.36, 0.86]} />
          </mesh>
        ))}
        <mesh position={[0, 1.86, 0.04]} material={mats.wood} castShadow>
          <boxGeometry args={[0.5, 0.1, 0.62]} />
        </mesh>
        {/* high pommel and cantle */}
        <mesh position={[0, 2.02, -0.24]} rotation={[0.25, 0, 0]} material={mats.wood} castShadow>
          <boxGeometry args={[0.42, 0.28, 0.08]} />
        </mesh>
        <mesh position={[0, 2.0, 0.32]} rotation={[-0.3, 0, 0]} material={mats.wood} castShadow>
          <boxGeometry args={[0.46, 0.24, 0.08]} />
        </mesh>
        {/* silver studs on pommel/cantle */}
        {[-0.12, 0, 0.12].flatMap((x) => [
          <mesh key={`p${x}`} position={[x, 2.06, -0.29]} material={mats.silver}>
            <sphereGeometry args={[0.03, 6, 4]} />
          </mesh>,
          <mesh key={`c${x}`} position={[x, 2.04, 0.37]} material={mats.silver}>
            <sphereGeometry args={[0.03, 6, 4]} />
          </mesh>,
        ])}
        {/* seat cushion */}
        <mesh position={[0, 1.94, 0.04]} material={mats.felt}>
          <boxGeometry args={[0.38, 0.06, 0.48]} />
        </mesh>
        {/* girth */}
        <mesh position={[0, 1.36, -0.22]} rotation={[0, 0, Math.PI / 2]} material={mats.leather}>
          <torusGeometry args={[0.47, 0.03, 4, 18, Math.PI]} />
        </mesh>
        {/* stirrups */}
        {[-1, 1].map((x, i) => (
          <group key={x} position={[x * 0.42, 1.86, 0.02]} ref={(el) => void (stirrups.current[i] = el)}>
            <mesh position={[x * 0.02, -0.28, 0]} material={mats.leather}>
              <boxGeometry args={[0.025, 0.56, 0.05]} />
            </mesh>
            <mesh position={[x * 0.03, -0.6, 0]} material={mats.silver}>
              <torusGeometry args={[0.07, 0.016, 5, 12]} />
            </mesh>
          </group>
        ))}
        {/* breast collar */}
        <mesh position={[0, 1.5, -0.95]} rotation={[Math.PI / 2 - 0.25, 0, 0]} material={mats.leather}>
          <torusGeometry args={[0.38, 0.025, 4, 18, Math.PI]} />
        </mesh>

        {/* ── Rider and reins ── */}
        <Horseman ref={rider} />
        {[-1, 1].map((x) => (
          <Rein key={x} from={[x * 0.12, 2.2, -0.5]} to={[x * 0.1, 2.32, -1.32]} mat={mats.leather} />
        ))}

        {/* ── Legs ── */}
        {LEG_SPOTS.map((l, i) => (
          <group key={i} position={l.pos}>
            <Leg hind={l.hind} side={l.side} refs={legs.current[i]} mats={mats} />
          </group>
        ))}
      </group>
    </group>
  );
});
