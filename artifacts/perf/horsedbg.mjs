import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(process.argv[2] ?? "http://localhost:3000/?qa");
await page.waitForFunction(() => window.__steppe?.scene, null, { timeout: 60000 });
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => {
  const sc = window.__steppe.scene;
  const big = sc.children.map((c) => { let n = 0; c.traverse((o) => o.isMesh && n++); return [c, n]; }).sort((a, b) => b[1] - a[1])[0][0];
  const lines = [];
  big.traverse((o) => { const meshKids = o.children.filter((c) => c.isMesh).length; if (meshKids > 1) lines.push(`${o.type}#${o.id} meshKids=${meshKids} keep=${o.children.filter((c) => c.userData.keep).length}`); });
  return lines.join("\n");
}));
await browser.close();
