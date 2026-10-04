// Held-key state for riding. Read every frame, so it lives outside React.

const held = new Set<string>();

const RIDE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "ShiftLeft", "ShiftRight",
]);

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

export function bindRideKeys() {
  const down = (e: KeyboardEvent) => {
    if (isTyping(e) || !RIDE_KEYS.has(e.code)) return;
    held.add(e.code);
    if (e.code.startsWith("Arrow")) e.preventDefault();
  };
  const up = (e: KeyboardEvent) => held.delete(e.code);
  const clear = () => held.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", clear);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", clear);
    held.clear();
  };
}

/** Touch controls write here. throttle/steer in [-1, 1]; steer > 0 turns left. */
const virtual = { throttle: 0, steer: 0, gallop: false };

export function setVirtualRide(v: Partial<typeof virtual>) {
  Object.assign(virtual, v);
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

export function readRide() {
  const f = held.has("KeyW") || held.has("ArrowUp");
  const b = held.has("KeyS") || held.has("ArrowDown");
  const l = held.has("KeyA") || held.has("ArrowLeft");
  const r = held.has("KeyD") || held.has("ArrowRight");
  return {
    throttle: clamp1((f ? 1 : 0) - (b ? 1 : 0) + virtual.throttle),
    steer: clamp1((l ? 1 : 0) - (r ? 1 : 0) + virtual.steer),
    gallop: held.has("ShiftLeft") || held.has("ShiftRight") || virtual.gallop,
  };
}
