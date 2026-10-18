// ST-1410 — the columns, the main button and the air under the sub-line, in the DOM.
const { chromium } = require('playwright');
const S = require('./shootlib.js');
(async () => {
  const browser = await chromium.launch({ executablePath: '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
  for (const [name, path, role] of S.PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'nb-NO' });
    await ctx.addInitScript((t) => { if (t) { localStorage.setItem('accessToken', t); sessionStorage.setItem('accessToken', t); } localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111'); }, role === 'child' ? S.childToken : role === 'parent' ? S.parentToken : null);
    const page = await ctx.newPage();
    await page.route('**/api/**', S.api);
    await page.goto('http://localhost:4472' + path, { waitUntil: 'domcontentloaded' });
    await S.settle(page);
    const out = await page.evaluate(() => {
      const r = (n) => Math.round(n * 10) / 10;
      const box = (e) => { const b = e.getBoundingClientRect(); return { x: r(b.left), w: r(b.width), h: r(b.height) }; };
      const cols = [...document.querySelectorAll('.r4-cols > *, .cols > .col')].map(box);
      const main = [...document.querySelectorAll('.r5-main, .primary, button[type=submit]')].filter((e) => e.getBoundingClientRect().height > 10).map((e) => ({ ...box(e), radius: getComputedStyle(e).borderRadius.split(' ')[0], fs: getComputedStyle(e).fontSize, bg: getComputedStyle(e).backgroundColor, col: getComputedStyle(e).color, op: getComputedStyle(e).opacity, dis: e.disabled === true }));
      const sub = document.querySelector('.page-subtitle');
      const band = document.querySelector('.page-header--band');
      return { cols, main, sub: sub ? box(sub) : null, bandH: band ? r(band.getBoundingClientRect().height) : null, bandBottom: band ? r(band.getBoundingClientRect().bottom) : null, subBottom: sub ? r(sub.getBoundingClientRect().bottom) : null, scrollW: document.documentElement.scrollWidth };
    });
    console.log(name.padEnd(20), 'cols', JSON.stringify(out.cols), 'air', out.subBottom != null && out.bandBottom != null ? r2(out.bandBottom - out.subBottom) : '-', 'scrollW', out.scrollW);
    for (const b of out.main) console.log('   main', JSON.stringify(b));
    await ctx.close();
  }
  await browser.close();
  function r2(n) { return Math.round(n * 10) / 10; }
})();
