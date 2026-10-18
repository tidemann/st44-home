// ST-1409 — the overview sheet: each page small, today on the left, with the rules on
// the right, the page name above. Built on the app's own fonts (ST-879's inline trick).
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright');
const EXE='/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const ROOT=process.env.ST1410_ROOT;
const FD=path.join(ROOT,'apps/frontend/src/fonts');
const b64=(f,m)=>`data:${m};base64,${fs.readFileSync(path.join(FD,f)).toString('base64')}`;
const FONTS=`
@font-face{font-family:'Bricolage Grotesque';src:url('${b64('bricolage-var.woff2','font/woff2')}') format('woff2');font-weight:200 800;font-stretch:75% 100%;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-500.ttf','font/ttf')}') format('truetype');font-weight:400 500;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-600.ttf','font/ttf')}') format('truetype');font-weight:600 800;}`;
const OUT=__dirname+'/out';
const rows=JSON.parse(fs.readFileSync(OUT+'/rows.json','utf8'));
const img=(p)=>`data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;

const GROUPS=[rows.slice(0,5),rows.slice(5)];

const card=(r)=>`
  <div class="pair">
    <h2>${r.label}</h2>
    <div class="two">
      <figure><figcaption>I dag</figcaption>
        <div class="shot"><img src="${img(`${OUT}/t-today-${r.slug}.png`)}"></div>
        <p class="h">hele siden ${r.todayH} px</p></figure>
      <figure><figcaption>Med reglene</figcaption>
        <div class="shot"><img src="${img(`${OUT}/t-rules-${r.slug}.png`)}"></div>
        <p class="h">hele siden ${r.rulesH} px</p></figure>
    </div>
  </div>`;

const html=(group,n,total)=>`<!doctype html><html lang="nb"><head><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;color:#15181C}
.sheet{padding:40px 40px 44px;width:max-content}
h1{font-family:'Bricolage Grotesque';font-size:30px;font-weight:800;line-height:1.15;letter-spacing:-0.01em}
.lede{font-size:15px;font-weight:500;line-height:1.45;color:#555E64;max-width:1180px;margin:8px 0 28px}
.grid{display:grid;grid-template-columns:repeat(2,max-content);gap:34px 40px;align-items:start}
.pair h2{font-family:'Bricolage Grotesque';font-size:19px;font-weight:800;line-height:1.2;margin-bottom:8px}
.two{display:grid;grid-template-columns:max-content max-content;gap:14px}
figcaption{font-size:13px;font-weight:600;color:#555E64;margin-bottom:5px}
.shot{width:470px;height:359px;overflow:hidden;border:1px solid #DFDFD9;border-radius:8px;background:#F6F6F4}
.shot img{width:1440px;transform:scale(0.3264);transform-origin:0 0;display:block}
.h{font-size:12px;font-weight:500;color:#555E64;margin-top:5px}
.foot{margin-top:30px;font-size:13px;font-weight:500;color:#555E64;line-height:1.5;max-width:1180px}
</style></head><body><div class="sheet">
<h1>Diddit på skjerm – de 8 sidereglene, tegnet – barne-, oppsett- og innloggingssidene (${n} av ${total})</h1>
<p class="lede">Venstre: siden i dag, den samme siden på 51f41dc <strong>uten</strong> reglene, tegnet i samme kjøring. Høyre: den samme siden med de 8 reglene fra ST-1370 og ingenting annet. 1440 px, lys modus, samme familie. Utsnittet er de øverste 1100 px av hver side; høyden på hele siden står under hvert bilde.</p>
<div class="grid">${group.map(card).join('')}</div>
<p class="foot">Sju av de ni sidene: 880 px innhold på x 280–1160, tittel 26 px / 800 i det gule feltet, felt <strong>191</strong> når feltet bare bærer tittel og underlinje (270 på Mine oppgaver og 282 på Belønninger, som bærer poengtallet i feltet), spalter 428 + 24 + 428 der siden har grupper. «Logg inn» og «Opprett konto» beholder sitt 34 px-tittel og sitt gule panel (regel 3); på dem er det reglene 5–8 som gjelder, og de holdt allerede.</p>
</div></body></html>`;

(async()=>{
  const br=await chromium.launch({executablePath:EXE});
  for(let i=0;i<GROUPS.length;i++){
    const ctx=await br.newContext({viewport:{width:1300,height:900},deviceScaleFactor:2,locale:'nb-NO'});
    const pg=await ctx.newPage();
    await pg.setContent(html(GROUPS[i],i+1,GROUPS.length),{waitUntil:'load'});
    await pg.waitForTimeout(900);
    const el=await pg.$('.sheet');
    await el.screenshot({path:`${OUT}/rules-overview-${i+1}.png`});
    await ctx.close();
    console.log('sheet',i+1,GROUPS[i].length,'pages');
  }
  await br.close();
})();
