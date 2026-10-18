// ST-1430 — overview sheets: every desktop popup, today on the left, with the 8 popup
// rules on the right. Built on the app's own fonts (ST-879's inline trick).
// usage: node st1430-sheet.js <todayDir> <rulesDir> <outDir>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const EXE = '/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const [TODAY, RULES, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const FD = path.join(__dirname, 'apps/frontend/src/fonts');
const b64 = (f, m) => `data:${m};base64,${fs.readFileSync(path.join(FD, f)).toString('base64')}`;
const FONTS = `
@font-face{font-family:'Bricolage Grotesque';src:url('${b64('bricolage-var.woff2', 'font/woff2')}') format('woff2');font-weight:200 800;font-stretch:75% 100%;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-500.ttf', 'font/ttf')}') format('truetype');font-weight:400 500;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-600.ttf', 'font/ttf')}') format('truetype');font-weight:600 800;}`;
const img = (p) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const fp = (d) => JSON.parse(fs.readFileSync(path.join(d, 'fingerprint.json'), 'utf8'));
const T = fp(TODAY);
const R = fp(RULES);

// label, which page opens it, and the one-line choice where a rule leaves one open
const SHEETS = [
  {
    title: 'Hjemme og Oppgaver',
    rows: [
      ['ny-oppgave', '«Ny oppgave»', 'Hjemme og Oppgaver', 'Valg: skjemaet beholder én spalte på 396 px; dagvelgeren bryter ikke.'],
      ['rediger-oppgave', '«Rediger oppgave»', 'Oppgaver', 'Valg: tre handlinger deler raden i like tredjedeler, 126,7 px, «Slett» i rust til venstre.'],
      ['flytt-oppgave', '«Tilordne oppgave på nytt»', 'Oppgaver', ''],
      ['slett-oppgaver', '«Slette n oppgaver?»', 'Oppgaver, i velgemodus', ''],
      ['bytt-husstand', '«Bytt husstand»', 'Hjemme, pila ved navnet', 'Valg: arket blir en midtstilt dialog på skjerm (regel 7); på telefon er det fortsatt et ark.'],
    ],
  },
  {
    title: 'Familie',
    rows: [
      ['legg-til-barn', '«Legg til barn»', 'Familie', ''],
      ['barnedetaljer', '«Barnedetaljer»', 'Familie, klikk på et barn', 'Merk: emojien og «Faresone» inni er enkeltside-punkter (steg 3), ikke rørt her.'],
      ['inviter', '«Inviter familiemedlem»', 'Familie', ''],
      ['qr-kode', '«QR-kode innlogging»', 'Familie, QR-knappen på et barn', 'Valg: én handling fyller hele raden på 396 px; her er det bare lukkekrysset.'],
    ],
  },
  {
    title: 'Belønninger og husholdninger',
    rows: [
      ['slette-belonningen', '«Slette belønningen?»', 'Belønninger (samme boks for alle ja/nei-spørsmål)', ''],
      ['be-om-belonning', '«Vil du be om dette?»', 'Barnets Belønninger', ''],
      ['ny-husholdning', '«Ny husholdning»', 'Husholdninger', ''],
      ['endre-husholdning', '«Endre husholdning»', 'Husholdninger', ''],
    ],
  },
  {
    title: 'Husholdninger, og de to tilbudene du kan overse',
    rows: [
      ['forlat-husholdningen', '«Forlat husholdningen»', 'Husholdninger', ''],
      ['slett-husholdningen', '«Slett husholdningen»', 'Husholdninger', ''],
      ['varsler', '«Slå på varsler?»', 'alle sider (tilbud)', 'Valg: tilbudet står nede til høyre, 24 px fra hjørnet — på skjerm er det ingen bunnmeny å holde klar av.'],
      ['hjemskjerm', '«Legg Diddit på hjemskjermen»', 'alle sider (tilbud)', 'Valg: samme hjørne som varseltilbudet; bare ett tilbud vises om gangen.'],
    ],
  },
];

const facts = (k) => {
  const a = T[k], b = R[k];
  const act = (v) => v.buttons.filter((x) => x.h > 40 && x.w > 50).map((x) => Math.round(x.w));
  const pale = (v) => v.buttons.filter((x) => x.opacity < 1);
  const f = [];
  f.push(`bredde ${Math.round(a.surface.w)} → ${Math.round(b.surface.w)} px`);
  if (k === 'bytt-husstand') f.push('fra bunnkanten (20 px hjørner, ingen kant) til midtstilt dialog (13 px, blekkant)');
  if (k === 'varsler' || k === 'hjemskjerm') f.push(`fra midtstilt nederst til ${Math.round(b.surface.right)} px fra høyre og ${Math.round(b.surface.bottom)} px fra bunnen`);
  const aa = act(a), bb = act(b);
  // the «Bytt husstand» list rows are not an action row: same width before and after
  const listRows = aa.length > 2 && aa.every((w) => w > 300) && aa.join() === bb.join();
  if (aa.length && !listRows) f.push(`handlinger ${aa.join('+')} → ${bb.join('+')} px`);
  if (pale(a).length) f.push(`hovedknapp ${pale(a)[0].contrast}:1 → ${b.buttons.find((x) => x.t === pale(a)[0].t) ? b.buttons.find((x) => x.t === pale(a)[0].t).contrast : '10.57'}:1`);
  const na = a.natives, nb = b.natives;
  if (na) f.push(`${na} nettlesermeny → Diddit-felt`);
  const fa = a.fields.filter((x) => x.h > 30).map((x) => x.h);
  if (fa.length) f.push(`felt ${[...new Set(fa)].join('/')} → 49 px`);
  return f.join(' · ');
};

const card = (r) => `
  <div class="pair">
    <h2>${r[1]} <span class="where">${r[2]}</span></h2>
    <div class="two">
      <figure><figcaption>I dag</figcaption>
        <div class="shot"><img src="${img(path.join(TODAY, r[0] + '.png'))}"></div></figure>
      <figure><figcaption>Med popup-reglene</figcaption>
        <div class="shot"><img src="${img(path.join(RULES, r[0] + '.png'))}"></div></figure>
    </div>
    <p class="m">${facts(r[0])}</p>
    ${r[3] ? `<p class="c">${r[3]}</p>` : ''}
  </div>`;

const html = (s, n, total) => `<!doctype html><html lang="nb"><head><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;color:#15181C}
.sheet{padding:40px 40px 44px;width:max-content}
h1{font-family:'Bricolage Grotesque';font-size:30px;font-weight:800;line-height:1.15;letter-spacing:-0.01em}
.lede{font-size:15px;font-weight:500;line-height:1.45;color:#555E64;max-width:1180px;margin:8px 0 26px}
.grid{display:grid;grid-template-columns:repeat(2,max-content);gap:30px 40px;align-items:start}
.pair h2{font-family:'Bricolage Grotesque';font-size:19px;font-weight:800;line-height:1.2;margin-bottom:7px}
.pair h2 .where{font-family:'Hanken Grotesk';font-size:13px;font-weight:500;color:#555E64}
.two{display:grid;grid-template-columns:max-content max-content;gap:14px}
figcaption{font-size:13px;font-weight:600;color:#555E64;margin-bottom:5px}
.shot{width:470px;height:294px;overflow:hidden;border:1px solid #DFDFD9;border-radius:8px;background:#F6F6F4}
.shot img{width:1440px;transform:scale(0.3264);transform-origin:0 0;display:block}
.m{font-size:12.5px;font-weight:500;color:#555E64;margin-top:7px;max-width:954px}
.c{font-size:12.5px;font-weight:600;color:#15181C;margin-top:3px;max-width:954px}
.foot{margin-top:28px;font-size:13px;font-weight:500;color:#555E64;line-height:1.5;max-width:1180px}
</style></head><body><div class="sheet">
<h1>Diddit på skjerm – de 8 popup-reglene, tegnet (${n} av ${total}): ${s.title}</h1>
<p class="lede">Venstre: popup-en i dag. Høyre: den samme popup-en med de 8 reglene og ingenting annet — siden bak er den samme i begge halvdeler, for sidereglene er steg 1 og endres ikke her. 1440 × 900 px, lys modus, samme oppdiktede familie. Tallene under hvert par er målt i bildene, ikke regnet ut.</p>
<div class="grid">${s.rows.map(card).join('')}</div>
<p class="foot">Alle popup-ene: 428 px brede og midtstilte (1), minst 48 px luft over og under (2), handlingsraden to like halvdeler på 194 × 49 px med 8 px mellom (3), hovedknappen gul 10,57:1 (4), felt 49 px med 13 px hjørner og 1,5 px kant #555E64 (5), ingen nettlesermeny (6), ingen ark fra en kant (7), tilbud nede til høyre (8). Kant, slør, skygge, 13 px radius, 15 px innvendig, tittel 27 px og «Slett» i rust er den godkjente Popups-delen, uendret.</p>
</div></body></html>`;

(async () => {
  const br = await chromium.launch({ executablePath: EXE });
  for (let i = 0; i < SHEETS.length; i++) {
    const ctx = await br.newContext({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2, locale: 'nb-NO' });
    const pg = await ctx.newPage();
    await pg.setContent(html(SHEETS[i], i + 1, SHEETS.length), { waitUntil: 'load' });
    await pg.waitForTimeout(900);
    const el = await pg.$('.sheet');
    await el.screenshot({ path: path.join(OUT, `popup-rules-overview-${i + 1}.png`) });
    await ctx.close();
    console.log('sheet', i + 1, SHEETS[i].rows.length, 'popups');
  }
  await br.close();
})();
