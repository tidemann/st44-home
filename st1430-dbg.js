const { chromium } = require('playwright');
const S = require('./st1409-lib');
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'nb-NO' });
  await ctx.addInitScript((t) => {
    localStorage.setItem('accessToken', t);
    sessionStorage.setItem('accessToken', t);
    localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
  }, S.childToken);
  const p = await ctx.newPage();
  p.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
  p.on('requestfinished', async (r) => {
    if (r.url().includes('/api/')) console.log('[req]', r.url().replace(/^.*\/api/, '/api'), (await r.response()).status());
  });
  await p.route('**/api/**', S.api);
  await p.goto('http://localhost:4330/my-rewards', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  console.log('cards:', await p.locator('app-reward-card').count(), 'rbtn:', await p.locator('app-reward-card button').count());
  await b.close();
})();
