// Motion evidence: real-time gallop clip (chase cam) + side-view gait frame strip.
import { chromium } from "@playwright/test";
const url = process.argv[2] ?? "http://localhost:3300/?qa";
const out = "artifacts/motion";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
await page.goto(url);
await page.waitForFunction(() => window.__steppe && window.__THREE_GAME_TEST_HOOKS__, null, { timeout: 30000 });
// 1) Real input: walk → trot → gallop with turns, then stop
await page.evaluate(() => window.__steppe.store.getState().teleport({ x: 0, z: 50, yaw: 0 }));
await page.waitForTimeout(800);
await page.keyboard.down("KeyW");
await page.waitForTimeout(2500);
await page.keyboard.down("ShiftLeft");
await page.waitForTimeout(2500);
await page.keyboard.down("KeyD");
await page.waitForTimeout(1200);
await page.keyboard.up("KeyD");
await page.waitForTimeout(1500);
await page.keyboard.up("ShiftLeft");
await page.keyboard.up("KeyW");
await page.waitForTimeout(2500);
// 2) Side-view gait strip at gallop: step 70ms, pause, place camera beside the horse, shoot
await page.evaluate(() => window.__steppe.store.getState().teleport({ x: 40, z: 60, yaw: Math.PI / 2, speed: 17 }));
await page.waitForTimeout(1500);
for (let i = 0; i < 8; i++) {
  await page.evaluate(() => window.__steppe.store.getState().setPaused(true));
  await page.evaluate(() => {
    const { camera, riderPose } = window.__steppe;
    camera.position.set(riderPose.x - 0.3, riderPose.y + 1.5, riderPose.z + 6.2); camera.lookAt(riderPose.x - 0.3, riderPose.y + 1.3, riderPose.z);
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/gallop-side-${i}.png`, clip: { x: 340, y: 150, width: 600, height: 420 } });
  await page.evaluate(() => window.__steppe.store.getState().setPaused(false));
  await page.waitForTimeout(45);
}
// 3) Trot strip
await page.evaluate(() => window.__steppe.store.getState().teleport({ x: 40, z: 60, yaw: Math.PI / 2, speed: 8 }));
await page.waitForTimeout(1500);
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => window.__steppe.store.getState().setPaused(true));
  await page.evaluate(() => {
    const { camera, riderPose } = window.__steppe;
    camera.position.set(riderPose.x - 0.3, riderPose.y + 1.5, riderPose.z + 6.2); camera.lookAt(riderPose.x - 0.3, riderPose.y + 1.3, riderPose.z);
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/trot-side-${i}.png`, clip: { x: 340, y: 150, width: 600, height: 420 } });
  await page.evaluate(() => window.__steppe.store.getState().setPaused(false));
  await page.waitForTimeout(60);
}
const video = page.video();
await ctx.close();
console.log("video", await video.path());
await browser.close();
