// ST-1410 — the worst case: long names, empty lists, and the error states the rules moved
// (rule 6 puts the check on the press, so the error line is part of the picture now).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const S = require('./shootlib.js');
const OUT = process.env.ST1410_OUT;
fs.mkdirSync(OUT, { recursive: true });
const LONG = 'Rydde rommet, brette klærne og sette fram sekken til i morgen tidlig';
const today = new Date().toISOString().slice(0, 10);
const now = new Date().toISOString();

// the same mocked family, pushed to its edges
function worstApi(route) {
  const url = new URL(route.request().url());
  const p = url.pathname.replace(/^\/api/, '');
  const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (p === '/children/me/tasks')
    return json({ tasks: [...Array(6)].map((_, i) => ({ id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${i}`, taskId: `bbbbbbbb-bbbb-4bbb-8bbb-00000000000${i}`, taskName: LONG, taskDescription: null, points: 10, date: today, status: i % 3 === 0 ? 'completed' : 'pending', completedAt: i % 3 === 0 ? now : null })), totalPointsToday: 60, completedPoints: 20, childName: 'Jonas-Emilian Tangen-Hagerup' });
  if (p === '/children/me/rewards') return json({ pointsBalance: 1480, rewards: [] });
  if (p === '/children/me/redemptions') return json({ redemptions: [] });
  return S.api(route);
}

const CASES = [
  ['worst-mine-oppgaver-barn', '/my-tasks', 'child', null],
  ['worst-belonninger-barn', '/my-rewards', 'child', null],
  ['worst-ny-husstand', '/household/create', 'parent', async (page) => {
    await page.fill('#family-name', 'Familien Tangen-Hagerup Mikkelsborg-Lysaker');
  }],
  ['worst-barnas-innlogging', '/child-login', null, async (page) => {
    await page.click('button[type=submit]'); // rule 6: the press is what checks the form
    await page.waitForTimeout(400);
  }],
  ['worst-glemt-passord', '/forgot-password', null, async (page) => {
    await page.click('button[type=submit]');
    await page.waitForTimeout(400);
  }],
  ['worst-sett-nytt-passord', '/reset-password?token=demo-reset-token', null, async (page) => {
    await page.fill('#newPassword', 'kort');
    await page.fill('#confirmPassword', 'noe-annet-helt');
    await page.click('button[type=submit]');
    await page.waitForTimeout(400);
  }],
];

(async () => {
  const browser = await chromium.launch({ executablePath: S.EXE });
  const out = {};
  for (const [name, p, role, act] of CASES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
    await ctx.addInitScript((t) => { if (t) { localStorage.setItem('accessToken', t); sessionStorage.setItem('accessToken', t); } localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111'); }, role === 'child' ? S.childToken : role === 'parent' ? S.parentToken : null);
    const page = await ctx.newPage();
    await page.route('**/api/**', worstApi);
    await page.goto('http://localhost:4472' + p, { waitUntil: 'domcontentloaded' });
    await S.settle(page);
    if (act) await act(page);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
    out[name] = await page.evaluate(() => {
      const r = (n) => Math.round(n * 10) / 10;
      const band = document.querySelector('.page-header--band');
      const h1 = document.querySelector('h1');
      const hb = h1 && h1.getBoundingClientRect();
      const cols = [...document.querySelectorAll('.r4-cols > *, .cols > .col, .r4-form')].map((e) => { const b = e.getBoundingClientRect(); return [r(b.left), r(b.width)]; });
      return { scrollW: document.documentElement.scrollWidth, band: band ? r(band.getBoundingClientRect().height) : null, title: h1 ? { x: r(hb.left), h: r(hb.height), size: getComputedStyle(h1).fontSize, weight: getComputedStyle(h1).fontWeight } : null, cols };
    });
    console.log(name.padEnd(28), JSON.stringify(out[name]));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'worst.json'), JSON.stringify(out, null, 1));
  await browser.close();
})();
