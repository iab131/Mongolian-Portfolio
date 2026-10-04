"use client";

import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { gerById } from "@/content/gers";
import { projectsInGer } from "@/content/projects";
import type { GerId } from "@/content/types";
import { useInteriorClock } from "./clock";
import { Daylight } from "./Daylight";
import { Furnishings } from "./Furnishings";
import { Hanging } from "./Hanging";
import { getKit, type V3 } from "./kit";
import { Stove } from "./Stove";
import { Structure } from "./Structure";

export { R } from "./kit";

// Wall slots for non-featured projects, degrees clockwise from north (the altar; door at 180).
// Filled in this order. The camera stands just inside the door on the east (+x) side,
// so the east slot nearest the door is used last.
const SLOTS = [50, -50, 95, -95, -138, 138];
const TAPESTRIES = [24, -24, 72, -72, 116, -116, 160, -160];

/** Beds + wall rugs for empty slots, tapestries between slots. Cached so the arrays are stable. */
const layouts = new Map<number, { beds: number[]; tapestries: { deg: number; scale: number }[] }>();
function wallLayout(used: number) {
  let l = layouts.get(used);
  if (!l) {
    const beds = SLOTS.slice(used, 5);
    l = { beds, tapestries: [...TAPESTRIES.map((deg) => ({ deg, scale: 1 })), ...beds.map((deg) => ({ deg, scale: 1.3 }))] };
    layouts.set(used, l);
  }
  return l;
}

type Pose = { pos: V3; look: V3; fov: number };
// Off-axis from the door so the altar is seen between the east pillar and the stove pipe.
const WIDE: Pose = { pos: [2.65, 1.62, 4.05], look: [-1.05, 1.05, -5.1], fov: 50 };
const NARROW: Pose = { pos: [2.35, 1.6, 3.05], look: [-0.15, 0.1, -5.1], fov: 66 };

function InteriorCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const narrow = useThree((s) => s.size.width / s.size.height < 0.85);
  const pose = narrow ? NARROW : WIDE;
  const target = useMemo(() => {
    const p = new THREE.Vector3(...pose.pos);
    return p.clone().add(new THREE.Vector3(...pose.look).sub(p).normalize().multiplyScalar(0.6)).toArray() as V3;
  }, [pose]);

  useLayoutEffect(() => {
    const prevFov = camera.fov;
    camera.fov = pose.fov;
    camera.position.set(...pose.pos);
    camera.lookAt(...pose.look);
    camera.updateProjectionMatrix();
    return () => {
      camera.fov = prevFov;
      camera.updateProjectionMatrix();
    };
  }, [camera, pose]);

  // Look-around in place: orbit a point 0.6 m ahead, so the camera never leaves the door area.
  return (
    <OrbitControls
      key={narrow ? "n" : "w"}
      makeDefault
      target={target}
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.6}
      maxDistance={0.6}
      minPolarAngle={0.8}
      maxPolarAngle={1.95}
      rotateSpeed={-0.32}
    />
  );
}

export function InteriorScene({ gerId }: { gerId: GerId }) {
  const ger = gerById[gerId];
  const kit = getKit(ger.accent);
  const items = projectsInGer(gerId);
  const narrow = useThree((s) => s.size.width / s.size.height < 0.85);
  useInteriorClock();

  const featured = items.find((p) => p.featured);
  const others = items.filter((p) => p !== featured);
  // Empty wall slots (except the one beside the camera) get a bed with a wide wall rug.
  const { beds, tapestries } = wallLayout(others.length);

  return (
    <>
      <color attach="background" args={["#1a120c"]} />

      {/* Fill: warm bounce from the felt, cool sky from the crown, and a soft custom IBL for metals. */}
      <ambientLight intensity={0.22} color="#fff1dd" />
      <hemisphereLight args={["#e4ebf7", "#7a5236", 1.0]} />
      <Environment resolution={32} environmentIntensity={0.45}>
        <mesh scale={30}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshBasicMaterial color="#5a3f2c" side={THREE.BackSide} />
        </mesh>
        <Lightformer form="circle" intensity={4} color="#e8f0ff" position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={5} />
        <Lightformer form="rect" intensity={1.6} color="#ffb070" position={[0, 0.6, 4]} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#f3e6cf" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
      </Environment>

      <Daylight narrow={narrow} />
      <Structure kit={kit} />
      <Stove kit={kit} />
      <Furnishings kit={kit} tapestries={tapestries} beds={beds} />

      {featured && <Hanging project={featured} angleDeg={0} featured />}
      {others.map((p, i) => (
        <Hanging key={p.slug} project={p} angleDeg={SLOTS[i % SLOTS.length]} index={i} />
      ))}

      <InteriorCamera />
    </>
  );
}
