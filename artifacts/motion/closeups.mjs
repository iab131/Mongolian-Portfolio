// Close-up stills of world features (headless). Usage: node artifacts/motion/closeups.mjs [url]
import { chromium } from "@playwright/test";
const url = process.argv[2] ?? "http://localhost:3000/?qa";
const out = "artifacts/closeups";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url);
await page.waitForFunction(() => window.__steppe && window.__THREE_GAME_TEST_HOOKS__, null, { timeout: 60000 });
await page.addStyleTag({ content: ".labels, header, nav, .hud, [class*=minimap], [class*=hint], [class*=prompt] { display: none !important; }" });
const st = (fn, arg) => page.evaluate(fn, arg);
async function shot(name, pose, cam, look, settle = 1500) {
  await st((p) => { const s = window.__steppe.store.getState(); s.setPaused(false); s.teleport(p); }, pose);
  await page.waitForTimeout(settle);
  await st(() => window.__steppe.store.getState().setPaused(true));
  await page.waitForTimeout(100);
  await st(({ cam, look }) => {
    const { camera, riderPose: p } = window.__steppe;
    const r = (v) => [v[0] + (v[3] ? p.x : 0), v[1] + (v[3] ? p.y : 0), v[2] + (v[3] ? p.z : 0)];
    camera.position.set(...r(cam)); camera.lookAt(...r(look));
  }, { cam, look });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/${name}.png` });
}
// [x,y,z,relative-to-horse?]
await shot("rider-gallop", { x: 40, z: 78, yaw: Math.PI / 2, speed: 17 }, [-0.8, 2.3, 5.4, 1], [-0.8, 1.7, 0, 1], 1200);
await shot("rider-front", { x: 10, z: 70, yaw: 0, speed: 0 }, [1.6, 2.6, -4.2, 1], [0, 2.0, 0, 1], 800);
await shot("ovoo-hill", { x: 0, z: 50, yaw: -1.1, speed: 0 }, [8, 9, 62, 0], [36, 14, 48, 0]);
await shot("ovoo-close", { x: 28, z: 56, yaw: -1.0, speed: 0 }, [28, 16, 58, 0], [36, 15, 48, 0]);
await shot("camp", { x: 0, z: 18, yaw: 0, speed: 0 }, [0, 4, 16, 0], [0, 1.5, -2, 0]);
await shot("cattle", { x: 10, z: 34, yaw: 0, speed: 0 }, [12, 3, 34, 0], [22, 1, 20, 0], 3000);
await shot("sheep-goats", { x: -10, z: 50, yaw: 0, speed: 0 }, [-14, 3.5, 48, 0], [-25, 0.5, 35, 0], 3000);
await shot("camels", { x: -50, z: 0, yaw: 0, speed: 0 }, [-52, 4, 0, 0], [-66, 2, -20, 0], 3000);
await shot("horses", { x: 50, z: 5, yaw: 0, speed: 0 }, [52, 3.5, 4, 0], [64, 1.2, -18, 0], 3000);
await browser.close();
console.log("done");
