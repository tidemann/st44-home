// ST-1410 round 2 (Astrid): rule 7 is the only change on «Mine oppgaver (barn)», and no
// file showed it — the pair in the sheet is identical because the loaded page already met
// rules 1–4. Part 1 answered the same point with rules-belonninger-laster-1440.png; this is
// the same thing here: /children/me/tasks is held open while the page is shot, so the
// loading state draws. Everything else in the setup is st1410-shoot.js, unchanged.
// usage: node .st1410/laster.js <outDir> [port]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = process.argv[2];
const PORT = process.argv[3] || 4381;
const BASE = `http://localhost:${PORT}`;
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

const b64 = (o) =>
  Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (p) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(p)}.sig`;
const exp = Math.floor(Date.now() / 1000) + 86400;
const childToken = jwt({
  userId: '55555555-5555-4555-8555-555555555551', email: 'jonas@example.test', role: 'child',
  firstName: 'Jonas', lastName: 'Nordmann', type: 'access', exp,
});

const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
  await ctx.addInitScript((t) => {
    localStorage.setItem('accessToken', t); sessionStorage.setItem('accessToken', t);
    localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
  }, childToken);
  const page = await ctx.newPage();
  await page.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (p === '/children/me/tasks') return; // held open on purpose: this is the loading state
    return json(route, {});
  });
  await page.goto(BASE + '/my-tasks', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
  await page.waitForTimeout(400);

  // what is actually on the screen, so the claim in the document is measured, not asserted
  const probe = await page.evaluate(() => {
    const r = (n) => Math.round(n * 10) / 10;
    const rows = [...document.querySelectorAll('.r7-skeleton i')].map((e) => {
      const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return { x: r(b.left), w: r(b.width), h: r(b.height), bg: s.backgroundColor, radius: s.borderRadius.split(' ')[0] };
    });
    const sk = document.querySelector('.r7-skeleton');
    const skb = sk && sk.getBoundingClientRect();
    const YEL = 'rgb(246, 185, 59)';
    let band = null;
    for (const e of document.querySelectorAll('body *')) {
      const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
      if (s.backgroundColor === YEL && b.width > 1300 && b.top < 20 && b.height > 40) {
        if (!band || b.height > band.h) band = { x: r(b.left), w: r(b.width), h: r(b.height) };
      }
    }
    const h1 = document.querySelector('h1');
    const hs = h1 && getComputedStyle(h1);
    return {
      url: location.pathname,
      band,
      title: h1 ? { text: h1.textContent.trim(), x: r(h1.getBoundingClientRect().left), size: hs.fontSize, weight: hs.fontWeight } : null,
      skeleton: skb ? { x: r(skb.left), w: r(skb.width), rows: rows.length } : null,
      rows,
      text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
      scrollW: document.documentElement.scrollWidth,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'rules-mine-oppgaver-barn-laster-1440.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT, 'laster-probe.json'), JSON.stringify(probe, null, 1));
  console.log(JSON.stringify(probe, null, 1));
  await ctx.close();
  await browser.close();
})();
