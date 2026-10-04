"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { bindRideKeys } from "@/lib/input";
import { qaEnabled } from "@/lib/qa";
import { riderPose } from "@/lib/rider";
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

/**
 * Renders at most ~60 fps (less while an overlay covers the scene) instead of every display
 * refresh. On 144–240 Hz laptop panels this cuts CPU/GPU work by 2–4×. Steady pacing: a frame
 * renders when at least one target interval (minus half a refresh) has passed.
 */
function FrameCap() {
  const advance = useThree((s) => s.advance);
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let prev = 0;
    let refresh = 16.7; // measured display refresh interval (ms), smoothed
    // QA only: ?qa&fps=N overrides the cap (e.g. fps=1000 to compare against uncapped rendering).
    const q = new URLSearchParams(window.location.search);
    const qaFps = qaEnabled() && q.has("fps") ? Number(q.get("fps")) : 0;
    // Idle (no input for 1.5 s and the horse standing still) drops to 30 fps.
    let lastInput = 0;
    const poke = () => (lastInput = performance.now());
    const events = ["keydown", "pointerdown", "pointermove", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (prev) refresh += (Math.min(50, t - prev) - refresh) * 0.05;
      prev = t;
      const s = useStore.getState();
      const idle = t - lastInput > 1500 && Math.abs(riderPose.speed) < 0.1;
      const fps = qaFps || (s.overlay ? 15 : s.projectSlug || idle ? 30 : 60);
      if (t - last >= 1000 / fps - refresh / 2) {
        if (!last) clock.elapsedTime = t / 1000 - 1 / 60; // no giant first delta
        last = t;
        advance(t / 1000);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      events.forEach((e) => window.removeEventListener(e, poke));
    };
  }, [advance, clock]);
  return null;
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
      frameloop="never"
      onPointerMissed={() => (document.body.style.cursor = "")}
    >
      <FrameCap />
      <PerformanceMonitor onDecline={() => setQuality("low")} flipflops={2} />
      {qa && <QaHooks />}
      {mode === "interior" && gerId ? <InteriorScene key={gerId} gerId={gerId} /> : <WorldScene />}
      <LabelProjector />
      {high && <Post />}
    </Canvas>
  );
}
