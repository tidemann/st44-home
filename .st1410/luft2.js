// ST-1410 round 2 — second pass: the band by its own class (the first probe caught the 80 px
// tab row), and where the loaded page's air under the band actually comes from.
const fs = require('fs');
const { chromium } = require('playwright');
const S = require('./shootlib');
const PORT = process.argv[2] || 4381;
const BASE = `http://localhost:${PORT}`;

const PROBE = () => {
  const r = (n) => Math.round(n * 10) / 10;
  const box = (e) => {
    if (!e) return null;
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return { tag: e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0], top: r(b.top), bottom: r(b.bottom), x: r(b.left), w: r(b.width), h: r(b.height), mt: s.marginTop, pt: s.paddingTop };
  };
  const q = (sel) => box(document.querySelector(sel));
  const band = q('.page-header--band') || q('.page-header');
  const content = document.querySelector('.page-content');
  const kids = content ? [...content.children].slice(0, 3).map(box) : [];
  // first grandchild stack inside .cols
  const col = document.querySelector('.cols .col');
  const colKids = col ? [...col.children].slice(0, 3).map(box) : [];
  return {
    band, content: box(content), kids, colKids,
    skeleton: q('.r7-skeleton'), firstSkelRow: q('.r7-skeleton i'),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 100),
  };
};

(async () => {
  const browser = await chromium.launch({ executablePath: S.EXE });
  const mk = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
    await ctx.addInitScript((t) => {
      localStorage.setItem('accessToken', t); sessionStorage.setItem('accessToken', t);
      localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
    }, S.childToken);
    return ctx;
  };
  const out = {};
  const c1 = await mk(); const p1 = await c1.newPage();
  await p1.route('**/api/**', S.api);
  await p1.goto(BASE + '/my-tasks', { waitUntil: 'domcontentloaded' });
  await S.settle(p1);
  out.loaded = await p1.evaluate(PROBE);
  await c1.close();

  const c2 = await mk(); const p2 = await c2.newPage();
  await p2.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (p === '/children/me/tasks') return;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await p2.goto(BASE + '/my-tasks', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2800);
  out.loading = await p2.evaluate(PROBE);
  await c2.close();

  const g = (b, o) => (b && o ? Math.round((o.top - b.bottom) * 10) / 10 : null);
  out.gaps = {
    loaded_band_bottom: out.loaded.band && out.loaded.band.bottom,
    loaded_firstChild: g(out.loaded.band, out.loaded.kids[0]),
    loaded_firstColKid: g(out.loaded.band, out.loaded.colKids[0]),
    loaded_secondColKid: g(out.loaded.band, out.loaded.colKids[1]),
    loading_band_bottom: out.loading.band && out.loading.band.bottom,
    loading_skeleton: g(out.loading.band, out.loading.skeleton),
  };
  fs.writeFileSync(__dirname + '/out/luft-probe.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ gaps: out.gaps, loadedColKids: out.loaded.colKids, loadedKids: out.loaded.kids, loadingSkeleton: out.loading.skeleton, bands: { loaded: out.loaded.band, loading: out.loading.band } }, null, 1));
  await browser.close();
})();
