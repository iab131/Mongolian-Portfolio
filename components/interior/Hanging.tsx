"use client";

import { useTexture } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { gerById } from "@/content/gers";
import type { Project } from "@/content/types";
import { useStore } from "@/lib/store";
import { LabelAnchor } from "../LabelAnchor";
import { interiorClock } from "./clock";
import { band, box, cyl, frameBand, geo, getKit, glowTexture, type Kit, merge, onCircle, PAL, type Part, placeholderMaterial, R, darkAccent } from "./kit";

// A project in the ger: a framed picture (ornament-band frame on a dark backing,
// hung by cords) over a painted chest, or — for the featured project — standing
// on the tall altar cabinet (khoimor) opposite the door, flanked by butter lamps.

type Size = { w: number; h: number };

function fit(aspect: number, maxW: number, maxH: number): Size {
  return aspect > maxW / maxH ? { w: maxW, h: maxW / aspect } : { w: maxH * aspect, h: maxH };
}

const q = (n: number) => Math.round(n * 100) / 100;

// ---------- chest (regular items) ----------

const CW = 1.15;
const CD = 0.5;
const CZ = 0.06; // back of chest, off the wall
const chestBodyGeo = () =>
  geo("chestBody", () => {
    const parts: Part[] = [
      { g: box(CW, 0.46, CD), p: [0, 0.06 + 0.23, CZ + CD / 2] },
      { g: box(CW + 0.05, 0.08, CD + 0.05), p: [0, 0.56, CZ + CD / 2] },
      { g: box(CW + 0.03, 0.03, CD + 0.03), p: [0, 0.075, CZ + CD / 2] },
    ];
    for (const x of [-1, 1]) for (const z of [0, 1]) parts.push({ g: box(0.08, 0.06, 0.08), p: [x * (CW / 2 - 0.06), 0.03, CZ + 0.05 + z * (CD - 0.1)] });
    return merge(parts);
  });
const chestFrontGeo = () =>
  geo("chestFront", () =>
    merge([-0.27, 0.27].map((x) => ({ g: new THREE.PlaneGeometry(0.44, 0.36), p: [x, 0.3, CZ + CD + 0.003] as [number, number, number] }))),
  );
const chestTrimGeo = () =>
  geo("chestTrim", () => {
    const z = CZ + CD + 0.008;
    return merge([
      { g: box(0.035, 0.46, 0.016), p: [-(CW / 2 - 0.0175), 0.29, z] },
      { g: box(0.035, 0.46, 0.016), p: [CW / 2 - 0.0175, 0.29, z] },
      { g: box(0.025, 0.4, 0.016), p: [0, 0.3, z] },
      { g: box(CW + 0.06, 0.022, 0.016), p: [0, 0.52, z + 0.02] },
      { g: box(0.09, 0.11, 0.02), p: [0, 0.49, z + 0.025] },
      { g: new THREE.TorusGeometry(0.03, 0.007, 6, 14), p: [0, 0.44, z + 0.04] },
    ]);
  });

function Chest({ kit }: { kit: Kit }) {
  return (
    <group>
      <mesh geometry={chestBodyGeo()} material={kit.paint} castShadow receiveShadow />
      <mesh geometry={chestFrontGeo()} material={kit.medallion} />
      <mesh geometry={chestTrimGeo()} material={kit.gold} />
    </group>
  );
}

// ---------- altar cabinet (featured) ----------

const AW = 2.4;
const AD = 0.55;
const AZ = 0.16;
const AH = 0.9;
const altarBodyGeo = () =>
  geo("altarBody", () =>
    merge([
      { g: box(AW + 0.06, 0.1, AD + 0.04), p: [0, 0.05, AZ + AD / 2] },
      { g: box(AW, 0.7, AD), p: [0, 0.1 + 0.35, AZ + AD / 2] },
      { g: box(AW + 0.12, 0.1, AD + 0.1), p: [0, AH - 0.05, AZ + AD / 2] },
    ]),
  );
const altarFrontGeo = () =>
  geo("altarFront", () =>
    merge([-0.78, 0, 0.78].map((x) => ({ g: new THREE.PlaneGeometry(0.62, 0.58), p: [x, 0.47, AZ + AD + 0.003] as [number, number, number] }))),
  );
const LAMP_X = 1.06;
const altarTrimGeo = () =>
  geo("altarTrim", () => {
    const z = AZ + AD + 0.008;
    const cup = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.07, 0],
        [0.03, 0.03],
        [0.025, 0.1],
        [0.075, 0.13],
        [0.09, 0.18],
        [0.0, 0.17],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      14,
    );
    const parts: Part[] = [
      { g: box(AW + 0.14, 0.025, 0.016), p: [0, AH - 0.035, z + 0.05] },
      { g: box(AW + 0.08, 0.025, 0.016), p: [0, 0.09, z + 0.02] },
      ...[-1.17, -0.39, 0.39, 1.17].map((x) => ({ g: box(0.04, 0.66, 0.016), p: [x, 0.47, z] as [number, number, number] })),
      ...[-0.78, 0, 0.78].map((x) => ({ g: new THREE.TorusGeometry(0.025, 0.006, 6, 12), p: [x + 0.2, 0.47, z + 0.02] as [number, number, number] })),
      { g: cup, p: [-LAMP_X, AH, AZ + 0.42] },
      { g: cup.clone(), p: [LAMP_X, AH, AZ + 0.42] },
    ];
    return merge(parts);
  });
const flameGeo = () =>
  geo("flames", () =>
    merge([-LAMP_X, LAMP_X].map((x) => ({ g: new THREE.ConeGeometry(0.022, 0.08, 8), p: [x, AH + 0.21, AZ + 0.42] as [number, number, number] }))),
  );
const lampGlowGeo = () =>
  geo("lampGlow", () =>
    merge([-LAMP_X, LAMP_X].map((x) => ({ g: new THREE.PlaneGeometry(0.5, 0.5), p: [x, AH + 0.21, AZ + 0.47] as [number, number, number] }))),
  );
/** Carved crest that crowns the featured frame. */
const crestGeo = (w: number) =>
  geo(`crest:${q(w)}`, () => {
    const s = new THREE.Shape();
    const hw = w / 2;
    s.moveTo(-hw, 0);
    s.lineTo(-hw, 0.04);
    s.bezierCurveTo(-hw * 0.7, 0.05, -hw * 0.55, 0.2, -hw * 0.25, 0.17);
    s.bezierCurveTo(-0.12, 0.17, -0.08, 0.26, 0, 0.3);
    s.bezierCurveTo(0.08, 0.26, 0.12, 0.17, hw * 0.25, 0.17);
    s.bezierCurveTo(hw * 0.55, 0.2, hw * 0.7, 0.05, hw, 0.04);
    s.lineTo(hw, 0);
    s.lineTo(-hw, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1, curveSegments: 10 });
  });

function Altar({ kit }: { kit: Kit }) {
  const flames = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = interiorClock.t;
    if (flames.current) flames.current.scale.y = 1 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23 + 2) * 0.05;
  });
  return (
    <group>
      <mesh geometry={altarBodyGeo()} material={kit.paint} castShadow receiveShadow />
      <mesh geometry={altarFrontGeo()} material={kit.medallion} />
      <mesh geometry={altarTrimGeo()} material={kit.gold} />
      {/* butter lamps: flames scale about the lamp height, so offset the group */}
      <group position={[0, AH + 0.17, 0]}>
        <mesh ref={flames} geometry={flameGeo()} position={[0, -(AH + 0.17), 0]}>
          <meshStandardMaterial color="#000000" emissive="#ffc46a" emissiveIntensity={2.2} />
        </mesh>
      </group>
      <mesh geometry={lampGlowGeo()} raycast={() => null}>
        <meshBasicMaterial map={glowTexture()} color="#ffb060" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ---------- framed picture ----------

const cordsGeo = (w: number, h: number) =>
  geo(`cords:${q(w)}:${q(h)}`, () => {
    const top = h / 2;
    const parts: Part[] = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(s * w * 0.35, top - 0.04, -0.01);
      const b = new THREE.Vector3(0, top + 0.32, -0.03);
      const d = b.clone().sub(a);
      const g = cyl(0.006, 0.006, d.length(), 5);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      const c = a.clone().add(b).multiplyScalar(0.5);
      parts.push({ g, p: [c.x, c.y, c.z] });
    }
    parts.push({ g: cyl(0.02, 0.02, 0.04, 8), p: [0, top + 0.32, -0.03], r: [Math.PI / 2, 0, 0] });
    return merge(parts);
  });

function Frame({
  size,
  b,
  kit,
  bandMat,
  halo,
  hung,
  crest,
  children,
}: {
  size: Size;
  b: number;
  kit: Kit;
  bandMat: React.RefObject<THREE.MeshStandardMaterial | null>;
  halo: React.RefObject<THREE.MeshBasicMaterial | null>;
  hung: boolean;
  /** Featured: stands on its bottom edge and gets a carved crest. */
  crest: boolean;
  children: React.ReactNode;
}) {
  const { w, h } = size;
  const bandTex = useMemo(() => band(PAL.gold, darkAccent(kit.accent), 1), [kit.accent]);
  const outer = geo(`fb:${q(w)}:${q(h)}:${b}`, () => frameBand(w, h, b));
  const lip = geo(`fl:${q(w)}:${q(h)}`, () => frameBand(w, h, 0.018));
  const W = w + 2 * b;
  const H = h + 2 * b;
  return (
    <group position={[0, crest ? H / 2 : 0, 0]}>
      {crest && <mesh geometry={crestGeo(Math.min(1.3, W * 0.6))} position={[0, H / 2 + 0.005, -0.02]} scale={[1, 0.72, 1]} material={kit.paint} />}
      {/* soft light card on the wall behind the frame (hover/selection) */}
      <mesh position={[0, 0, -0.03]} raycast={() => null}>
        <planeGeometry args={[W * 1.7, H * 1.9]} />
        <meshBasicMaterial ref={halo} map={glowTexture()} color="#ffd9a0" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {hung && <mesh geometry={cordsGeo(W, H)} material={kit.woodDark} />}
      <mesh position={[0, 0, -0.005]} material={kit.woodDark} castShadow>
        <boxGeometry args={[W + 0.04, H + 0.04, 0.035]} />
      </mesh>
      <mesh geometry={outer} position={[0, 0, 0.014]}>
        <meshStandardMaterial ref={bandMat} map={bandTex} emissive="#ffd59a" emissiveMap={bandTex} emissiveIntensity={0} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh geometry={lip} position={[0, 0, 0.016]} material={kit.gold} />
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[w, h]} />
        {children}
      </mesh>
    </group>
  );
}

type FrameProps = Omit<React.ComponentProps<typeof Frame>, "size" | "children"> & { maxW: number; maxH: number };

function Picture({ src, maxW, maxH, ...rest }: FrameProps & { src: string }) {
  const tex = useTexture(src, (t) => {
    const x = Array.isArray(t) ? t[0] : t;
    x.colorSpace = THREE.SRGBColorSpace;
    x.anisotropy = 8;
  });
  const im = tex.image as { width: number; height: number };
  return (
    <Frame size={fit(im.width / im.height, maxW, maxH)} {...rest}>
      <meshBasicMaterial map={tex} toneMapped={false} />
    </Frame>
  );
}

/** Authored placeholder for projects without an image: accent felt with a medallion. */
function Placeholder({ maxW, maxH, variant, ...rest }: FrameProps & { variant: number }) {
  return (
    <Frame size={fit(1, maxW, maxH)} {...rest}>
      <primitive object={placeholderMaterial(rest.kit.accent, variant)} attach="material" />
    </Frame>
  );
}

// ---------- the item ----------

export function Hanging({
  project,
  angleDeg,
  featured = false,
  index = 0,
}: {
  project: Project;
  angleDeg: number;
  featured?: boolean;
  /** Position among the ger's items; picks the placeholder emblem. */
  index?: number;
}) {
  const openProject = useStore((s) => s.openProject);
  const hover = useStore((s) => s.hoverSlug === project.slug);
  const selected = useStore((s) => s.projectSlug === project.slug);
  const kit = getKit(gerById[project.ger].accent);

  const maxW = featured ? 2.2 : 1.38;
  const maxH = featured ? 1.05 : 0.92;
  const b = featured ? 0.1 : 0.08;
  const frameY = featured ? AH + 0.02 : 1.56;
  const frameZ = featured ? AZ + 0.2 : 0.07;

  const lift = useRef<THREE.Group>(null);
  const bandMat = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const k = useRef(0);
  const active = hover || selected;
  useFrame((_, dt) => {
    k.current += ((active ? 1 : 0) - k.current) * (1 - Math.exp(-dt * 10));
    const v = k.current;
    if (lift.current) {
      lift.current.position.set(0, frameY + 0.03 * v, frameZ + 0.07 * v);
      lift.current.scale.setScalar(1 + 0.03 * v);
    }
    if (bandMat.current) bandMat.current.emissiveIntensity = 0.06 + 0.75 * v;
    if (halo.current) halo.current.opacity = 0.42 * v;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useStore.getState().setHoverSlug(project.slug);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    if (useStore.getState().hoverSlug === project.slug) useStore.getState().setHoverSlug(null);
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "";
    openProject(project.slug);
  };

  const a = THREE.MathUtils.degToRad(angleDeg);
  const variant = featured ? 3 : index;
  const frame: FrameProps = { maxW, maxH, b, kit, bandMat, halo, hung: !featured, crest: featured };

  return (
    <group position={onCircle(a, R - 0.07)} rotation={[0, -a, 0]}>
      <group onPointerOver={over} onPointerOut={out} onClick={click}>
        {featured ? <Altar kit={kit} /> : <Chest kit={kit} />}
        <group ref={lift} position={[0, frameY, frameZ]} rotation={[featured ? -0.04 : 0, 0, 0]}>
          {project.image ? (
            <Suspense fallback={<Placeholder {...frame} variant={variant} />}>
              <Picture src={project.image} {...frame} />
            </Suspense>
          ) : (
            <Placeholder {...frame} variant={variant} />
          )}
        </group>
      </group>
      <LabelAnchor
        id={`hang-${project.slug}`}
        position={featured ? [0, 0.62, AZ + AD + 0.08] : [0, 0.66, CZ + CD + 0.08]}
        size={5}
      />
    </group>
  );
}
