const { chromium } = require('playwright');
const S = require('./st1409-lib');
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'nb-NO' });
  await ctx.addInitScript((t) => {
    localStorage.setItem('accessToken', t);
    localStorage.setItem('activeHouseholdId', '11111111-1111-4111-8111-111111111111');
  }, S.parentToken);
  const p = await ctx.newPage();
  await p.route('**/api/**', S.api);
  await p.goto('http://localhost:4330/home', { waitUntil: 'domcontentloaded' });
  await S.settle(p);
  await p.click('button.newtask');
  await p.waitForTimeout(800);
  console.log(
    JSON.stringify(
      await p.evaluate(() => {
        const row = document.querySelector('.modal .modal-actions, .modal .modal-actions-right');
        const rs = getComputedStyle(row);
        return {
          row: { cls: row.className, w: row.getBoundingClientRect().width, display: rs.display, gap: rs.gap, pad: rs.padding, children: row.children.length },
          kids: [...row.children].map((e) => {
            const s = getComputedStyle(e);
            return { t: e.textContent.trim().slice(0, 12), w: e.getBoundingClientRect().width, flex: `${s.flexGrow} ${s.flexShrink} ${s.flexBasis}`, pad: s.padding, border: s.borderWidth, box: s.boxSizing, ml: s.marginLeft, mr: s.marginRight };
          }),
        };
      }),
      null,
      1,
    ),
  );
  await b.close();
})();
