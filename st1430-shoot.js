// ST-1430 — every Diddit desktop popup, at 1440 px, plus a geometry fingerprint.
// usage: node st1430-shoot.js <outDir> [port]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const S = require('./st1409-lib');

const OUT = process.argv[2];
const PORT = process.argv[3] || 4330;
const BASE = `http://localhost:${PORT}`;
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

// Two gaps in the ST-1409 fixtures that the popups need:
// the child's own requests (the rewards list throws without them), and a second
// household (the «Bytt husstand» caret and «Forlat» only exist with one more).
const now = new Date().toISOString();
const HH2 = '11111111-1111-4111-8111-111111111112';
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const hh = (id, name, admins) => ({ id, name, createdAt: now, updatedAt: now, role: 'admin', memberCount: 4, childrenCount: 3, adminCount: admins });
const api = (extra) => async (route) => {
  const p = new URL(route.request().url()).pathname.replace(/^\/api/, '');
  if (extra && extra[p]) return json(route, extra[p]);
  if (p === '/children/me/redemptions') return json(route, { redemptions: [] });
  if (p === '/households')
    return json(route, [hh(S.HH, 'Familien Nordmann', 2), hh(HH2, 'Hytta på Geilo', 2)]);
  return S.api(route);
};

const click = (sel) => async (p) => {
  await p.locator(sel).first().click({ timeout: 8000 });
};
const seq = (...fns) => async (p) => {
  for (const f of fns) await f(p);
};
const wait = (ms) => async (p) => p.waitForTimeout(ms);

// The install sheet appears when the browser offers an install: the app listens for
// `beforeinstallprompt`. Fire the event the browser would fire.
const installable = () => async (p) => {
  await p.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    e.prompt = () => Promise.resolve();
    e.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(e);
  });
  await p.waitForTimeout(900);
};

const POPUPS = [
  // name, role, route, open steps, extra api fixtures
  ['ny-oppgave', 'parent', '/home', click('button.newtask')],
  ['bytt-husstand', 'parent', '/home', click('button.page-title-menu')],
  ['rediger-oppgave', 'parent', '/tasks', click('app-chore-row .chore-open, app-chore-row button, app-chore-row')],
  ['flytt-oppgave', 'parent', '/tasks', seq(click('button.chip:not(:has-text("Alle"))'), wait(800), click('button.rbtn:has-text("Bytt")'))],
  [
    'slett-oppgaver',
    'parent',
    '/tasks',
    seq(click('button.rbtn:has-text("Velg")'), wait(500), click('app-chore-row'), wait(400), click('button.sbtn-delete')),
  ],
  ['legg-til-barn', 'parent', '/family', click('button.poeng-primary')],
  ['barnedetaljer', 'parent', '/family', click('app-member-card:has(button.btn-qr) .member-card, app-member-card:has(button.btn-qr)')],
  ['inviter', 'parent', '/family', click('button.btn-invite')],
  ['qr-kode', 'parent', '/family', click('button.btn-qr')],
  ['slette-belonningen', 'parent', '/rewards', seq(click('button[role="tab"]:has-text("Belønninger")'), wait(900), click('button.btn-danger'))],
  ['be-om-belonning', 'child', '/my-rewards', click('app-reward-card button.rbtn')],
  ['ny-husholdning', 'parent', '/households', click('button.btn-primary')],
  ['endre-husholdning', 'parent', '/households', click('button.btn-outline:has-text("Endre")')],
  ['forlat-husholdningen', 'parent', '/households', click('button.btn-warning')],
  ['slett-husholdningen', 'parent', '/households', click('button.btn-outline.btn-danger')],
  ['varsler', 'parent', '/home', wait(1200), { '/push/config': { publicKey: 'BJ1x0K7fQ2aQf2Qe7K8n0gq3yq5wX9x1tQ2m8d4cR0pNqWvYyQ0a9zT6uH3sL5kM1jE8bF7vC2nA4oP6rS0iD1k', enabled: true } }],
  ['hjemskjerm', 'parent', '/home', installable()],
];

// Geometry of whatever popup is on screen: the surface, its edge, the action row,
// the fields, and the label contrast of the filled action. Measured, never predicted.
const FP = () => {
  const r = (n) => Math.round(n * 10) / 10;
  const lum = (c) => {
    const v = c.map((x) => {
      const s = x / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
  };
  const vis = (e) => {
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };

  const surface =
    document.querySelector('.modal[role="dialog"]') ||
    document.querySelector('[role="dialog"].sheet') ||
    document.querySelector('[role="dialog"]') ||
    document.querySelector('.popup-sheet, .offer, .prompt, .sheet');
  if (!surface) return { none: true };
  const sb = surface.getBoundingClientRect();
  const ss = getComputedStyle(surface);
  const veilEl = document.querySelector('.modal-overlay, .sheet-veil, .dialog-overlay, .modal-backdrop');
  const nav = document.querySelector('app-bottom-nav, app-child-nav, app-top-tabs');
  const navBox = nav ? nav.getBoundingClientRect() : null;
  const veil = veilEl ? getComputedStyle(veilEl).backgroundColor : null;

  const btns = [...surface.querySelectorAll('button')].filter(vis).map((e) => {
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    const bg = rgb(s.backgroundColor);
    const fg = rgb(s.color);
    const op = parseFloat(s.opacity);
    // a dimmed button paints its fill over the surface; mix it to get the painted colour
    const sfc = rgb(getComputedStyle(surface).backgroundColor);
    const mix = (c) => c.map((x, i) => Math.round(x * op + sfc[i] * (1 - op)));
    return {
      t: (e.textContent || '').trim().slice(0, 22),
      w: r(b.width), h: r(b.height), x: r(b.left - sb.left),
      radius: s.borderRadius.split(' ')[0],
      fill: s.backgroundColor, label: s.color,
      font: `${s.fontSize}/${s.fontWeight}`,
      disabled: e.disabled || e.getAttribute('aria-disabled') === 'true',
      opacity: op,
      contrast: bg.length === 3 && fg.length === 3 ? ratio(mix(fg), mix(bg)) : null,
    };
  });

  const fields = [...surface.querySelectorAll('input,select,textarea')].filter(vis).map((e) => {
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return { tag: e.tagName, type: e.type || '', h: r(b.height), w: r(b.width), radius: s.borderRadius.split(' ')[0], border: `${s.borderTopWidth} ${s.borderTopColor}`, appearance: s.appearance };
  });

  const title = surface.querySelector('h1,h2,h3');
  const ts = title ? getComputedStyle(title) : null;

  return {
    surface: { x: r(sb.left), y: r(sb.top), w: r(sb.width), h: r(sb.height), right: r(window.innerWidth - sb.right), bottom: r(window.innerHeight - sb.bottom) },
    radius: ss.borderRadius.split(' ')[0],
    border: `${ss.borderTopWidth} ${ss.borderTopColor}`,
    shadow: ss.boxShadow === 'none' ? 'none' : 'yes',
    pad: ss.padding,
    maxWidth: ss.maxWidth,
    veil,
    title: ts ? { text: (title.textContent || '').trim().slice(0, 30), size: ts.fontSize, weight: ts.fontWeight, family: ts.fontFamily.split(',')[0].replace(/"/g, '') } : null,
    scrollH: surface.scrollHeight,
    nav: navBox ? { y: Math.round(navBox.top * 10) / 10, h: Math.round(navBox.height * 10) / 10 } : null,
    buttons: btns,
    fields,
    natives: fields.filter((f) => f.tag === 'SELECT').length,
  };
};

(async () => {
  const out = {};
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [name, role, route, open, extra] of POPUPS) {
    if (only && !only.includes(name)) continue;
    const browser = await chromium.launch({ executablePath: EXE });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
    await ctx.addInitScript((t) => {
      localStorage.setItem('accessToken', t);
      sessionStorage.setItem('accessToken', t);
      localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
    }, role === 'child' ? S.childToken : S.parentToken);
    const page = await ctx.newPage();
    await page.route('**/api/**', api(extra));
    let err = null;
    const deadline = new Promise((_, rej) => setTimeout(() => rej(new Error('popup timeout 70s')), 70000));
    try {
      await Promise.race([deadline, (async () => {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await S.settle(page);
      await open(page);
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      out[name] = await page.evaluate(FP);
      })()]);
    } catch (e) {
      err = String(e).split('\n')[0].slice(0, 160);
      try {
        await page.screenshot({ path: path.join(OUT, `${name}-FAIL.png`) });
      } catch (e2) {}
      out[name] = { error: err };
    }
    console.log(name.padEnd(22), err ? 'FAIL ' + err : out[name].none ? 'NO POPUP' : `w=${out[name].surface.w} x=${out[name].surface.x} btns=${out[name].buttons.length}`);
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  const prev = fs.existsSync(path.join(OUT, 'fingerprint.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'fingerprint.json'), 'utf8')) : {};
  fs.writeFileSync(path.join(OUT, 'fingerprint.json'), JSON.stringify({ ...prev, ...out }, null, 1));
})();
