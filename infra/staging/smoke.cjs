// Diddit staging smoke run (ST-1357): the path Stig wants to test, from an empty
// database. Run by deploy-staging.yml with `-f smoke=true`.
//
//   register a parent (form) -> log in (form) -> family -> add a child and a task
//   -> give the child a login -> log in as the child (form)
//
// It goes through the public address and the gate (BASE), with the one-off gate
// login the workflow makes (SMOKE_PASS); Stig's password is his alone. A screenshot
// of every step goes to OUT, uploaded as the run's artifact. Leaves its test family
// in staging; a reset removes it.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'https://home-staging.st44.no';
const OUT = process.env.OUT || 'smoke-out';
fs.mkdirSync(OUT, { recursive: true });

const stamp = Date.now().toString(36);
const parent = { first: 'Kari', last: 'Staging', email: `kari.${stamp}@staging.invalid` };
const child = { name: 'Emma', email: `emma.${stamp}@staging.invalid` };
const password = `Diddit-${stamp}-Test1`;
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Oslo' });

let n = 0;
async function shot(page, name) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.mouse.move(1, 1);
  const file = `${String(++n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  console.log(`shot ${file} at ${page.url().replace(BASE, '')}`);
}

// fetch inside the logged-in page, with the app's own token.
async function api(page, method, url, body) {
  const r = await page.evaluate(
    async ({ method, url, body }) => {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      return { status: res.status, text: await res.text() };
    },
    { method, url, body },
  );
  console.log(`${method} ${url} -> ${r.status}`);
  if (r.status >= 300) throw new Error(`${method} ${url}: ${r.status} ${r.text.slice(0, 300)}`);
  return JSON.parse(r.text || '{}');
}

(async () => {
  const browser = await chromium.launch();
  const ctx = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'nb-NO',
    timezoneId: 'Europe/Oslo',
    serviceWorkers: 'block',
    httpCredentials: { username: 'smoke', password: process.env.SMOKE_PASS || '' },
  };
  try {
    // 1. Register a new parent with the form.
    const pc = await browser.newContext(ctx);
    const p = await pc.newPage();
    await p.goto(`${BASE}/no/register`);
    await p.fill('#firstName', parent.first);
    await p.fill('#lastName', parent.last);
    await p.fill('#email', parent.email);
    await p.fill('#password', password);
    await p.fill('#confirmPassword', password);
    await shot(p, 'register-form');
    await p.click('button[type=submit]');
    await p.waitForURL(/\/login/, { timeout: 20000 });
    await shot(p, 'registered-login-page');

    // 2. Log in as that parent with the form.
    await p.fill('#email', parent.email);
    await p.fill('#password', password);
    await p.click('button[type=submit]');
    await p.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 20000 });
    if (/household\/create/.test(p.url())) {
      await shot(p, 'create-family-form');
      await p.locator('input[type=text]').first().fill(`Familien ${parent.last}`);
      await p.click('button[type=submit]');
      await p.waitForURL((u) => !/household\/create/.test(u.pathname), { timeout: 20000 });
    }
    await shot(p, 'parent-home');

    // 3. The family the sign-up made; add a child, a child login and a task.
    const households = await api(p, 'GET', '/api/households');
    const list = Array.isArray(households)
      ? households
      : households.households || households.data || [];
    const hid = list[0] && list[0].id;
    if (!hid)
      throw new Error(`no household after sign-up: ${JSON.stringify(households).slice(0, 300)}`);
    console.log(`household ${list[0].name}`);
    const kid = await api(p, 'POST', `/api/households/${hid}/children`, {
      name: child.name,
      birthYear: 2016,
    });
    const kidId = kid.id || (kid.child && kid.child.id);
    await api(p, 'POST', `/api/households/${hid}/children/${kidId}/create-account`, {
      email: child.email,
      password,
    });
    const task = await api(p, 'POST', `/api/households/${hid}/tasks`, {
      name: 'Rydde rommet',
      points: 10,
      ruleType: 'daily',
    });
    await api(p, 'POST', '/api/assignments/manual', {
      taskId: task.id || (task.task && task.task.id),
      childId: kidId,
      date: today,
    });
    await p.goto(`${BASE}/no/family`);
    await shot(p, 'family-with-child');
    await p.goto(`${BASE}/no/tasks`);
    await shot(p, 'tasks-with-task');
    await pc.close();

    // 4. Log in as the child with the child form.
    const cc = await browser.newContext(ctx);
    const c = await cc.newPage();
    await c.goto(`${BASE}/no/child-login`);
    await c.fill('#email', child.email);
    await c.fill('#password', password);
    await shot(c, 'child-login-form');
    await c.click('button[type=submit]');
    await c.waitForURL((u) => !/login/.test(u.pathname), { timeout: 20000 });
    await c.getByText('Rydde rommet').first().waitFor({ timeout: 15000 });
    await shot(c, 'child-home-with-task');
    await cc.close();
    console.log(`smoke: ok (parent ${parent.email}, child ${child.email})`);
  } catch (e) {
    for (const pg of browser.contexts().flatMap((x) => x.pages())) {
      await pg
        .screenshot({ path: path.join(OUT, `failed-${++n}.png`), fullPage: true })
        .catch(() => {});
    }
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(`smoke: FAILED: ${e.stack || e}`);
  process.exit(1);
});
