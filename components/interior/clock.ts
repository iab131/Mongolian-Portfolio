import { useFrame } from "@react-three/fiber";
import { useStore } from "@/lib/store";

/** Interior animation time. Stops advancing while the store is paused (screenshots). */
export const interiorClock = { t: 0 };

/** Mount once in the interior scene: advances `interiorClock` unless paused. */
export function useInteriorClock() {
  useFrame((_, dt) => {
    if (!useStore.getState().paused) interiorClock.t += Math.min(dt, 0.1);
  }, -2);
}
