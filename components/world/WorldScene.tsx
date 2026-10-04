"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { gerById } from "@/content/gers";
import { GER_SITES } from "@/lib/layout";
import { useStore } from "@/lib/store";
import { chimneyTop, Ger } from "./Ger";
import { Grass } from "./Grass";
import { Life } from "./Life";
import { Ovoo } from "./Ovoo";
import { Particles, type ParticlesHandle } from "./Particles";
import { Props } from "./Props";
import { Rider } from "./Rider";
import { HORIZON, SkyDome } from "./SkyDome";
import { Terrain } from "./Terrain";

const CHIMNEYS = GER_SITES.map(chimneyTop);

function ChimneySmoke() {
  const pool = useRef<ParticlesHandle>(null);
  const acc = useRef(0);
  useFrame((_, dt) => {
    if (useStore.getState().paused || !pool.current) return;
    acc.current += dt;
    while (acc.current > 0.22) {
      acc.current -= 0.22;
      for (const [x, y, z] of CHIMNEYS) {
        pool.current.emit(x, y, z, 0.25 + Math.random() * 0.2, 0.9 + Math.random() * 0.3, 0.1 + Math.random() * 0.15);
      }
    }
  });
  return <Particles ref={pool} max={220} color="#efebe4" life={6} size0={0.6} size1={3.2} alpha={0.32} drag={0.35} rise={0.05} />;
}

export function WorldScene() {
  const nearGerId = useStore((s) => s.nearGerId);
  const quality = useStore((s) => s.quality);
  const high = quality === "high";
  return (
    <>
      <fog attach="fog" args={[HORIZON, 80, 400]} />
      {/* Key = sun (in Rider, follows the horse). Fill = sky/ground bounce. Rim = cool back light. */}
      <hemisphereLight args={["#b7d2ff", "#7a6a3a", 1.05]} />
      <directionalLight position={[-40, 25, -50]} intensity={0.55} color="#c9dcff" />
      <SkyDome />
      <Terrain />
      <Grass count={high ? 90000 : 22000} />
      <Ovoo />
      {GER_SITES.map((site) => (
        <Ger key={site.id} site={site} ger={gerById[site.id]} highlighted={nearGerId === site.id} />
      ))}
      <Props />
      <Life />
      <ChimneySmoke />
      <Rider shadows={high} />
    </>
  );
}
