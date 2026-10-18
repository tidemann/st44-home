// ST-1345 — desktop review of every Diddit page. Screenshots + layout fingerprint.
// usage: node st1345-shoot.js <outDir> [port]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const F = require('./st879-fixtures');

const OUT = process.argv[2];
const PORT = process.argv[3] || 4312;
const BASE = `http://localhost:${PORT}`;
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
fs.mkdirSync(OUT, { recursive: true });

const b64 = (o) =>
  Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (p) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(p)}.sig`;
const exp = Math.floor(Date.now() / 1000) + 86400;
const parentToken = jwt({
  userId: '44444444-4444-4444-8444-444444444441', email: 'kari@example.test', role: 'parent',
  firstName: 'Kari', lastName: 'Nordmann', type: 'access', exp,
});
const childToken = jwt({
  userId: '55555555-5555-4555-8555-555555555551', email: 'jonas@example.test', role: 'child',
  firstName: 'Jonas', lastName: 'Nordmann', type: 'access', exp,
});

const HH = F.HH;
// ===== ST-1409 worst case (break-ui): the longest realistic Norwegian strings, six
// children instead of three, and the empty variants of the lists. =====
const WORST = process.env.ST1409_WORST === '1';
const LONGNAME = 'Familien Tangen-Hagerup Mikkelsborg';
const LONGCHORE = 'Rydde og støvsuge hele kjelleren, inkludert boden og trappa ned';
const SIXKIDS = ['Emma-Sofie', 'Jonas', 'Mathea', 'Aleksander', 'Oline', 'Bendik-Andreas'];
const now = new Date().toISOString();
const today = new Date().toISOString().slice(0, 10);
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

const ctask = (i, name, points, done) => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${i}`, taskId: `bbbbbbbb-bbbb-4bbb-8bbb-00000000000${i}`,
  taskName: name, taskDescription: null, points, date: today,
  status: done ? 'completed' : 'pending', completedAt: done ? now : null,
});
const creward = (i, name, cost) => ({
  id: `cccccccc-cccc-4ccc-8ccc-00000000000${i}`, householdId: HH, name, description: null,
  pointsCost: cost, quantity: null, active: true, createdAt: now, updatedAt: now, available: true, canAfford: cost < 40,
});
const prog = (t, c, p) => ({ totalTasks: t, completedTasks: c, completionRate: Math.round((c / t) * 100), pointsEarned: p });

async function api(route) {
  const url = new URL(route.request().url());
  const p = url.pathname.replace(/^\/api/, '');
  // child endpoints
  if (p === '/children/me/tasks') return json(route, { tasks: [ctask(1, 'Rydde rommet', 10, false), ctask(2, 'Ta ut søpla', 5, true), ctask(3, 'Mate katten', 5, false)], totalPointsToday: 20, completedPoints: 5, childName: 'Jonas' });
  if (p === '/children/me/rewards') return json(route, { pointsBalance: 34, rewards: [creward(1, 'Kinokveld', 60), creward(2, 'Ny ball', 120), creward(3, 'Ekstra skjermtid', 30)] });
  if (p === '/children/me/analytics') return json(route, { childId: '55555555-5555-4555-8555-555555555551', childName: 'Jonas', currentStreak: 3, longestStreak: 5, weekProgress: prog(14, 9, 55), monthProgress: prog(40, 31, 180), dailyPoints: [], generatedAt: now });
  if (p === '/children/available-tasks') return json(route, { tasks: [] });
  return F.apiHandler ? F.apiHandler(route) : parentApi(route, p, url.searchParams);
}

async function parentApi(route, p, q) {
  if (p === '/households')
    return json(route, WORST
      ? [
          { id: HH, name: LONGNAME, createdAt: now, updatedAt: now, role: 'admin', memberCount: 8, childrenCount: 6, adminCount: 1 },
          { id: '11111111-1111-4111-8111-111111111112', name: 'Hytta på Geilo med besteforeldrene', createdAt: now, updatedAt: now, role: 'parent', memberCount: 5, childrenCount: 2, adminCount: 2 },
          { id: '11111111-1111-4111-8111-111111111113', name: 'Pappas hus', createdAt: now, updatedAt: now, role: 'parent', memberCount: 3, childrenCount: 1, adminCount: 1 },
        ]
      : [{ id: HH, name: 'Familien Nordmann', createdAt: now, updatedAt: now, role: 'admin', memberCount: 4, childrenCount: 3, adminCount: 1 }]);
  if (p === `/households/${HH}`) return json(route, { id: HH, name: WORST ? LONGNAME : 'Familien Nordmann', createdAt: now, updatedAt: now, role: 'admin' });
  if (p === `/households/${HH}/members`)
    return json(route, WORST
      ? [F.members[0], ...SIXKIDS.map((n, i) => ({ ...F.members[1], id: `m${i}`, userId: `22222222-2222-4222-8222-22222222222${i}`, displayName: n, firstName: n, role: 'child', tasksCompleted: i, totalTasks: 4 }))]
      : F.members);
  if (p === `/households/${HH}/children`)
    return json(route, { children: WORST
      ? SIXKIDS.map((n, i) => ({ ...F.children[0], id: `22222222-2222-4222-8222-22222222222${i}`, name: n, firstName: n, displayName: n, points: 100 * i }))
      : F.children });
  // The fixture calls it `title`; the Oppgaver template reads `name`, so «Alle oppgaver»
  // rendered as six nameless «Gjentas» rows. Same data, the field the page reads.
  if (p === `/households/${HH}/tasks`) {
    const ts = F.tasks.map((t, i) => ({ ...t, name: WORST && i % 2 ? LONGCHORE : t.name || t.title }));
    return json(route, { tasks: ts, total: ts.length });
  }
  if (p === `/households/${HH}/rewards`) return json(route, { rewards: F.rewards });
  if (p === `/households/${HH}/assignments`) {
    const date = q.get('date');
    const days = Number(q.get('days') || 1);
    const status = q.get('status');
    let all = WORST
      ? [...F.overdue, ...F.today].map((a, i) => ({ ...a, title: i % 2 ? LONGCHORE : a.title, taskName: i % 2 ? LONGCHORE : a.taskName }))
      : [...F.today, ...F.overdue, ...F.tomorrow];
    if (date) {
      const end = new Date(date);
      end.setDate(end.getDate() + days - 1);
      const last = end.toISOString().slice(0, 10);
      all = all.filter((a) => a.date >= date && a.date <= last);
    }
    if (status) all = all.filter((a) => a.status === status);
    return json(route, { assignments: all, total: all.length });
  }
  if (p === `/households/${HH}/dashboard`)
    return json(route, {
      household: { id: HH, name: 'Familien Nordmann', createdAt: now, updatedAt: now },
      weekSummary: { total: 14, completed: 6, pending: 7, overdue: 1, completionRate: 43 },
      children: F.members.filter((m) => m.role === 'child').map((m) => ({ id: m.userId, name: m.displayName, tasksCompleted: m.tasksCompleted, tasksTotal: m.totalTasks, completionRate: 50 })),
    });
  if (p.includes('/analytics')) return json(route, ANALYTICS);
  if (false)
    return json(route, {
      householdId: HH, weekProgress: prog(14, 6, 55), monthProgress: prog(40, 28, 210),
      children: F.children.map((c, i) => ({ childId: c.id, childName: c.firstName || c.displayName || `Barn ${i}`, currentStreak: 2 + i, longestStreak: 5, weekProgress: prog(8, 4 + i, 30 + 10 * i), monthProgress: prog(30, 20, 150), dailyPoints: [] })),
      daily: [], weekly: [], totals: {}, generatedAt: now,
    });
  // Belønninger hung on «Henter ønsker…» in ST-1345 because /redemptions was not mocked.
  if (WORST && p === `/households/${HH}/redemptions`) return json(route, { redemptions: [] });
  if (WORST && p === '/users/me/invitations') return json(route, { invitations: [] });
  if (p === `/households/${HH}/redemptions`)
    return json(route, { redemptions: [
      { id: 'dddddddd-dddd-4ddd-8ddd-000000000001', rewardId: 'cccccccc-cccc-4ccc-8ccc-000000000001', rewardName: 'Kinokveld', childId: '22222222-2222-4222-8222-222222222221', childName: 'Emma', pointsSpent: 60, status: 'pending', redeemedAt: new Date(Date.now() - 3600e3).toISOString(), decidedAt: null, fulfilledAt: null },
      { id: 'dddddddd-dddd-4ddd-8ddd-000000000002', rewardId: 'cccccccc-cccc-4ccc-8ccc-000000000003', rewardName: 'Ekstra skjermtid', childId: '22222222-2222-4222-8222-222222222222', childName: 'Jonas', pointsSpent: 30, status: 'approved', redeemedAt: new Date(Date.now() - 26 * 3600e3).toISOString(), decidedAt: new Date(Date.now() - 25 * 3600e3).toISOString(), fulfilledAt: null },
      { id: 'dddddddd-dddd-4ddd-8ddd-000000000003', rewardId: 'cccccccc-cccc-4ccc-8ccc-000000000002', rewardName: 'Ny ball', childId: '22222222-2222-4222-8222-222222222223', childName: 'Mathea', pointsSpent: 120, status: 'fulfilled', redeemedAt: new Date(Date.now() - 72 * 3600e3).toISOString(), decidedAt: new Date(Date.now() - 71 * 3600e3).toISOString(), fulfilledAt: new Date(Date.now() - 70 * 3600e3).toISOString() },
    ] });
  // Invitasjoner: two waiting invitations, so the page is not only its empty card.
  if (p === '/users/me/invitations')
    return json(route, { invitations: [
      { id: 'eeeeeeee-eeee-4eee-8eee-000000000001', householdId: HH, householdName: 'Familien Nordmann', inviterName: 'Kari Nordmann', inviterEmail: 'kari@example.test', role: 'parent', status: 'pending', createdAt: new Date(Date.now() - 2 * 86400e3).toISOString(), expiresAt: new Date(Date.now() + 5 * 86400e3).toISOString() },
      { id: 'eeeeeeee-eeee-4eee-8eee-000000000002', householdId: '11111111-1111-4111-8111-111111111112', householdName: 'Hytta på Geilo', inviterName: 'Per Hansen', inviterEmail: 'per@example.test', role: 'parent', status: 'pending', createdAt: new Date(Date.now() - 9 * 86400e3).toISOString(), expiresAt: new Date(Date.now() - 1 * 86400e3).toISOString() },
    ] });
  if (p === `/households/${HH}/invitations`) return json(route, { invitations: [] });
  if (p === '/push/config') return json(route, { publicKey: '', enabled: false });
  // Innstillinger draws the signed-in parent's own profile; empty fields are a mock gap.
  if (p === '/users/me' || p === '/auth/me')
    return json(route, { id: '44444444-4444-4444-8444-444444444441', email: 'kari@example.test', firstName: 'Kari', lastName: 'Nordmann', role: 'parent', createdAt: '2026-08-19T09:00:00.000Z' });
  return json(route, {});
}

const iso = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
const daily = (seed) => [...Array(7)].map((_, i) => ({ date: iso(i - 6), totalTasks: 3, completedTasks: (seed + i) % 4 > 2 ? 3 : (seed + i) % 3, completionRate: 50, pointsEarned: 5 * ((seed + i) % 4) }));
const kids = [['22222222-2222-4222-8222-222222222221', 'Emma', 340], ['22222222-2222-4222-8222-222222222222', 'Jonas', 215], ['22222222-2222-4222-8222-222222222223', 'Mathea', 180]];
// ST-1345 shot Fremgang's ERROR state because its synthetic analytics payload was rejected.
// This is the payload the page accepts (st1345-progress.js), so the picture is the real page.
const ANALYTICS = { householdId: HH, period: 'week',
  periodComparison: { current: { totalTasks: 21, completedTasks: 12, completionRate: 57, totalPoints: 735 }, previous: { totalTasks: 21, completedTasks: 9, completionRate: 43, totalPoints: 610 }, change: { completionRateDelta: 14, pointsDelta: 125, tasksDelta: 3 } },
  childrenProgress: kids.map(([id, n, p], i) => ({ childId: id, childName: n, dailyData: daily(i), totalPointsEarned: p, averageCompletionRate: 50 + 10 * i })),
  streaks: kids.map(([id, n], i) => ({ childId: id, childName: n, currentStreak: 3 - i, longestStreak: 7 - i, lastCompletionDate: iso(0) })),
  taskPopularity: [{ taskId: '33333333-3333-4333-8333-333333333301', taskName: 'Tømme oppvaskmaskin', totalAssignments: 7, completedCount: 5, completionRate: 71, averagePoints: 5 }],
  generatedAt: now };

const FINGERPRINT = () => {
  const vw = window.innerWidth;
  const r = (n) => Math.round(n * 10) / 10;
  const vis = (e) => {
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const all = [...document.querySelectorAll('body *')].filter(vis);

  // yellow band
  const YEL = 'rgb(246, 185, 59)';
  let band = null;
  for (const e of all) {
    const s = getComputedStyle(e);
    const b = e.getBoundingClientRect();
    if (s.backgroundColor === YEL && b.width > vw * 0.9 && b.top < 20 && b.height > 40) {
      if (!band || b.height > band.h) band = { x: r(b.left), w: r(b.width), y: r(b.top), h: r(b.height) };
    }
  }
  const bandBottom = band ? band.y + band.h : 0;

  // text-bearing elements below the band → the used content column
  let L = Infinity, R = -Infinity, items = 0;
  for (const e of all) {
    const b = e.getBoundingClientRect();
    if (b.top < bandBottom + 2) continue;
    if (b.width > vw * 0.98) continue;
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    const s = getComputedStyle(e);
    const painted = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
    if (!hasText && !painted) continue;
    if (b.height < 4) continue;
    L = Math.min(L, b.left); R = Math.max(R, b.right); items++;
  }

  // band content column (things inside the band)
  let bL = Infinity, bR = -Infinity;
  if (band) {
    for (const e of all) {
      const b = e.getBoundingClientRect();
      if (b.top < 0 || b.bottom > bandBottom + 2 || b.width > vw * 0.98 || b.height < 4) continue;
      const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      const s = getComputedStyle(e);
      const painted = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
      if (!hasText && !painted && e.tagName !== 'SVG' && e.tagName !== 'IMG') continue;
      bL = Math.min(bL, b.left); bR = Math.max(bR, b.right);
    }
  }

  // headings
  const heads = [...document.querySelectorAll('h1,h2,h3')].filter(vis).slice(0, 8).map((e) => {
    const s = getComputedStyle(e); const b = e.getBoundingClientRect();
    return { tag: e.tagName, text: e.textContent.trim().slice(0, 34), size: s.fontSize, weight: s.fontWeight, family: s.fontFamily.split(',')[0].replace(/"/g, ''), color: s.color, x: r(b.left), y: r(b.top) };
  });

  // buttons
  const btnMap = {};
  for (const e of [...document.querySelectorAll('button,a.btn,[class*="button"]')].filter(vis)) {
    const s = getComputedStyle(e); const b = e.getBoundingClientRect();
    if (b.height < 8) continue;
    const k = `${r(b.height)}h|${s.borderRadius.split(' ')[0]}|${s.backgroundColor}|${s.fontSize}/${s.fontWeight}`;
    btnMap[k] = (btnMap[k] || 0) + 1;
  }

  // white cards
  const cardMap = {};
  for (const e of all) {
    const s = getComputedStyle(e); const b = e.getBoundingClientRect();
    if (s.backgroundColor !== 'rgb(255, 255, 255)' || b.height < 20 || b.width < 60) continue;
    if (parseFloat(s.borderRadius) === 0 && s.boxShadow === 'none' && s.borderTopWidth === '0px') continue;
    const k = `${s.borderRadius.split(' ')[0]}|pad ${s.padding}|border ${s.borderTopWidth} ${s.borderTopColor}|shadow ${s.boxShadow === 'none' ? 'no' : 'yes'}`;
    cardMap[k] = cardMap[k] || { n: 0, w: [] };
    cardMap[k].n++; if (cardMap[k].w.length < 4) cardMap[k].w.push(r(b.width));
  }

  // font families in use on visible text
  const fonts = {};
  for (const e of all) {
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!hasText) continue;
    const s = getComputedStyle(e);
    const k = `${s.fontFamily.split(',')[0].replace(/"/g, '')} ${s.fontSize}/${s.fontWeight}`;
    fonts[k] = (fonts[k] || 0) + 1;
  }

  return {
    url: location.pathname, vw,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    band, bandContent: band && bL < Infinity ? { L: r(bL), R: r(bR), w: r(bR - bL) } : null,
    topTabs: !!document.querySelector('app-top-tabs'),
    bottomNav: !!document.querySelector('app-bottom-nav, app-child-nav') && vis(document.querySelector('app-bottom-nav, app-child-nav')),
    mobileHeader: !!document.querySelector('.mobile-header'),
    content: items ? { L: r(L), R: r(R), w: r(R - L), marginL: r(L), marginR: r(vw - R) } : null,
    scrollW: document.documentElement.scrollWidth,
    docH: document.documentElement.scrollHeight,
    heads, buttons: btnMap, cards: cardMap,
    fonts: Object.entries(fonts).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
};

const PAGES = [
  ['home', '/home', 'parent'],
  ['tasks', '/tasks', 'parent'],
  ['family', '/family', 'parent'],
  ['progress', '/progress', 'parent'],
  ['rewards', '/rewards', 'parent'],
  ['settings', '/settings', 'parent'],
  ['households', '/households', 'parent'],
  ['household-settings', '/household/settings', 'parent'],
  ['invitations', '/invitations', 'parent'],
];

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const out = {};
  for (const w of [1440]) {
    for (const [name, p, role] of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, locale: 'nb-NO' });
      const tok = role === 'parent' ? parentToken : role === 'child' ? childToken : null;
      await ctx.addInitScript((t) => {
        if (t) { localStorage.setItem('accessToken', t); sessionStorage.setItem('accessToken', t); }
        localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
      }, tok);
      const page = await ctx.newPage();
      await page.route('**/api/**', api);
      try {
        await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2600);
        await page.screenshot({ path: path.join(OUT, `${name}-${w}.png`), fullPage: true });
        out[`${name}@${w}`] = await page.evaluate(FINGERPRINT);
      } catch (e) {
        out[`${name}@${w}`] = { error: String(e).slice(0, 200) };
      }
      console.log('done', name, w, out[`${name}@${w}`].url || out[`${name}@${w}`].error);
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'fingerprint.json'), JSON.stringify(out, null, 1));
  await browser.close();
})();
