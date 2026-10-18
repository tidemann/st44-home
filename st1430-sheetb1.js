// ST-1430 — the one decision inside step 2 that is not mine: does «Bytt husstand» block?
// Three renders at 1440 × 900: today, and rule 7's dialog drawn both ways.
// usage: node st1430-sheetb1.js <todayDir> <b1Dir> <outDir>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const [TODAY, B1, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const FD = path.join(__dirname, 'apps/frontend/src/fonts');
const b64 = (f, m) => `data:${m};base64,${fs.readFileSync(path.join(FD, f)).toString('base64')}`;
const FONTS = `
@font-face{font-family:'Bricolage Grotesque';src:url('${b64('bricolage-var.woff2', 'font/woff2')}') format('woff2');font-weight:200 800;font-stretch:75% 100%;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-500.ttf', 'font/ttf')}') format('truetype');font-weight:400 500;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-600.ttf', 'font/ttf')}') format('truetype');font-weight:600 800;}`;
const img = (p) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const F = JSON.parse(fs.readFileSync(path.join(B1, 'b1-fingerprint.json'), 'utf8'));
const A = F['bytt-husstand-A-blokkerer'];
const B = F['bytt-husstand-B-kan-overses'];
// ST-1465, nit 3: one notation on a card that goes to Stig — the fingerprint's CSS rgb()
// becomes the hex the guide and the other sheets use
const hex = (s) => {
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m
    ? '#' +
        m
          .slice(1, 4)
          .map((n) => Number(n).toString(16).padStart(2, '0').toUpperCase())
          .join('')
    : s;
};

const html = `<!doctype html><html lang="nb"><head><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;color:#15181C}
.sheet{padding:40px 40px 44px;width:max-content}
h1{font-family:'Bricolage Grotesque';font-size:30px;font-weight:800;line-height:1.15;letter-spacing:-0.01em}
.lede{font-size:15px;font-weight:500;line-height:1.45;color:#555E64;max-width:1240px;margin:8px 0 26px}
.three{display:grid;grid-template-columns:repeat(3,max-content);gap:18px}
figcaption{font-family:'Bricolage Grotesque';font-size:17px;font-weight:800;margin-bottom:6px}
.sub{font-family:'Hanken Grotesk';font-size:13px;font-weight:500;color:#555E64;margin-bottom:6px}
.shot{width:410px;height:256px;overflow:hidden;border:1px solid #DFDFD9;border-radius:8px;background:#F6F6F4}
.shot img{width:1440px;transform:scale(0.2847);transform-origin:0 0;display:block}
.m{font-size:12.5px;font-weight:500;color:#555E64;margin-top:8px;width:410px;line-height:1.45}
.foot{margin-top:26px;font-size:13.5px;font-weight:500;color:#15181C;line-height:1.55;max-width:1240px}
.foot b{font-weight:800}
</style></head><body><div class="sheet">
<h1>«Bytt husstand»: det ene valget i steg 2 som ikke er mitt</h1>
<p class="lede">Regel 7 avgjør <em>formen</em>: på skjerm er en popup en midtstilt dialog på 428 px med 13 px hjørner, ikke et ark limt til bunnkanten. Det er ikke spørsmålet her. Spørsmålet er om denne popup-en <em>blokkerer</em>. Den godkjente Popups-delen (ST-880) fører «nedtrekket for husstand» i kolonnen du kan overse — grå kant, ingen slør — mens appen i dag allerede maler det 30 % blekksløret. De to høyre bildene er samme render med den ene forskjellen.</p>
<div class="three">
  <figure><figcaption>I dag</figcaption><div class="sub">ark fra bunnkanten, 440 px, 20 px hjørner, ingen kant — og sløret er malt</div>
    <div class="shot"><img src="${img(path.join(TODAY, 'bytt-husstand.png'))}"></div>
    <p class="m">Hverken form eller kant følger noen regel i dag.</p></figure>
  <figure><figcaption>A — den blokkerer</figcaption><div class="sub">blekkant ${hex(A.border.split(' ').slice(1).join(' '))}, 30 % slør</div>
    <div class="shot"><img src="${img(path.join(B1, 'bytt-husstand-A-blokkerer.png'))}"></div>
    <p class="m">${A.surface.w} × ${A.surface.h} px på x ${A.surface.x}, ${A.radius} hjørner, slør ${hex(A.veil)} 30 %. Dette er det bildene i kortet viser nå — og det er det appen gjør i dag.</p></figure>
  <figure><figcaption>B — du kan overse den</figcaption><div class="sub">grå kant #555E64, ingen slør</div>
    <div class="shot"><img src="${img(path.join(B1, 'bytt-husstand-B-kan-overses.png'))}"></div>
    <p class="m">${B.surface.w} × ${B.surface.h} px på x ${B.surface.x}, ${B.radius} hjørner, ingen slør. Dette er den godkjente Popups-delen tatt på ordet.</p></figure>
</div>
<p class="foot"><b>Idas anbefaling: A.</b> «Bytt husstand» bytter aktiv husstand for hele appen, dekker siden og tar fokus — den oppfører seg som en dialog, og appen maler alt sløret i dag. Linjen i den godkjente tabellen ble skrevet om et <em>nedtrekk</em> ved navnet; det koden åpner er et helt ark. Velges A, får den godkjente tabellen én ny linje som flytter husstandsvalget til blokkerende. Velges B, rendres høyrehalvdelen på nytt med grå kant og uten slør — formen (midtstilt dialog på 428 px) er den samme uansett — og reglene sier nå det samme: regel 7 avgjør formen uten å spørre om svaret, og hjørnet nede til høyre i regel 8 er bare de to tilbudene, så et B-svar flytter ikke husstandsvelgeren dit. <b>Dette er Stigs valg, ikke mitt.</b></p>
</div></body></html>`;

(async () => {
  const br = await chromium.launch({ executablePath: EXE });
  const ctx = await br.newContext({ viewport: { width: 1340, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
  const pg = await ctx.newPage();
  await pg.setContent(html, { waitUntil: 'load' });
  await pg.waitForTimeout(900);
  const el = await pg.$('.sheet');
  await el.screenshot({ path: path.join(OUT, 'popup-rules-B1-bytt-husstand.png') });
  await ctx.close();
  await br.close();
  console.log('B1 sheet written');
})();
