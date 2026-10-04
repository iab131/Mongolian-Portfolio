"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { riderPose } from "@/lib/rider";
import { useStore } from "@/lib/store";

/** Publishes renderer diagnostics for the canvas inspector (see lib/qa.ts). */
export function QaHooks() {
  const gl = useThree((s) => s.gl);
  const advance = useThree((s) => s.advance);
  const camera = useThree((s) => s.camera);

  // Count the whole frame (shadow + scene + post passes), not just the last render call.
  useEffect(() => {
    gl.info.autoReset = false;
    return () => void (gl.info.autoReset = true);
  }, [gl]);
  useFrame(() => gl.info.reset(), -1000);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__THREE_GAME_DIAGNOSTICS__ = {
      get renderer() {
        const { render, memory, programs } = gl.info;
        return {
          calls: render.calls,
          triangles: render.triangles,
          points: render.points,
          lines: render.lines,
          geometries: memory.geometries,
          textures: memory.textures,
          programs: programs?.length ?? null,
          pixelRatio: gl.getPixelRatio(),
          shadowMap: gl.shadowMap.enabled,
        };
      },
      get state() {
        const s = useStore.getState();
        return { mode: s.mode, gerId: s.gerId, nearGerId: s.nearGerId, projectSlug: s.projectSlug, overlay: s.overlay, quality: s.quality };
      },
    };
    // Manual frame stepping for hidden browser panes.
    w.__steppe = { advance, camera, store: useStore, riderPose };
    return () => {
      delete w.__THREE_GAME_DIAGNOSTICS__;
      delete w.__steppe;
    };
  }, [gl, advance, camera]);

  return null;
}
