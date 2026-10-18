// ST-1430 rule 4, the state the rule is about: the main action pressed on a form that is
// not complete. The button keeps its yellow, the field takes the rust edge, and the error
// line stands under that field — the approved login's pattern (login-16).
// usage: LD_LIBRARY_PATH=… node st1430-press.js <outDir> [port]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const S = require('./st1409-lib');

const OUT = process.argv[2];
const PORT = process.argv[3] || 4330;
const BASE = `http://localhost:${PORT}`;
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

const now = new Date().toISOString();
const HH2 = '11111111-1111-4111-8111-111111111112';
const hh = (id, name, admins) => ({ id, name, createdAt: now, updatedAt: now, role: 'admin', memberCount: 4, childrenCount: 3, adminCount: admins });
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const api = async (route) => {
  const p = new URL(route.request().url()).pathname.replace(/^\/api/, '');
  if (p === '/children/me/redemptions') return json(route, { redemptions: [] });
  if (p === '/households') return json(route, [hh(S.HH, 'Familien Nordmann', 2), hh(HH2, 'Hytta på Geilo', 2)]);
  return S.api(route);
};

const click = (sel) => async (p) => p.locator(sel).first().click({ timeout: 8000 });
const seq = (...fns) => async (p) => { for (const f of fns) await f(p); };
const wait = (ms) => async (p) => p.waitForTimeout(ms);
const clear = (sel) => async (p) => p.locator(sel).first().fill('');

// name, role, route, how the popup opens, how the main action is pressed on an incomplete form
const CASES = [
  ['ny-oppgave', 'parent', '/home', click('button.newtask'), click('.modal button[type="submit"]')],
  [
    'rediger-oppgave', 'parent', '/tasks',
    click('app-chore-row .chore-open, app-chore-row button, app-chore-row'),
    seq(clear('.modal input#task-name'), click('.modal button[type="submit"]')),
  ],
  [
    'flytt-oppgave', 'parent', '/tasks',
    seq(click('button.chip:not(:has-text("Alle"))'), wait(800), click('button.rbtn:has-text("Bytt")')),
    click('.modal button.btn-primary'),
  ],
  ['legg-til-barn', 'parent', '/family', click('button.poeng-primary'), click('.modal button[type="submit"]')],
  ['inviter', 'parent', '/family', click('button.btn-invite'), click('.modal button[type="submit"]')],
  ['ny-husholdning', 'parent', '/households', click('button.btn-primary'), click('.modal button[type="submit"]')],
];

// What the press produced: the error line, the field it belongs to, and the action's own box.
const FP = () => {
  const r = (n) => Math.round(n * 10) / 10;
  const surface = document.querySelector('.modal[role="dialog"]') || document.querySelector('[role="dialog"]');
  if (!surface) return { none: true };
  const sb = surface.getBoundingClientRect();
  const errs = [...surface.querySelectorAll('.form-error, .error-message, [role="alert"]')]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .map((e) => {
      const b = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return { t: (e.textContent || '').trim().slice(0, 50), y: r(b.top - sb.top), x: r(b.left - sb.left), h: r(b.height), color: s.color, size: `${s.fontSize}/${s.fontWeight}` };
    });
  const flagged = [...surface.querySelectorAll('[aria-invalid="true"], input.error, select.error, textarea.error')].map((e) => {
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return { tag: e.tagName, id: e.id, y: r(b.top - sb.top), h: r(b.height), border: `${s.borderTopWidth} ${s.borderTopColor}` };
  });
  const main = [...surface.querySelectorAll('button')]
    .filter((e) => /rgb\(246, 185, 59\)/.test(getComputedStyle(e).backgroundColor))
    .map((e) => {
      const b = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return { t: (e.textContent || '').trim().slice(0, 22), w: r(b.width), h: r(b.height), x: r(b.left), y: r(b.top), fill: s.backgroundColor, label: s.color, disabled: e.disabled, cursor: s.cursor };
    });
  return { surface: { x: r(sb.left), y: r(sb.top), w: r(sb.width), h: r(sb.height) }, errors: errs, flaggedFields: flagged, mainAction: main };
};

(async () => {
  const out = {};
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [name, role, route, open, press] of CASES) {
    if (only && !only.includes(name)) continue;
    const browser = await chromium.launch({ executablePath: EXE });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
    await ctx.addInitScript((t) => {
      localStorage.setItem('accessToken', t);
      sessionStorage.setItem('accessToken', t);
      localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
    }, role === 'child' ? S.childToken : S.parentToken);
    const page = await ctx.newPage();
    await page.route('**/api/**', api);
    let err = null;
    try {
      await Promise.race([
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 70s')), 70000)),
        (async () => {
          await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
          await S.settle(page);
          await open(page);
          await page.waitForTimeout(800);
          await press(page);
          // the pointer must leave the button: a click leaves it hovering, and the hover
          // shade (#DBA434) is not the fill the rule is about (#F6B93B)
          await page.mouse.move(20, 880);
          await page.waitForTimeout(700);
          await page.screenshot({ path: path.join(OUT, `${name}-press.png`) });
          out[name] = await page.evaluate(FP);
        })(),
      ]);
    } catch (e) {
      err = String(e).split('\n')[0].slice(0, 160);
      out[name] = { error: err };
    }
    const o = out[name];
    console.log(name.padEnd(18), err ? 'FAIL ' + err : `errors=${(o.errors || []).length} flagged=${(o.flaggedFields || []).length} main=${(o.mainAction || []).map((m) => m.t + (m.disabled ? ' DISABLED' : '')).join(',')}`);
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  fs.writeFileSync(path.join(OUT, 'press-fingerprint.json'), JSON.stringify(out, null, 1));
})();
