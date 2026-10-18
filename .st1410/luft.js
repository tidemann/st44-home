// ST-1410 round 2 (Astrid): the placeholder rows sit flush against the yellow band (0 px),
// where today's spinner has 58.5 px and the loaded page has its own air. This measures the
// boxes — not the ink — on both states of /my-tasks, so the number I draw is the page's own.
// usage: node .st1410/luft.js <port>
const { chromium } = require('playwright');
const S = require('./shootlib');

const PORT = process.argv[2] || 4381;
const BASE = `http://localhost:${PORT}`;

const PROBE = () => {
  const r = (n) => Math.round(n * 10) / 10;
  const box = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return { top: r(b.top), bottom: r(b.bottom), x: r(b.left), w: r(b.width), h: r(b.height), mt: s.marginTop, pt: s.paddingTop };
  };
  const YEL = 'rgb(246, 185, 59)';
  let band = null;
  for (const e of document.querySelectorAll('body *')) {
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    if (s.backgroundColor === YEL && b.width > 1300 && b.top < 20 && b.height > 40) {
      if (!band || b.height > band.h) band = { top: r(b.top), bottom: r(b.bottom), h: r(b.height) };
    }
  }
  return {
    band,
    pageContent: box('.page-content'),
    cols: box('.cols'),
    firstLabel: box('app-group-label'),
    firstRow: box('app-chore-row'),
    skeleton: box('.r7-skeleton'),
    firstSkelRow: box('.r7-skeleton i'),
    emptyCard: box('.r7-card'),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
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

  // 1. loaded — the page's own air under the band
  const c1 = await mk();
  const p1 = await c1.newPage();
  await p1.route('**/api/**', S.api);
  await p1.goto(BASE + '/my-tasks', { waitUntil: 'domcontentloaded' });
  await S.settle(p1);
  const loaded = await p1.evaluate(PROBE);
  await c1.close();

  // 2. loading — the state rule 7 is about
  const c2 = await mk();
  const p2 = await c2.newPage();
  await p2.route('**/api/**', (route) => {
    const p = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (p === '/children/me/tasks') return; // held open on purpose
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await p2.goto(BASE + '/my-tasks', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2800);
  const loading = await p2.evaluate(PROBE);
  await c2.close();

  const gap = (b, o) => (b && o ? Math.round((o.top - b.bottom) * 10) / 10 : null);
  console.log(JSON.stringify({
    loaded,
    loading,
    gaps: {
      loadedContent: gap(loaded.band, loaded.pageContent),
      loadedCols: gap(loaded.band, loaded.cols),
      loadedLabel: gap(loaded.band, loaded.firstLabel),
      loadedRow: gap(loaded.band, loaded.firstRow),
      loadingContent: gap(loading.band, loading.pageContent),
      loadingSkeleton: gap(loading.band, loading.skeleton),
    },
  }, null, 1));
  await browser.close();
})();
