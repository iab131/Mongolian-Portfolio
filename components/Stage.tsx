"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { bindRideKeys } from "@/lib/input";
import { qaEnabled } from "@/lib/qa";
import { useStore } from "@/lib/store";
import { InteriorScene } from "./interior/InteriorScene";
import { LabelProjector } from "./LabelAnchor";
import { QaHooks } from "./QaHooks";
import { WorldScene } from "./world/WorldScene";

/** Start phones and low-memory devices on the low tier; PerformanceMonitor can drop desktop later. */
function initialQuality() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return coarse || mem <= 4 ? "low" : "high";
}

/** Bloom on authored emissive only (hearth, door glow), soft vignette, ACES in post. */
function Post() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.45} radius={0.6} />
      <Vignette offset={0.28} darkness={0.42} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

/** The WebGL canvas. Client-only, loaded with next/dynamic. */
export default function Stage() {
  const mode = useStore((s) => s.mode);
  const gerId = useStore((s) => s.gerId);
  const quality = useStore((s) => s.quality);
  const setQuality = useStore((s) => s.setQuality);
  const [qa] = useState(qaEnabled);

  useEffect(bindRideKeys, []);
  useEffect(() => setQuality(initialQuality()), [setQuality]);

  const high = quality === "high";

  return (
    <Canvas
      shadows={high ? { type: THREE.PCFSoftShadowMap } : false}
      dpr={high ? [1, 2] : [1, 1.5]}
      camera={{ fov: 55, near: 0.1, far: 900, position: [0, 6, 60] }}
      gl={{ antialias: !high, powerPreference: "high-performance", toneMappingExposure: 1.05 }}
      onPointerMissed={() => (document.body.style.cursor = "")}
    >
      <PerformanceMonitor onDecline={() => setQuality("low")} flipflops={2} />
      {qa && <QaHooks />}
      {mode === "interior" && gerId ? <InteriorScene key={gerId} gerId={gerId} /> : <WorldScene />}
      <LabelProjector />
      {high && <Post />}
    </Canvas>
  );
}
