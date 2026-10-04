import { gerSiteById } from "./layout";
import { useStore } from "./store";

// Test hooks for the threejs-qa-release canvas inspector (window.__THREE_GAME_TEST_HOOKS__).
// Enabled in development, or in any build with `?qa` in the URL.

export function qaEnabled() {
  return process.env.NODE_ENV === "development" || new URLSearchParams(window.location.search).has("qa");
}

const nextFrames = (n: number) =>
  new Promise<void>((resolve) => {
    const tick = () => (--n <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });

/** Resolves once the canvas has mounted and published diagnostics. */
async function canvasReady(timeoutMs = 8000) {
  const start = performance.now();
  while (!(window as unknown as Record<string, unknown>).__THREE_GAME_DIAGNOSTICS__) {
    if (performance.now() - start > timeoutMs) throw new Error("canvas never became ready");
    await nextFrames(1);
  }
}

const st = () => useStore.getState();

const STATES: Record<string, () => void> = {
  // Mid-gallop through camp, looking north at the About ger with the others either side.
  ride: () => st().teleport({ x: -6, z: 26, yaw: -0.12, speed: 17 }),
  // Close to a ger, enter prompt showing.
  "ger-door": () => {
    const s = gerSiteById.vision;
    st().teleport({ x: s.x + 3, z: s.z + s.radius + 4, yaw: 0.35 });
  },
  interior: () => {
    st().teleport({ x: 0, z: 50, yaw: 0 });
    st().enterGer("vision");
  },
  "project-panel": () => {
    st().enterGer("vision");
    st().openProject("steria");
  },
  "project-list": () => {
    st().teleport({ x: 0, z: 50, yaw: 0 });
    st().setOverlay("list");
  },
};

export function installQaHooks() {
  const w = window as unknown as Record<string, unknown>;
  w.__THREE_GAME_TEST_HOOKS__ = {
    async setState(name: string) {
      const apply = STATES[name];
      if (!apply) throw new Error(`Unknown state: ${name}`);
      await canvasReady();
      st().setPaused(false);
      apply();
      await nextFrames(name === "ride" ? 20 : 40);
      return { state: name };
    },
    async setPausedForScreenshot(paused: boolean) {
      st().setPaused(paused);
      await nextFrames(2);
    },
    seed: () => undefined, // nothing in the world is random at runtime
  };
  return () => void delete w.__THREE_GAME_TEST_HOOKS__;
}
