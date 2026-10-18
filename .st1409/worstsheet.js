// ST-1409 — the worst-case sheet (break-ui): the same nine pages with the longest
// realistic Norwegian strings, six children instead of three, and the empty lists.
const fs=require('fs');const path=require('path');const {chromium}=require('playwright');const {PNG}=require('pngjs');
const EXE='/paperclip/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const ROOT=process.env.ST1409_ROOT;const S=process.env.PAPERCLIP_RUN_SCRATCH_DIR;
const FD=path.join(ROOT,'apps/frontend/src/fonts');
const b64=(f,m)=>`data:${m};base64,${fs.readFileSync(path.join(FD,f)).toString('base64')}`;
const FONTS=`
@font-face{font-family:'Bricolage Grotesque';src:url('${b64('bricolage-var.woff2','font/woff2')}') format('woff2');font-weight:200 800;font-stretch:75% 100%;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-500.ttf','font/ttf')}') format('truetype');font-weight:400 500;}
@font-face{font-family:'Hanken Grotesk';src:url('${b64('hanken-600.ttf','font/ttf')}') format('truetype');font-weight:600 800;}`;
const OUT=__dirname+'/out';
const PAGES=[['Hjemme','home'],['Oppgaver','tasks'],['Familie','family'],['Belønninger','rewards'],['Innstillinger','settings'],['Fremgang','progress'],['Husholdninger','households'],['Husholdningsinnstillinger','household-settings'],['Invitasjoner','invitations']];
const CROP=1100;
const crop=(src,dst)=>{const p=PNG.sync.read(fs.readFileSync(src));const h=CROP;const o=new PNG({width:p.width,height:h});
 for(let y=0;y<h;y++)for(let x=0;x<p.width;x++){const d=(y*p.width+x)<<2;
  if(y<p.height){const si=(y*p.width+x)<<2;o.data[d]=p.data[si];o.data[d+1]=p.data[si+1];o.data[d+2]=p.data[si+2];o.data[d+3]=255;}
  else {o.data[d]=246;o.data[d+1]=246;o.data[d+2]=244;o.data[d+3]=255;}}
 fs.writeFileSync(dst,PNG.sync.write(o));return p.height;};
const img=(p)=>`data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const cards=PAGES.map(([label,n])=>{const h=crop(`${S}/worst2/${n}-1440.png`,`${OUT}/w-${n}.png`);
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
<h1>Verste tilfelle – de samme ni sidene</h1>
<p class="lede">Husstandsnavn «Familien Tangen-Hagerup Mikkelsborg» (35 tegn), seks barn i stedet for tre, oppgavetitler på 62 tegn, tre husstander i lista, og tomme lister der sidene har en tom tilstand. Samme 1440 px, samme regler.</p>
<div class="grid">${cards}</div>
<p class="foot">Ingenting renner ut vannrett: <strong>scrollWidth = 1440</strong> på alle ni. Feltet vokser med det det bærer – tittelen brekker til tre linjer på Hjemme, og feltet blir stående på 259 px fordi barnekortene fortsatt er det laveste i det. Fire barnekort og en «+2 barn til»-flis, som veilederen sier. Lange oppgavetitler brekker til to linjer i en høyere rad.</p>
</div></body></html>`;
(async()=>{const br=await chromium.launch({executablePath:EXE});
 const ctx=await br.newContext({viewport:{width:1600,height:900},deviceScaleFactor:2,locale:'nb-NO'});
 const pg=await ctx.newPage();await pg.setContent(html,{waitUntil:'load'});await pg.waitForTimeout(900);
 await (await pg.$('.sheet')).screenshot({path:`${OUT}/rules-verste-tilfelle.png`});
 await br.close();console.log('worst-case sheet done');})();
