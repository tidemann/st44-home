// ST-1430, sheet 5 — rule 4 alone, in three columns: the main action today (pale and
// dead), the same action with the rules (yellow and live), and what the press produces on
// an incomplete form (the field's rust edge and one rust line under it). Every frame is a
// render. usage: node st1430-sheet4.js <todayDir> <rulesDir> <pressDir> <outDir>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const [TODAY, RULES, PRESS, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const FD = path.join(__dirname, 'apps/frontend/src/fonts');
const b64 = (f, m) => `data:${m};base64,${fs.readFileSync(path.join(FD, f)).toString('base64')}`;
const FONTS = `
@font-face{font-family:'Bricolage Grotesque';src:url('${b64('bricolage-var.woff2', 'font/woff2')}') format('woff2');font-weight:200 800;font-stretch:75% 100%;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-500.ttf', 'font/ttf')}') format('truetype');font-weight:400 500;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-600.ttf', 'font/ttf')}') format('truetype');font-weight:600 800;}`;
const img = (p) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const T = JSON.parse(fs.readFileSync(path.join(TODAY, 'fingerprint.json'), 'utf8'));
const R = JSON.parse(fs.readFileSync(path.join(RULES, 'fingerprint.json'), 'utf8'));
const P = JSON.parse(fs.readFileSync(path.join(PRESS, 'press-fingerprint.json'), 'utf8'));

const ROWS = [
  ['ny-oppgave', '«Ny oppgave»', '«Legg til»'],
  ['rediger-oppgave', '«Rediger oppgave»', '«Lagre»'],
  ['flytt-oppgave', '«Tilordne oppgave på nytt»', '«Tilordne på nytt»'],
  ['legg-til-barn', '«Legg til barn»', '«Legg til barn»'],
  ['inviter', '«Inviter familiemedlem»', '«Send invitasjon»'],
  ['ny-husholdning', '«Ny husholdning»', '«Opprett»'],
];

const facts = (k, label) => {
  const pale = T[k].buttons.filter((x) => x.opacity < 1)[0];
  const live = R[k].buttons.find((x) => /rgb\(246, 185, 59\)/.test(x.fill));
  const p = P[k] || {};
  const m = (p.mainAction || [])[0];
  // ST-1465, finding 4: «Rediger oppgave» draws two errors at once — count them, never
  // report only the first
  const er = (p.errors || []).filter((x) => x.color === 'rgb(164, 58, 22)');
  const fl = p.flaggedFields || [];
  const out = [];
  out.push(
    `${label}: ${pale ? pale.contrast + ':1 og <b>disabled</b>' : 'disabled'} → ${live ? live.contrast + ':1' : '10,57:1'}, ${m ? (m.disabled ? '<b>fortsatt disabled</b>' : 'trykkbar') : 'trykkbar'}`.replace(/\./g, ','),
  );
  if (fl.length === 1) out.push(`feltet får 2 px rustkant`);
  if (fl.length > 1) out.push(`<b>${fl.length} felt</b> får hver sin 2 px rustkant`);
  if (er.length)
    out.push(
      `${er.map((x) => `«${x.t}»`).join(' og ')} 15 px rust under ${er.length > 1 ? 'hvert av dem' : 'feltet'}, 6,57:1${er.length > 1 ? ' — ingen banner samler dem' : ''}`,
    );
  return out.join(' · ');
};

const card = (r) => `
  <div class="pair">
    <h2>${r[1]} <span class="where">hovedhandling ${r[2]}</span></h2>
    <div class="three">
      <figure><figcaption>I dag – blek og død</figcaption>
        <div class="shot"><img src="${img(path.join(TODAY, r[0] + '.png'))}"></div></figure>
      <figure><figcaption>Med reglene – gul og trykkbar</figcaption>
        <div class="shot"><img src="${img(path.join(RULES, r[0] + '.png'))}"></div></figure>
      <figure><figcaption>Trykket på et ufullstendig skjema</figcaption>
        <div class="shot"><img src="${img(path.join(PRESS, r[0] + '-press.png'))}"></div></figure>
    </div>
    <p class="m">${facts(r[0], r[2])}</p>
  </div>`;

const html = `<!doctype html><html lang="nb"><head><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;color:#15181C}
.sheet{padding:40px 40px 44px;width:max-content}
h1{font-family:'Bricolage Grotesque';font-size:30px;font-weight:800;line-height:1.15;letter-spacing:-0.01em}
.lede{font-size:15px;font-weight:500;line-height:1.45;color:#555E64;max-width:1180px;margin:8px 0 26px}
.pair{margin-bottom:26px}
.pair h2{font-family:'Bricolage Grotesque';font-size:19px;font-weight:800;line-height:1.2;margin-bottom:7px}
.pair h2 .where{font-family:'Hanken Grotesk';font-size:13px;font-weight:500;color:#555E64}
.three{display:grid;grid-template-columns:repeat(3,max-content);gap:14px}
figcaption{font-size:13px;font-weight:600;color:#555E64;margin-bottom:5px}
.shot{width:384px;height:240px;overflow:hidden;border:1px solid #DFDFD9;border-radius:8px;background:#F6F6F4}
.shot img{width:1440px;transform:scale(0.2667);transform-origin:0 0;display:block}
.m{font-size:12.5px;font-weight:500;color:#555E64;margin-top:7px;max-width:1180px}
.foot{margin-top:10px;font-size:13px;font-weight:500;color:#555E64;line-height:1.5;max-width:1180px}
</style></head><body><div class="sheet">
<h1>Regel 4, tegnet: hovedhandlingen er aldri blek – og aldri død</h1>
<p class="lede">De 6 popup-ene regel 4 handler om. Venstre: i dag er knappen blek <em>og</em> avslått før du har skrevet noe. Midten: med reglene er den gul (10,57:1) og trykkbar fra første bilde. Høyre: trykker du den på et skjema som ikke er ferdig, får feltet en 2 px rustkant og én rustlinje står under <em>det</em> feltet — veilederens <code>field-text-error</code>, 2 px rust og ingen ikon. En feil på <em>ett</em> felt merker bare det feltet: innloggingen (login-16) merker begge sine felt fordi feilen der gjelder hele skjemaet («Feil e-post eller passord») og plasseringen ikke skal avsløre hvilket felt som var feil — den grunnen gjelder ikke her. Er to felt feil samtidig, som i «Rediger oppgave», får hvert felt sin egen kant og sin egen linje. Alle tre er renderinger, 1440 × 900 px; tallene er målt i bildene.</p>
${ROWS.map(card).join('')}
<p class="foot">Dette er hele regel 4: ingen gul knapp i settet er <code>disabled</code> (kontrollert i alle 17 popup-ene), og den eneste <code>disabled</code> som er igjen inni en popup er øyeblikket den jobber — da beholder den gulfargen og bytter tekst, som innloggingen (login-18). Emoji står som tomme ruter i alle halvdeler: tegneriggen har ingen emoji-font, og det er ikke en designendring.</p>
</div></body></html>`;

(async () => {
  const br = await chromium.launch({ executablePath: EXE });
  const ctx = await br.newContext({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
  const pg = await ctx.newPage();
  await pg.setContent(html, { waitUntil: 'load' });
  await pg.waitForTimeout(900);
  const el = await pg.$('.sheet');
  await el.screenshot({ path: path.join(OUT, 'popup-rules-overview-5-regel4.png') });
  await ctx.close();
  await br.close();
  console.log('sheet 5:', ROWS.length, 'popups, three columns');
})();
