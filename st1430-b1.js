// ST-1430 / B1 on ST-1443 — «Bytt husstand» drawn both ways, so the question can be
// answered from pictures instead of words. Rule 7 settles the shape (a centred 428 px
// dialog, not a sheet off the bottom edge). What it must NOT settle on its own is whether
// this popup blocks: the approved Popups section (ST-880) lists the household dropdown as
// one you may ignore — grey edge, no veil — while the built app already paints the 30 %
// veil. Both are rendered here; everything else is identical.
// usage: LD_LIBRARY_PATH=… node st1430-b1.js <outDir> [port]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const S = require('./st1409-lib');

const OUT = process.argv[2];
const PORT = process.argv[3] || 4330;
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

// B: the approved Popups section taken literally — the grey edge of a popup you may
// ignore, and no veil. Nothing else moves.
const NO_VEIL = `
@media (min-width: 1024px) {
  app-household-sheet .sheet-veil { background: transparent !important; }
  app-household-sheet .sheet { border: 1.5px solid #555E64 !important; }
}`;

const FP = () => {
  const r = (n) => Math.round(n * 10) / 10;
  const sheet = document.querySelector('app-household-sheet .sheet');
  const veil = document.querySelector('app-household-sheet .sheet-veil');
  const b = sheet.getBoundingClientRect();
  const s = getComputedStyle(sheet);
  return {
    surface: { x: r(b.left), y: r(b.top), w: r(b.width), h: r(b.height) },
    border: `${s.borderTopWidth} ${s.borderTopColor}`,
    radius: s.borderRadius.split(' ')[0],
    veil: veil ? getComputedStyle(veil).backgroundColor : null,
  };
};

(async () => {
  const out = {};
  for (const [name, extraCss] of [['bytt-husstand-A-blokkerer', null], ['bytt-husstand-B-kan-overses', NO_VEIL]]) {
    const browser = await chromium.launch({ executablePath: EXE });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
    await ctx.addInitScript((t) => {
      localStorage.setItem('accessToken', t);
      sessionStorage.setItem('accessToken', t);
      localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
    }, S.parentToken);
    const page = await ctx.newPage();
    const now = new Date().toISOString();
    const hh = (id, nm, a) => ({ id, name: nm, createdAt: now, updatedAt: now, role: 'admin', memberCount: 4, childrenCount: 3, adminCount: a });
    await page.route('**/api/**', async (route) => {
      const p = new URL(route.request().url()).pathname.replace(/^\/api/, '');
      if (p === '/households')
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([hh(S.HH, 'Familien Nordmann', 2), hh('11111111-1111-4111-8111-111111111112', 'Hytta på Geilo', 2)]) });
      return S.api(route);
    });
    await page.goto(`http://localhost:${PORT}/home`, { waitUntil: 'domcontentloaded' });
    await S.settle(page);
    await page.locator('button.page-title-menu').first().click();
    await page.waitForTimeout(700);
    if (extraCss) await page.addStyleTag({ content: extraCss });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    out[name] = await page.evaluate(FP);
    console.log(name.padEnd(28), JSON.stringify(out[name]));
    await ctx.close();
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'b1-fingerprint.json'), JSON.stringify(out, null, 1));
})();
