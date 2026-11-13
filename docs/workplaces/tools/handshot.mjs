// Close look at a tool in the hand (handTool.ts): moments, a side view, each hand up close and the whole body on a sheet, and the palm-to-grip probe.
// node handshot.mjs <outDir> work:<wp> <piece>::<chip>::<tag>::<sec,sec>[::age] ...
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
const [out, lot, ...jobs] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1243/chrome-win64/chrome.exe', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const log = (s) => { console.log(s); appendFileSync(`${out}/report.txt`, s + '\n'); };
for (const job of jobs) {
  const [piece, chip, tag, secs, age] = job.split('::');
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.setDefaultTimeout(120000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  try {
    await page.goto('http://localhost:5410/');
    await page.getByRole('button', { name: /동전 넣기/ }).click();
    await page.waitForTimeout(2000);
    await page.locator('button[aria-label^="SETTINGS"]').click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /동작 실험실/ }).first().click();
    if (lot !== 'lab') await page.locator('select.lab-lot').selectOption(lot);
    await page.waitForTimeout(3500);
    await page.evaluate((a) => { globalThis.__toolProbe = {}; if (a) { const v = window.__game.state.dwellers.find((x) => !x.npc); v.age = a; } }, age);
    if (age) await page.waitForTimeout(3000);
    const row = page.locator('.lab-obj > button').filter({ hasText: piece }).first();
    await row.evaluate((e) => e.click());
    await page.waitForTimeout(200);
    await page.locator('.tour-chips .chip').filter({ hasText: chip }).first().evaluate((e) => e.click());
    await page.waitForTimeout(1200);
    const status = () => page.locator('.tour-bar button.on').first().innerText();
    let st = await status();
    for (let k = 0; k < 120 && st.includes('가는 중'); k++) { await page.waitForTimeout(500); st = await status(); }
    for (let z = 0; z < 1; z++) await page.locator('button[title^="확대"]').first().evaluate((e) => e.click());
    await page.waitForTimeout(1200);
    // Seek from where the motion is now; the piece's own round started as the dweller arrived.
    let t = 0;
    for (const s of secs.split(',').map(Number)) {
      for (let left = s - t; left > 0; left -= 0.3) await page.evaluate((d) => new Promise((res) => { window.__view.clock += d; requestAnimationFrame(() => requestAnimationFrame(res)); }), Math.min(0.3, left));
      t = s;
      await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
      writeFileSync(`${out}/${tag}-${s}.png`, await page.locator('.lab-stage').screenshot());
    }
    // The last moment from the side too.
    await page.evaluate(() => { const v = window.__view; v.yaw = v.goal.yaw = v.goal.yaw + Math.PI / 2; v.placeCamera(); });
    await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
    writeFileSync(`${out}/${tag}-side.png`, await page.locator('.lab-stage').screenshot());
    // Wait till the tool is really in the hand (a beat with hands free would photograph nothing held).
    await page.evaluate(async () => { globalThis.__handAt = undefined; for (let i = 0; i < 120 && !(globalThis.__handAt && globalThis.__handAt.body); i++) await new Promise((res) => setTimeout(res, 250)); });
    // Each hand up close and the whole body, from several sides, on sheets.
    const sheet = await page.evaluate(async () => {
      const v = window.__view; const at = globalThis.__handAt ?? {};
      const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200; const g = cv.getContext('2d');
      const stage = v.renderer.domElement; const THREE = await import('/node_modules/.vite/deps/three.js');
      const base = v.camera.position.clone(); const dir0 = Math.atan2(base.x - v.target.x, base.z - v.target.z);
      const near = v.camera.near; v.camera.near = 0.02; v.camera.updateProjectionMatrix();
      const shot = (c, r, h, a, col, row) => { const y = dir0 + a; v.camera.position.set(c.x + Math.sin(y) * r, c.y + h, c.z + Math.cos(y) * r); v.camera.lookAt(c); v.renderer.render(v.scene, v.camera); g.drawImage(stage, col * 400, row * 400, 400, 400); };
      const sides = ['left', 'right'].filter((s) => at[s]);
      const body = new THREE.Vector3(...at.body);
      const shotAt = (c, r, h, y, col, row) => { v.camera.position.set(c.x + Math.sin(y) * r, c.y + h, c.z + Math.cos(y) * r); v.camera.lookAt(c); v.renderer.render(v.scene, v.camera); g.drawImage(stage, col * 400, row * 400, 400, 400); };
      // Close up from the side away from the body, where nothing's in the way.
      sides.forEach((s, row) => { const c = new THREE.Vector3(...at[s]); const out = Math.atan2(c.x - body.x, c.z - body.z); [[0, 0.05], [0.9, 0.12], [-0.9, 0.12], [0, 0.28]].forEach(([a, h], i) => shotAt(c, 0.26, h, out + a, i, row)); });
      const mid = body.clone().setY(body.y + 0.9);
      [0, 1.57, 3.14, -1.57].forEach((a, i) => shotAt(mid, 1.7, 0.5, a, i, 2));
      v.camera.near = near; v.camera.updateProjectionMatrix();
      return cv.toDataURL('image/png').split(',')[1];
    });
    writeFileSync(`${out}/${tag}-hands.png`, Buffer.from(sheet, 'base64'));
    const probe = await page.evaluate(() => globalThis.__toolProbe);
    log(`${tag}: status=[${st.replace(/\s+/g, ' ')}] errs=${errs.length ? errs[0] : 0} probe=${JSON.stringify(probe)}`);
  } catch (e) { log(`${tag}: FAILED ${e.message.split('\n')[0]}`); }
  await page.close();
}
await browser.close();
