// ST-1409 — the worst-case sheet (break-ui): the same nine pages with the longest
// realistic Norwegian strings, six children instead of three, and the empty lists.
const fs=require('fs');const path=require('path');const {chromium}=require('playwright');const {PNG}=require('pngjs');
const EXE='/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const ROOT=process.env.ST1410_ROOT;const S=process.env.PAPERCLIP_RUN_SCRATCH_DIR;
const FD=path.join(ROOT,'apps/frontend/src/fonts');
const b64=(f,m)=>`data:${m};base64,${fs.readFileSync(path.join(FD,f)).toString('base64')}`;
const FONTS=`
@font-face{font-family:'Bricolage Grotesque';src:url('${b64('bricolage-var.woff2','font/woff2')}') format('woff2');font-weight:200 800;font-stretch:75% 100%;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-500.ttf','font/ttf')}') format('truetype');font-weight:400 500;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-600.ttf','font/ttf')}') format('truetype');font-weight:600 800;}`;
const OUT=__dirname+'/out';
const PAGES=[['Mine oppgaver (barn)','worst-mine-oppgaver-barn'],['Belønninger (barn), tom','worst-belonninger-barn'],['Ny husstand (veiviser)','worst-ny-husstand'],['Barnas innlogging, trykket tom','worst-barnas-innlogging'],['Glemt passord, trykket tom','worst-glemt-passord'],['Sett nytt passord, to feil','worst-sett-nytt-passord']];
const CROP=1100;
const crop=(src,dst)=>{const p=PNG.sync.read(fs.readFileSync(src));const h=CROP;const o=new PNG({width:p.width,height:h});
 for(let y=0;y<h;y++)for(let x=0;x<p.width;x++){const d=(y*p.width+x)<<2;
  if(y<p.height){const si=(y*p.width+x)<<2;o.data[d]=p.data[si];o.data[d+1]=p.data[si+1];o.data[d+2]=p.data[si+2];o.data[d+3]=255;}
  else {o.data[d]=246;o.data[d+1]=246;o.data[d+2]=244;o.data[d+3]=255;}}
 fs.writeFileSync(dst,PNG.sync.write(o));return p.height;};
const img=(p)=>`data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const cards=PAGES.map(([label,n])=>{const h=crop(`${S}/worst/${n}.png`,`${OUT}/w-${n}.png`);
 return `<div class="pair"><h2>${label}</h2><div class="shot"><img src="${img(`${OUT}/w-${n}.png`)}"></div><p class="h">hele siden ${h} px</p></div>`;}).join('');
const html=`<!doctype html><html lang="nb"><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;color:#15181C}
.sheet{padding:40px 40px 44px;width:max-content}
h1{font-family:'Bricolage Grotesque';font-size:30px;font-weight:800;line-height:1.15;letter-spacing:-0.01em}
.lede{font-size:15px;font-weight:500;line-height:1.45;color:#555E64;max-width:1500px;margin:8px 0 28px}
.grid{display:grid;grid-template-columns:repeat(3,max-content);gap:30px 32px;align-items:start}
.pair h2{font-family:'Bricolage Grotesque';font-size:18px;font-weight:800;line-height:1.2;margin-bottom:7px}
.shot{width:470px;height:359px;overflow:hidden;border:1px solid #DFDFD9;border-radius:8px;background:#F6F6F4}
.shot img{width:1440px;transform:scale(0.3264);transform-origin:0 0;display:block}
.h{font-size:12px;font-weight:500;color:#555E64;margin-top:5px}
.foot{margin-top:30px;font-size:13px;font-weight:500;color:#555E64;line-height:1.55;max-width:1500px}
</style></head><body><div class="sheet">
<h1>Verste tilfelle – barne-, oppsett- og innloggingssidene</h1>
<p class="lede">Barnenavn «Jonas-Emilian Tangen-Hagerup» (28 tegn), seks oppgaver med 66 tegns titler, tom belønningsliste med 1480 poeng på kontoen, husstandsnavn på 44 tegn i veiviseren – og de tre innloggingsskjemaene <strong>trykket tomme</strong>, fordi regel 6 flytter sjekken til trykket. Samme 1440 px, samme regler.</p>
<div class="grid">${cards}</div>
<p class="foot">Ingenting renner ut vannrett: <strong>scrollWidth = 1440</strong> i alle seks. Tittelen står på 26 px / 800 på x 280 overalt, spaltene på 428 + 24 + 428 (ett 428-skjema på innloggingssidene), og feltet vokser med det det bærer. Regel 6 er det man ser best her: ingen av de tre skjemaene er blindvei – knappen er gul fra start, og trykket skriver feilen under feltet den gjelder.</p>
</div></body></html>`;
(async()=>{const br=await chromium.launch({executablePath:EXE});
 const ctx=await br.newContext({viewport:{width:1600,height:900},deviceScaleFactor:2,locale:'nb-NO'});
 const pg=await ctx.newPage();await pg.setContent(html,{waitUntil:'load'});await pg.waitForTimeout(900);
 await (await pg.$('.sheet')).screenshot({path:`${OUT}/rules-verste-tilfelle-2.png`});
 await br.close();console.log('worst-case sheet done');})();
