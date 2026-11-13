// One pass over a whole workplace in the motion lab, so a review costs one run and a few images.
//   node review.mjs <wp> [--out dir] [--at 2,7,13] [--piece substring] [--only substring] [--zoom n] [--close n] [--full] [--all] [--gender female] [--query ?vroid=1] [--front-only]
//   Each interaction is seen from the front at every moment, then at the last from the left, the right, behind and above (--front-only: not).
//   --cpu renders in software (SwiftShader) where there is no GPU; --auto n picks the moments itself (over --span seconds).
//   --gender and --age change the visitor, to see the hands and props on another body.
//   --close steps the camera in, for hands and small props; --full also keeps each moment as <stem>-<row>-<moment>.png, at full size.
//   --piece picks pieces by name (the others cost nothing); --only also matches the interaction's label (it still opens every piece, so give --piece too); --all includes the household pieces.
// Tries every interaction of every kind of piece once and writes to <out>:
//   <wp>-report.txt   each interaction: ok, or what went wrong
//   <wp>-sheet-N.png  contact sheets, one row per interaction, one column per moment (a piece's first row opens with a wide shot)
// A full run replaces the last one's files; a --piece/--only run writes <wp>-part-* beside them.
// Flags: NO-START (the dweller never began it), NO-ARRIVE (still walking), UNREACHABLE (the game said so),
// DISABLED (locked in the lab, e.g. by career stage), STILL (the frames barely change: a held pose),
// PAGEERROR, CRASHED (the browser died: the piece's other interactions are lost, rerun with --only).
// A flag says where to look first; the sheets are still what is judged.
// Each piece gets a fresh browser and everything is written as it goes, so a crash costs one piece.
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const wp = argv[0];
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i > 0 ? argv[i + 1] : d; };
const out = opt('out', '.');
const at = opt('at', '2,6,10,14').split(',').map(Number);
const only = opt('only', '');
const piece = opt('piece', '');
const zoom = Number(opt('zoom', '0')); // Steps back this many clicks, for big pieces.
// Shared with homes and not this pipeline's to change, so a review doesn't spend its time on them.
const HOUSEHOLD = /(^| )(식탁 의자|소파|안락의자|냉장고|커피 메이커|변기|세면대|샤워기?|침대|책장|화분|스탠드(?! 마이크)|조명|어항|포스터|그림)(?![가-힣])/;
const close = Number(opt('close', '0'));
const angles = !argv.includes('--front-only');
const VIEWS = [['left', Math.PI / 2, 0.4], ['right', -Math.PI / 2, 0.4], ['back', Math.PI, 0.4], ['top', 0, 1.4]];
// --auto n: walk the interaction second by second on small frames and keep the n moments that differ most,
// so the beats are found without knowing the script or guessing --at.
const auto = Number(opt('auto', '0'));
const span = Number(opt('span', '24'));
const started = Date.now();
const body = { gender: opt('gender', ''), age: opt('age', '') };
const full = argv.includes('--full');
const skipHousehold = !argv.includes('--all');
const ROWS = 5;
mkdirSync(out, { recursive: true });
const stem = piece || only ? `${wp}-part` : wp;
for (const f of readdirSync(out)) if (f.startsWith(`${stem}-sheet-`) || f === `${stem}-report.txt`) rmSync(`${out}/${f}`);

const launch = () => chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1243/chrome-win64/chrome.exe', args: argv.includes('--cpu') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
let pageErrors = [];
async function openLab(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
  page.setDefaultTimeout(150000); // SwiftShader under load: a frame can take a second or more.
  page.on('pageerror', (e) => pageErrors.push(e.stack ?? e.message));
  await page.goto(`http://localhost:5410/${opt('query', '')}`);
  await page.getByRole('button', { name: /동전 넣기/ }).click();
  await page.waitForTimeout(2500);
  await page.locator('button[aria-label^="SETTINGS"]').click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /동작 실험실/ }).first().click();
  if (wp !== 'home') await page.locator('select.lab-lot').selectOption(wp === 'more' ? 'more' : `work:${wp}`);
  await page.waitForTimeout(4000);
  await page.evaluate((b) => { const v = window.__game.state.dwellers.find((x) => !x.npc); for (const k in b) if (b[k]) v[k] = b[k]; }, body);
  if (body.gender || body.age) await page.waitForTimeout(3000);
  return page;
}
const rowName = (row) => row.locator('span').first().innerText().then((t) => t.trim());

// Stills compared in the page: the largest share of pixels that changed between two moments.
const changeIn = (page, shots) => page.evaluate(async (list) => {
  const px = await Promise.all(list.map(async (b) => {
    const img = new Image(); img.src = `data:image/png;base64,${b}`; await img.decode();
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 100;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 160, 100);
    return g.getImageData(0, 0, 160, 100).data;
  }));
  let most = 0;
  for (let i = 1; i < px.length; i++) {
    let moved = 0;
    for (let j = 0; j < px[i].length; j += 4) if (Math.abs(px[i][j] - px[i - 1][j]) + Math.abs(px[i][j + 1] - px[i - 1][j + 1]) + Math.abs(px[i][j + 2] - px[i - 1][j + 2]) > 40) moved++;
    most = Math.max(most, moved / 16000);
  }
  return most;
}, shots);

// Walks forward through one loop of the motion, then back to the moments that changed most from the last one kept.
async function keyMoments(page) {
  return page.evaluate(async ([span, n]) => {
    const v = window.__view;
    const stage = document.querySelector('.lab-stage canvas');
    const small = document.createElement('canvas'); small.width = 96; small.height = 60;
    const g = small.getContext('2d', { willReadFrequently: true });
    const frames = [];
    const start = v.clock;
    for (let s = 1; s <= span; s++) {
      for (let k = 0; k < 3; k++) { v.clock += 1 / 3; await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); }
      g.drawImage(stage, 0, 0, 96, 60);
      frames.push({ s, px: g.getImageData(0, 0, 96, 60).data });
    }
    v.clock = start;
    const diff = (a, b) => { let m = 0; for (let j = 0; j < a.length; j += 4) if (Math.abs(a[j] - b[j]) + Math.abs(a[j + 1] - b[j + 1]) + Math.abs(a[j + 2] - b[j + 2]) > 40) m++; return m; };
    // Greedily: each next moment is the one furthest from all those kept.
    const kept = [frames[0]];
    while (kept.length < n) {
      let best = null, far = -1;
      for (const f of frames) { if (kept.includes(f)) continue; const d = Math.min(...kept.map((k) => diff(k.px, f.px))); if (d > far) { far = d; best = f; } }
      if (!best || far < 30) break;
      kept.push(best);
    }
    return kept.map((f) => f.s).sort((a, b) => a - b);
  }, [span, auto]);
}

const report = [];
const log = (line) => { report.push(line); console.log(line); writeFileSync(`${out}/${stem}-report.txt`, report.join('\n') + '\n'); };
let pending = [];
let sheets = 0;
let flagged = 0;
async function writeSheet(browser) {
  if (!pending.length) return;
  const part = pending;
  pending = [];
  const sheetPage = await browser.newPage({ viewport: { width: 1740, height: 400 } });
  await sheetPage.setContent(`<body style="margin:0;background:#222;font:15px sans-serif;color:#fff">${part.map((c) => `<div style="padding:4px 8px;background:${c.flags.length ? '#a33' : '#333'}">${c.tag} ${c.flags.join(' ')}</div><div style="display:flex;flex-wrap:wrap">${c.shots.map((b) => `<img style="width:${Math.floor(1740 / Math.min(c.shots.length, 5))}px;display:block" src="data:image/png;base64,${b}">`).join('')}</div>`).join('')}</body>`);
  await sheetPage.waitForTimeout(300);
  await sheetPage.screenshot({ path: `${out}/${stem}-sheet-${++sheets}.png`, fullPage: true });
  await sheetPage.close();
}

// The pieces, one of each kind: the same piece again adds nothing.
let browser = await launch();
let page = await openLab(browser);
const names = [];
{
  const rows = page.locator('.lab-obj > button');
  for (let r = 0, n = await rows.count(); r < n; r++) {
    const name = await rowName(rows.nth(r));
    if (names.includes(name) || (piece && !name.includes(piece)) || (skipHousehold && !piece && !only && HOUSEHOLD.test(name))) continue;
    names.push(name);
  }
}
await browser.close();
browser = null;

const done = new Set();
const queue = names.map((name) => ({ name, tries: 0 }));
for (const job of queue) {
  const { name } = job;
  // One browser throughout, a fresh page per piece; a crash brings a new browser.
  browser ??= await launch();
  try {
    page = await openLab(browser);
    const row = page.locator('.lab-obj > button').filter({ hasText: name }).first();
    await row.evaluate((e) => e.click());
    await page.waitForTimeout(150);
    // The piece as the player sees it, before going close.
    for (let z = 0; z < 5; z++) await page.locator('button[title^="축소"]').first().evaluate((e) => e.click());
    await page.waitForTimeout(1500);
    let wide = (await page.locator('.lab-stage').screenshot()).toString('base64');
    const chips = page.locator('.tour-chips .chip');
    const status = () => page.locator('.tour-bar button.on').first().innerText();
    for (let c = 0, m = await chips.count(); c < m; c++) {
      const chip = chips.nth(c);
      const label = (await chip.innerText()).trim();
      if (only && !`${name} ${label}`.includes(only)) continue;
      const tag = `${name} / ${label}`;
      if (done.has(tag)) continue;
      done.add(tag);
      if (await chip.isDisabled()) { log(`DISABLED     ${tag} (${await chip.getAttribute('title')})`); flagged++; continue; }
      pageErrors = [];
      const word = label.replace(/^\S+\s+/, '').replace(/\s*\(.*$/, '');
      await chip.evaluate((e) => e.click());
      await page.waitForTimeout(1500);
      let st = await status();
      for (let k = 0; k < 90 && st.includes('가는 중'); k++) { await page.waitForTimeout(500); st = await status(); }
      const flags = [];
      if (await page.getByText('그곳에 갈 수 없어요').count()) flags.push('UNREACHABLE');
      if (st.includes('가는 중')) flags.push('NO-ARRIVE');
      if (!st.includes(word)) flags.push(`NO-START[${st.replace(/\s+/g, ' ')}]`);
      for (let z = 0; z < zoom; z++) await page.locator('button[title^="축소"]').first().evaluate((e) => e.click());
      for (let z = 0; z < close; z++) await page.locator('button[title^="확대"]').first().evaluate((e) => e.click());
      if (close) await page.waitForTimeout(1500);
      const shots = [];
      let t = 0;
      const moments = auto ? await keyMoments(page) : at;
      for (const s of moments) {
        // The view's clock is seeked, not waited for: under SwiftShader wall seconds aren't game seconds.
        for (let left = s - t; left > 0; left -= 0.4) { await page.evaluate((d) => new Promise((res) => { const v = window.__view; const k = v.lot ?? v.scene ?? v; (k.clock !== undefined ? k : v).clock += d; requestAnimationFrame(() => requestAnimationFrame(res)); }), Math.min(0.4, left)); } t = s;
        await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
        const shot = await page.locator('.lab-stage').screenshot();
        if (full) writeFileSync(`${out}/${stem}-${report.length + 1}-${s}.png`, shot);
        shots.push(shot.toString('base64'));
      }
      const change = await changeIn(page, shots);
      // The same moment from every side and from above: what the front hides (a hand behind the body, a figure in the furniture).
      if (angles) {
        for (const [name, turn, tilt] of VIEWS) {
          const moved = await page.evaluate(async ([turn, tilt]) => {
            const v = window.__view;
            v.savedAngle ??= { yaw: v.goal.yaw, pitch: v.goal.pitch };
            const was = v.camera.position.clone();
            v.yaw = v.goal.yaw = v.savedAngle.yaw + turn;
            v.pitch = v.goal.pitch = tilt;
            v.placeCamera(); // At the goal already, the glide wouldn't place it.
            // A wall or the piece's own back between the camera and the middle of the view: nothing to see from here.
            const THREE = await import('/node_modules/.vite/deps/three.js');
            const aim = v.target.clone().setY(v.target.y + 0.9);
            const dir = aim.clone().sub(v.camera.position);
            const far = dir.length();
            const caster = new THREE.Raycaster(v.camera.position, dir.normalize(), 0.05, far);
            caster.camera = v.camera; // A sprite in the scene won't be tested without one.
            const hits = caster.intersectObjects(v.scene.children, true);
            const seen = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
            const hit = hits.find((h) => seen(h.object) && !h.object.isSkinnedMesh && !h.object.isSprite && h.object.material?.opacity !== 0 && (h.object.material?.side ?? 0) !== 1);
            const blocked = !!hit && hit.distance < far * 0.75;
            return { d: v.camera.position.distanceTo(was), blocked };
          }, [turn, tilt]);
          if (moved.d < 0.1) flags.push(`SAME-VIEW[${name}]`);
          if (moved.blocked) { console.log(`  skipped ${name}: blocked`); continue; }
          await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
          const shot = await page.locator('.lab-stage').screenshot();
          if (full) writeFileSync(`${out}/${stem}-${report.length + 1}-${name}.png`, shot);
          shots.push(shot.toString('base64'));
        }
        await page.evaluate(() => { const v = window.__view; v.goal.yaw = v.yaw = v.savedAngle.yaw; v.goal.pitch = v.pitch = v.savedAngle.pitch; v.placeCamera(); delete v.savedAngle; });
      }
      if (change < 0.004) flags.push('STILL');
      if (pageErrors.length) { flags.push(`PAGEERROR[${pageErrors[0].split(String.fromCharCode(10))[0]}]`); console.log(pageErrors[0]); }
      if (flags.length) flagged++;
      log(`${(flags.length ? flags.join(' ') : 'ok').padEnd(12)} ${tag} (change ${(change * 100).toFixed(1)}%)`);
      pending.push({ tag, flags, shots: wide ? [wide, ...shots] : shots });
      wide = null;
      // A part run is short and looked at straight away: each row is on disk as soon as it's shot.
      if (pending.length >= (piece || only ? 1 : ROWS)) await writeSheet(browser);
    }
  } catch (e) {
    // Once more at the end: usually a slow moment on a shared machine, and what's shot stays shot.
    if (!job.tries++) queue.push(job);
    else flagged++;
    log(`${job.tries > 1 ? 'CRASHED' : 'RETRY'}      ${name}: ${String(e.message).split('\n')[0]}`);
    await browser.close().catch(() => {});
    browser = null;
    continue;
  }
  await page.close().catch(() => {});
}
// What's pending lives out here, so a crash in the page doesn't lose it.
browser ??= await launch();
await writeSheet(browser);
await browser.close();
console.log(`${Math.round((Date.now() - started) / 1000)} s; ${report.length} checked, ${flagged} flagged, ${sheets} sheets in ${out}`);
