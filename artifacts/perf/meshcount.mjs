import { chromium, devices } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu"] });
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
await page.goto(process.argv[2] ?? "http://localhost:3000/?qa");
await page.waitForFunction(() => window.__steppe?.scene && window.__THREE_GAME_TEST_HOOKS__, null, { timeout: 60000 });
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("ride"));
await page.waitForTimeout(1500);
const rows = await page.evaluate(() => {
  const out = [];
  window.__steppe.scene.children.forEach((c, i) => {
    let meshes = 0; const mats = new Set();
    c.traverse((o) => { if ((o.isMesh || o.isPoints) && o.visible) { meshes++; mats.add(o.material?.type); } });
    if (meshes) out.push(`${i} ${c.type} meshes=${meshes} pos=${c.position.toArray().map((v) => v.toFixed(0)).join(",")} ${[...mats].join("/")}`);
  });
  return out;
});
console.log(rows.join("\n"));
console.log(JSON.stringify(await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.renderer)));
await browser.close();
