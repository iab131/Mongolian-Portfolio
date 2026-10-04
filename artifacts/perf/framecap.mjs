// Simulates a high-refresh panel (uncapped rAF) and measures display frames vs rendered frames + CPU busy.
import { chromium } from "@playwright/test";
const url = process.argv[2] ?? "http://127.0.0.1:3100/?qa";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--disable-gpu-vsync", "--disable-frame-rate-limit"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url);
await page.waitForFunction(() => window.__steppe && window.__THREE_GAME_DIAGNOSTICS__, null, { timeout: 30000 });
await page.evaluate(() => window.__steppe.store.getState().teleport({ x: 0, z: 50, yaw: 0 }));
await page.waitForTimeout(2000);
await page.keyboard.down("KeyW"); await page.keyboard.down("ShiftLeft");
const cdp = await page.context().newCDPSession(page);
await cdp.send("Performance.enable");
const m0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
const r = await page.evaluate(() => new Promise((res) => {
  const gl = window.__steppe; let raf = 0; const t0 = performance.now();
  const f0 = window.__THREE_GAME_DIAGNOSTICS__ ? null : null;
  const start = window.__frames0 = performance.now();
  const fr0 = window.__THREE_GAME_DIAGNOSTICS__.renderer.frame;
  const loop = () => { raf++; performance.now() - t0 < 4000 ? requestAnimationFrame(loop) : res({ raf: raf / 4, renders: (window.__THREE_GAME_DIAGNOSTICS__.renderer.frame - fr0) / 4 }); };
  requestAnimationFrame(loop);
}));
const m1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
const busy = (m1.TaskDuration - m0.TaskDuration) / (m1.Timestamp - m0.Timestamp);
console.log(JSON.stringify({ url, displayFps: Math.round(r.raf), renderCallsPerSec: Math.round(r.renders), mainThreadBusy: +(busy * 100).toFixed(1) + "%", scriptMs: +((m1.ScriptDuration - m0.ScriptDuration) * 1000).toFixed(0) }));
await browser.close();
