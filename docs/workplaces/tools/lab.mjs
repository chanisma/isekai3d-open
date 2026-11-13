// node lab.mjs <wp> [list | <objName>::<chipLabel>::<outPrefix>::<sec,sec,...> ...]
import { chromium } from 'playwright-core';
const [wp, ...jobs] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1243/chrome-win64/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:5410/');
await page.getByRole('button', { name: /동전 넣기/ }).click();
await page.waitForTimeout(2500);
await page.locator('button[aria-label^="SETTINGS"]').click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /동작 실험실/ }).first().click();
await page.locator('select.lab-lot').selectOption(`work:${wp}`);
await page.waitForTimeout(4000);
if (jobs[0] === 'list') {
  for (const row of await page.locator('.lab-obj > button').all()) {
    const name = (await row.innerText()).replace(/\s+/g, ' ');
    await row.click();
    const chips = await page.locator('.tour-chips .chip').allInnerTexts();
    console.log(name, '=>', chips.join(' | '));
    await row.click();
  }
} else {
  for (const job of jobs) {
    const [obj, chip, out, secs] = job.split('::');
    const row = page.locator('.lab-obj > button', { hasText: obj }).first();
    await row.click();
    await page.locator('.tour-chips .chip', { hasText: chip }).first().click();
    await page.waitForTimeout(1500);
    for (let k = 0; k < 120 && (await page.locator('.tour-bar button.on').first().innerText()).includes('가는 중'); k++) await page.waitForTimeout(500);
    let t = 0;
    for (const s of secs.split(',').map(Number)) {
      await page.waitForTimeout((s - t) * 1000); t = s;
      await page.locator('.lab-stage').screenshot({ path: `${out}-${s}.png` });
    }
    console.log(job, 'status:', await page.locator('.tour-bar button.on').first().innerText());
    await row.click();
  }
}
await browser.close();
