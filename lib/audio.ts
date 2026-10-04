// Procedural, opt-in audio. Everything is synthesized with the Web Audio API: no files, no network.
//
// Layers
//   ambience: steppe wind (looped noise through modulated band filters)  → world, muffled indoors
//   hooves:   short low thumps timed from riderPose.gait / speed          → world only
//   hearth:   low fire bed + random crackles                              → interior only
//   ui:       soft wooden clicks on open/close                            → always
//
// Muted by default. The AudioContext is created/resumed only from a user gesture (`unlockAudio`),
// faded out and suspended on mute or when the tab is hidden.

import { riderPose } from "./rider";
import { useStore } from "./store";

type Graph = {
  ctx: AudioContext;
  master: GainNode;
  wind: GainNode;
  windFilter: BiquadFilterNode;
  hooves: GainNode;
  hearth: GainNode;
  ui: GainNode;
  noise: AudioBuffer;
};

let g: Graph | null = null;
let suspendTimer: ReturnType<typeof setTimeout> | null = null;

const MASTER = 0.9;
const WIND_OUT = 0.11;
const WIND_IN = 0.035;
const HEARTH = 0.16;

/**
 * riderPose.gait is read as strides (1.0 = one full four-leg stride, the Horse's `phase` unit). A value
 * that wraps back to 0 each stride also works. If gait isn't advancing, a stride phase is derived from
 * speed with the same stride lengths the Horse uses, so hoofbeats never depend on it being wired.
 */
export const GAIT_PER_STRIDE = 1;
const strideLength = (speed: number) => (speed > 11 ? 5.6 : speed > 3.5 ? 2.8 : 1.7);

function makeNoise(ctx: AudioContext, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // Slightly pinkened noise: a running average keeps the hiss soft.
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = last * 0.86 + w * 0.14;
    d[i] = (w * 0.35 + last * 2.2) * 0.6;
  }
  // Fade the loop seam.
  const f = Math.min(2048, len >> 4);
  for (let i = 0; i < f; i++) {
    const k = i / f;
    d[i] *= k;
    d[len - 1 - i] *= k;
  }
  return buf;
}

function lfo(ctx: AudioContext, hz: number, depth: number, target: AudioParam) {
  const o = ctx.createOscillator();
  o.frequency.value = hz;
  const amt = ctx.createGain();
  amt.gain.value = depth;
  o.connect(amt).connect(target);
  o.start();
}

function build(): Graph | null {
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  // Gentle bus compression keeps the hoof roll and crackles from poking out.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);

  const noise = makeNoise(ctx, 4);

  // ── Wind: two noise sources through slowly drifting band/low-pass filters. ──
  const wind = ctx.createGain();
  wind.gain.value = 0;
  const windFilter = ctx.createBiquadFilter(); // overall muffling (lowered indoors)
  windFilter.type = "lowpass";
  windFilter.frequency.value = 2400;
  wind.connect(windFilter).connect(master);

  const body = ctx.createBufferSource();
  body.buffer = noise;
  body.loop = true;
  const bodyBand = ctx.createBiquadFilter();
  bodyBand.type = "bandpass";
  bodyBand.frequency.value = 380;
  bodyBand.Q.value = 0.6;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.7;
  body.connect(bodyBand).connect(bodyGain).connect(wind);
  lfo(ctx, 0.07, 160, bodyBand.frequency);
  lfo(ctx, 0.045, 0.28, bodyGain.gain);
  body.start();

  const gust = ctx.createBufferSource();
  gust.buffer = noise;
  gust.loop = true;
  gust.playbackRate.value = 0.83; // decorrelate from the body layer
  const gustBand = ctx.createBiquadFilter();
  gustBand.type = "bandpass";
  gustBand.frequency.value = 900;
  gustBand.Q.value = 2.2;
  const gustGain = ctx.createGain();
  gustGain.gain.value = 0.18;
  gust.connect(gustBand).connect(gustGain).connect(wind);
  lfo(ctx, 0.11, 420, gustBand.frequency);
  lfo(ctx, 0.031, 0.16, gustGain.gain);
  gust.start();

  // ── Hearth bed: brown-ish rumble, only audible indoors. ──
  const hearth = ctx.createGain();
  hearth.gain.value = 0;
  hearth.connect(master);
  const bed = ctx.createBufferSource();
  bed.buffer = noise;
  bed.loop = true;
  bed.playbackRate.value = 0.5;
  const bedLp = ctx.createBiquadFilter();
  bedLp.type = "lowpass";
  bedLp.frequency.value = 260;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.55;
  bed.connect(bedLp).connect(bedGain).connect(hearth);
  lfo(ctx, 0.3, 0.12, bedGain.gain);
  bed.start();

  const hooves = ctx.createGain();
  hooves.gain.value = 0.55;
  hooves.connect(master);
  const ui = ctx.createGain();
  ui.gain.value = 0.32;
  ui.connect(master);

  return { ctx, master, wind, windFilter, hooves, hearth, ui, noise };
}

const ramp = (p: AudioParam, v: number, ctx: AudioContext, t = 0.6) => {
  const now = ctx.currentTime;
  p.cancelScheduledValues(now);
  p.setValueAtTime(p.value, now);
  p.linearRampToValueAtTime(v, now + t);
};

const audible = () => {
  const s = useStore.getState();
  return !s.muted && document.visibilityState === "visible";
};

/** Fades layers to match the current mode. */
function applyMode() {
  if (!g) return;
  const s = useStore.getState();
  const inside = s.mode === "interior";
  ramp(g.wind.gain, inside ? WIND_IN : WIND_OUT, g.ctx, 1.2);
  ramp(g.windFilter.frequency, inside ? 520 : 2400, g.ctx, 1.2);
  ramp(g.hearth.gain, inside ? HEARTH : 0, g.ctx, 1.2);
}

function applyAudible() {
  if (!g) return;
  const ctx = g.ctx;
  if (suspendTimer) {
    clearTimeout(suspendTimer);
    suspendTimer = null;
  }
  if (audible()) {
    void ctx.resume().catch(() => undefined);
    ramp(g.master.gain, MASTER, ctx, 0.5);
    applyMode();
  } else {
    ramp(g.master.gain, 0, ctx, 0.25);
    suspendTimer = setTimeout(() => {
      if (g && !audible()) void g.ctx.suspend().catch(() => undefined);
    }, 320);
  }
}

/** Call synchronously inside the click/tap that unmutes, so browsers allow the context to start. */
export function unlockAudio() {
  if (!g) g = build();
  if (g && g.ctx.state !== "running") void g.ctx.resume().catch(() => undefined);
}

// ── One-shots ──

function thump(t: number, strength: number) {
  if (!g) return;
  const { ctx } = g;
  const v = (0.7 + Math.random() * 0.3) * strength;
  const pitch = 1 + (Math.random() - 0.5) * 0.16;

  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(115 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(48 * pitch, t + 0.09);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.55 * v, t + 0.006);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(og).connect(g.hooves);
  o.start(t);
  o.stop(t + 0.18);

  // A puff of dry turf on top.
  const n = ctx.createBufferSource();
  n.buffer = g.noise;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 650 + Math.random() * 300;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.004);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  n.connect(lp).connect(ng).connect(g.hooves);
  n.start(t, Math.random() * 3);
  n.stop(t + 0.08);
}

function crackle(t: number, big: boolean) {
  if (!g) return;
  const { ctx } = g;
  const n = ctx.createBufferSource();
  n.buffer = g.noise;
  const hp = ctx.createBiquadFilter();
  hp.type = "bandpass";
  hp.frequency.value = big ? 1400 + Math.random() * 800 : 2600 + Math.random() * 2600;
  hp.Q.value = 0.9;
  const ng = ctx.createGain();
  const dur = big ? 0.03 + Math.random() * 0.03 : 0.004 + Math.random() * 0.01;
  const amp = big ? 0.5 : 0.12 + Math.random() * 0.22;
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(amp, t + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(hp).connect(ng).connect(g.hearth);
  n.start(t, Math.random() * 3.5);
  n.stop(t + dur + 0.02);
}

/** Soft wooden tick. `up` = opening (brighter), otherwise closing (lower). */
export function uiClick(up = true) {
  if (!g || !audible() || g.ctx.state !== "running") return;
  const { ctx } = g;
  const t = ctx.currentTime + 0.005;
  const o = ctx.createOscillator();
  o.type = "triangle";
  const f = up ? 760 : 520;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.06);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.35, t + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(og).connect(g.ui);
  o.start(t);
  o.stop(t + 0.1);

  const n = ctx.createBufferSource();
  n.buffer = g.noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = up ? 2400 : 1600;
  bp.Q.value = 3;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.4, t + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  n.connect(bp).connect(ng).connect(g.ui);
  n.start(t, Math.random() * 3);
  n.stop(t + 0.04);
}

// ── Per-frame scheduler: hooves from the gait phase, crackles from a Poisson clock. ──

// Beat positions within one stride (0..1), matching the Horse's leg offsets.
const WALK = [0, 0.25, 0.5, 0.75];
const TROT = [0, 0.5]; // diagonal pairs land together
const GALLOP = [0, 0.35, 0.45, 0.88]; // hind, lead hind ... fronts, then suspension

let lastGait = 0;
let ownPhase = 0;
let lastT = 0;
let nextCrackle = 0;

function tick() {
  if (!g || g.ctx.state !== "running") return;
  const ctx = g.ctx;
  const s = useStore.getState();
  const now = performance.now() / 1000;
  const dt = lastT ? Math.min(0.1, now - lastT) : 0;
  lastT = now;

  const speed = Math.abs(riderPose.speed);
  // Stride progress this frame: from riderPose.gait when it moves, otherwise from speed.
  let dGait = (riderPose.gait - lastGait) / GAIT_PER_STRIDE;
  lastGait = riderPose.gait;
  if (dGait < -0.5) dGait += 1; // a phase that wraps each stride
  if (!(dGait > 0 && dGait < 0.5)) dGait = (speed / strideLength(speed)) * dt;

  if (s.mode === "world" && !s.paused && speed > 0.6 && dGait > 0) {
    const a = ownPhase;
    const b = ownPhase + dGait;
    const beats = speed > 11 ? GALLOP : speed > 3.5 ? TROT : WALK;
    const strength = Math.min(1, 0.35 + speed / 18);
    // Every beat crossed this frame, placed proportionally inside the frame for even spacing.
    for (let k = Math.floor(a); k <= Math.floor(b); k++) {
      for (const p of beats) {
        const x = k + p;
        if (x > a && x <= b) {
          const lag = ((b - x) / (b - a)) * dt;
          thump(ctx.currentTime + 0.03 - lag * 0.5, strength * (p === 0 ? 1 : 0.8));
        }
      }
    }
    ownPhase = b % 1;
  }

  if (s.mode === "interior") {
    if (nextCrackle < ctx.currentTime) nextCrackle = ctx.currentTime + 0.05;
    while (nextCrackle < ctx.currentTime + 0.15) {
      const big = Math.random() < 0.08;
      crackle(nextCrackle, big);
      // Little clusters: a pop is often followed by a few quick ticks.
      if (big) for (let i = 1; i < 4; i++) crackle(nextCrackle + i * (0.02 + Math.random() * 0.04), false);
      nextCrackle += -Math.log(1 - Math.random()) / 5.5;
    }
  }
}

let started = false;

/** Wires the engine to the store and page visibility. Returns a cleanup. Safe to call before unlock. */
export function initAudio() {
  if (started) return () => undefined;
  started = true;
  let raf = 0;
  const loop = () => {
    tick();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  let prev = useStore.getState();
  const unsub = useStore.subscribe((s) => {
    if (s.muted !== prev.muted) {
      if (!s.muted) unlockAudio();
      applyAudible();
    }
    if (s.mode !== prev.mode) applyMode();
    if (s.projectSlug !== prev.projectSlug) uiClick(!!s.projectSlug);
    else if (s.overlay !== prev.overlay) uiClick(!!s.overlay);
    prev = s;
  });
  const onVis = () => applyAudible();
  document.addEventListener("visibilitychange", onVis);

  return () => {
    started = false;
    cancelAnimationFrame(raf);
    unsub();
    document.removeEventListener("visibilitychange", onVis);
    if (g) {
      const ctx = g.ctx;
      g = null;
      void ctx.close().catch(() => undefined);
    }
  };
}
