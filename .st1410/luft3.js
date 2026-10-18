// ST-1410 round 2 — redraw the one file with the page's own air over the placeholder rows,
// and a control on part 1's page (parent Belønninger, «Ønsker» tab) proving the scoped rule
// does not reach it: part 1 is approved, so its picture must measure the same as before.
// usage: node .st1410/luft3.js <outDir> [port]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const S = require('./shootlib');

const OUT = process.argv[2];
const PORT = process.argv[3] || 4381;
const BASE = `http://localhost:${PORT}`;
fs.mkdirSync(OUT, { recursive: true });

const PROBE = () => {
  const r = (n) => Math.round(n * 10) / 10;
  const box = (e) => {
    if (!e) return null;
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return { top: r(b.top), bottom: r(b.bottom), x: r(b.left), w: r(b.width), h: r(b.height), mt: s.marginTop, radius: s.borderRadius.split(' ')[0] };
  };
  const q = (s) => box(document.querySelector(s));
  const band = q('.page-header--band') || q('.page-header');
  const sk = document.querySelector('.r7-skeleton');
  return {
    band,
    bandBottom: band && band.bottom,
    skeleton: box(sk),
    rows: [...document.querySelectorAll('.r7-skeleton i')].map(box),
    skeletonParent: sk && sk.parentElement ? sk.parentElement.className.toString().slice(0, 40) : null,
    scopedMatches: document.querySelectorAll('.page-content > .r7-skeleton:first-child').length,
    tabRow: q('.tabs, .tabrow, [role="tablist"]'),
    scrollW: document.documentElement.scrollWidth,
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
  };
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.EXE });
  const mk = async (token) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
    await ctx.addInitScript((t) => {
      localStorage.setItem('accessToken', t); sessionStorage.setItem('accessToken', t);
      localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
    }, token);
    return ctx;
  };
  const out = {};

  // 1. the file under review, redrawn
  const c1 = await mk(S.childToken); const p1 = await c1.newPage();
  await p1.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (p === '/children/me/tasks') return; // held open: this is the loading state
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await p1.goto(BASE + '/my-tasks', { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(2800);
  try { await p1.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
  await p1.waitForTimeout(400);
  out.laster = await p1.evaluate(PROBE);
  await p1.screenshot({ path: path.join(OUT, 'rules-mine-oppgaver-barn-laster-1440.png'), fullPage: true });
  await c1.close();

  // 2. the control: part 1's page, same loading idea, must be untouched by the scoped rule
  const c2 = await mk(S.parentToken); const p2 = await c2.newPage();
  await p2.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (p.includes('/redemptions')) return; // held open
    return S.api(route);
  });
  await p2.goto(BASE + '/rewards', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2500);
  try {
    const tab = p2.locator('button:has-text("Ønsker")').first();
    if (await tab.count()) { await tab.click(); await p2.waitForTimeout(900); }
  } catch (e) {}
  out.kontroll = await p2.evaluate(PROBE);
  await c2.close();

  const g = (o) => (o && o.band && o.skeleton ? Math.round((o.skeleton.top - o.band.bottom) * 10) / 10 : null);
  out.summary = {
    laster_band_bottom: out.laster.bandBottom,
    laster_luft: g(out.laster),
    laster_first_row_top: out.laster.rows[0] && out.laster.rows[0].top,
    kontroll_band_bottom: out.kontroll.bandBottom,
    kontroll_skeleton_top: out.kontroll.skeleton && out.kontroll.skeleton.top,
    kontroll_skeleton_mt: out.kontroll.skeleton && out.kontroll.skeleton.mt,
    kontroll_scopedMatches: out.kontroll.scopedMatches,
    kontroll_parent: out.kontroll.skeletonParent,
  };
  fs.writeFileSync(path.join(OUT, 'luft-etter.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.summary, null, 1));
  console.log('rows:', JSON.stringify(out.laster.rows));
  await browser.close();
})();
